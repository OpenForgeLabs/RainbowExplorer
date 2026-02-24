"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  FormField,
  InlineSpinner,
  Input,
} from "@openforgelabs/rainbow-ui";
import type { PluginRegistryEntry } from "@/lib/pluginRegistry";
import { useGlobalLoader } from "@/lib/globalLoader";

type CatalogPlugin = {
  id: string;
  name: string;
  image: string;
  description?: string;
  tags?: string[];
};

type RunnerResponse<T> = {
  ok: boolean;
  message?: string;
  data?: T;
};

type InstallJob = {
  id: string;
  type: "install";
  status: "queued" | "running" | "succeeded" | "failed";
  createdAt: string;
  updatedAt: string;
  result?: { id?: string } | null;
  error?: string | null;
};

type PluginRunnerPanelProps = {
  plugins: PluginRegistryEntry[];
};

const runnerUrl =
  process.env.NEXT_PUBLIC_PLUGIN_RUNNER_URL ?? "http://localhost:5099";

export function PluginRunnerPanel({ plugins }: PluginRunnerPanelProps) {
  const { withLoader } = useGlobalLoader();
  const [catalog, setCatalog] = useState<CatalogPlugin[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [image, setImage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  const installedIds = useMemo(
    () => new Set(plugins.map((plugin) => plugin.id)),
    [plugins],
  );

  useEffect(() => {
    const catalogUrl = process.env.NEXT_PUBLIC_PLUGIN_CATALOG_URL;
    if (!catalogUrl) {
      return;
    }
    setIsLoadingCatalog(true);
    fetch(catalogUrl)
      .then((response) => response.json())
      .then((data) => setCatalog(data.plugins ?? []))
      .catch(() => setCatalog([]))
      .finally(() => setIsLoadingCatalog(false));
  }, []);

  const logActivity = async (
    action: string,
    statusValue: "success" | "error" | "info",
    message: string,
    metadata?: Record<string, unknown>,
  ) => {
    try {
      await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "log",
          event: {
            category: "plugins",
            action,
            status: statusValue,
            message,
            metadata,
          },
        }),
      });
    } catch {
      // no-op
    }
  };

  const callRunner = async <T,>(
    path: string,
    body?: unknown,
    method: "POST" | "GET" = "POST",
  ) => {
    const response = await fetch(`${runnerUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return (await response.json()) as RunnerResponse<T>;
  };

  const pollInstallJob = async (jobId: string) => {
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      const response = await callRunner<InstallJob>(
        `/jobs/${encodeURIComponent(jobId)}`,
        undefined,
        "GET",
      );

      if (!response.ok || !response.data) {
        return { ok: false, message: response.message ?? "Failed to track install job." };
      }

      const job = response.data;
      if (job.status === "succeeded") {
        return {
          ok: true,
          message: "Plugin installed from image. Refresh to load it.",
          pluginId: job.result?.id,
        };
      }
      if (job.status === "failed") {
        return {
          ok: false,
          message: job.error ?? "Plugin installation failed.",
        };
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    return { ok: false, message: "Install is still running. Check status in a moment." };
  };

  const handleInstall = async (payload: { image: string }) => {
    setBusyId(payload.image);
    setIsInstalling(true);
    setStatus(null);
    try {
      const response = await callRunner<{ jobId?: string; status?: string }>(
        "/plugins/install",
        {
          image: payload.image,
        },
      );
      if (!response.ok) {
        const message = response.message ?? "Failed to install plugin.";
        setStatus(message);
        await logActivity("install", "error", message, { image: payload.image });
        return;
      }

      const jobId = response.data?.jobId;
      if (!jobId) {
        const message = "Runner accepted install but did not return a job id.";
        setStatus(message);
        await logActivity("install", "error", message, { image: payload.image });
        return;
      }

      setStatus("Install queued. Waiting for plugin to become available...");
      const final = await pollInstallJob(jobId);
      setStatus(final.message);
      if (final.ok) {
        await logActivity("install", "success", final.message, {
          image: payload.image,
          pluginId: final.pluginId,
          jobId,
        });
        setImage("");
      } else {
        await logActivity("install", "error", final.message, {
          image: payload.image,
          jobId,
        });
      }
    } catch {
      const message = "Runner is not reachable.";
      setStatus(message);
      await logActivity("install", "error", message, { image: payload.image });
    } finally {
      setIsInstalling(false);
      setBusyId(null);
    }
  };

  const handleUpdate = async (plugin: PluginRegistryEntry) => {
    const pluginImage = (plugin as Record<string, unknown>).image;
    if (typeof pluginImage !== "string" || !pluginImage) {
      const message = "No image recorded for this plugin. Reinstall from image.";
      setStatus(message);
      await logActivity("update", "error", message, { pluginId: plugin.id });
      return;
    }

    setBusyId(plugin.id);
    setStatus(null);
    try {
      const response = await callRunner<{ jobId?: string }>(
        "/plugins/install",
        { image: pluginImage },
      );
      if (!response.ok) {
        const message = response.message ?? "Failed to update plugin.";
        setStatus(message);
        await logActivity("update", "error", message, { pluginId: plugin.id });
        return;
      }

      const jobId = response.data?.jobId;
      if (!jobId) {
        const message = "Runner accepted update but did not return a job id.";
        setStatus(message);
        await logActivity("update", "error", message, { pluginId: plugin.id });
        return;
      }

      setStatus("Update queued. Waiting for plugin to become available...");
      const final = await pollInstallJob(jobId);
      setStatus(final.message);
      if (final.ok) {
        await logActivity("update", "success", final.message, { pluginId: plugin.id, jobId });
      } else {
        await logActivity("update", "error", final.message, { pluginId: plugin.id, jobId });
      }
    } catch {
      const message = "Runner is not reachable.";
      setStatus(message);
      await logActivity("update", "error", message, { pluginId: plugin.id });
    } finally {
      setBusyId(null);
    }
  };

  const handleStart = async (plugin: PluginRegistryEntry) => {
    setBusyId(plugin.id);
    setStatus(null);
    try {
      const response = await withLoader(
        async () => callRunner("/plugins/start", { id: plugin.id }),
        "Starting plugin...",
      );
      if (!response.ok) {
        const message = response.message ?? "Failed to start plugin.";
        setStatus(message);
        await logActivity("start", "error", message, { pluginId: plugin.id });
        return;
      }
      const message = "Plugin started. Refresh to update baseUrl.";
      setStatus(message);
      await logActivity("start", "success", message, { pluginId: plugin.id });
    } catch {
      const message = "Runner is not reachable.";
      setStatus(message);
      await logActivity("start", "error", message, { pluginId: plugin.id });
    } finally {
      setBusyId(null);
    }
  };

  const handleStop = async (pluginId: string) => {
    setBusyId(pluginId);
    setStatus(null);
    try {
      const response = await withLoader(
        async () => callRunner("/plugins/stop", { id: pluginId }),
        "Stopping plugin...",
      );
      if (!response.ok) {
        const message = response.message ?? "Failed to stop plugin.";
        setStatus(message);
        await logActivity("stop", "error", message, { pluginId });
        return;
      }
      const message = "Plugin stopped.";
      setStatus(message);
      await logActivity("stop", "success", message, { pluginId });
    } catch {
      const message = "Runner is not reachable.";
      setStatus(message);
      await logActivity("stop", "error", message, { pluginId });
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (pluginId: string) => {
    setBusyId(pluginId);
    setStatus(null);
    try {
      const response = await withLoader(
        async () => callRunner("/plugins/remove", { id: pluginId }),
        "Removing plugin...",
      );
      if (!response.ok) {
        const message = response.message ?? "Failed to remove plugin.";
        setStatus(message);
        await logActivity("remove", "error", message, { pluginId });
        return;
      }
      const message = "Plugin removed. Refresh to unload it.";
      setStatus(message);
      await logActivity("remove", "success", message, { pluginId });
    } catch {
      const message = "Runner is not reachable.";
      setStatus(message);
      await logActivity("remove", "error", message, { pluginId });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Plugin Runner
          </h2>
          <p className="text-sm text-subtle">
            Add a plugin by Docker image. Metadata is discovered from the plugin manifest.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <FormField label="Docker image">
            <Input
              className="h-10"
              value={image}
              onChange={(event) => setImage(event.target.value)}
              placeholder="ghcr.io/openforgelabs/rainbow-plugin-redis:latest"
            />
          </FormField>
          <div className="flex items-end">
            <Button
              variant="solid"
              tone="primary"
              onClick={() => handleInstall({ image })}
              disabled={!image.trim() || isInstalling}
            >
              {isInstalling ? (
                <span className="inline-flex items-center gap-2">
                  <InlineSpinner className="h-4 w-4" />
                  Installing
                </span>
              ) : (
                "Install from image"
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" tone="neutral" onClick={() => window.location.reload()}>
            Refresh registry
          </Button>
          {status ? <span className="text-xs text-subtle">{status}</span> : null}
        </div>

        <div className="flex flex-col gap-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-subtle">
            Catalog
          </div>
          {isLoadingCatalog ? (
            <div className="text-sm text-subtle">Loading catalog...</div>
          ) : catalog.length === 0 ? (
            <div className="text-sm text-subtle">
              No catalog configured. Set NEXT_PUBLIC_PLUGIN_CATALOG_URL to show
              available plugins.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border-strong/60 bg-surface-2 p-4"
                >
                  <div className="text-sm font-semibold text-foreground">
                    {item.name}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.2em] text-subtle">
                    {item.id}
                  </div>
                  {item.description ? (
                    <div className="mt-3 text-xs text-subtle">
                      {item.description}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(item.tags ?? []).map((tag) => (
                      <Badge key={tag} variant="accent">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    className="mt-4"
                    variant={installedIds.has(item.id) ? "outline" : "solid"}
                    tone={installedIds.has(item.id) ? "neutral" : "primary"}
                    onClick={() => handleInstall({ image: item.image })}
                    disabled={busyId === item.image}
                  >
                    {installedIds.has(item.id) ? "Reinstall" : "Install"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-subtle">
            Runner actions
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plugins.map((plugin) => (
              <div
                key={plugin.id}
                className="rounded-xl border border-border-strong/60 bg-surface-2 p-4"
              >
                <div className="text-sm font-semibold text-foreground">
                  {plugin.name}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-subtle">
                  {plugin.id}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="solid"
                    tone="accent"
                    onClick={() => handleStart(plugin)}
                    disabled={busyId === plugin.id}
                  >
                    Start
                  </Button>
                  <Button
                    variant="solid"
                    tone="primary"
                    onClick={() => handleUpdate(plugin)}
                    disabled={busyId === plugin.id}
                  >
                    Update
                  </Button>
                  <Button
                    variant="outline"
                    tone="neutral"
                    onClick={() => handleStop(plugin.id)}
                    disabled={busyId === plugin.id}
                  >
                    Stop
                  </Button>
                  <Button
                    variant="ghost"
                    tone="neutral"
                    onClick={() => handleRemove(plugin.id)}
                    disabled={busyId === plugin.id}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
