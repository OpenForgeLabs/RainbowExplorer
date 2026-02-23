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

type CatalogPlugin = {
  id: string;
  name: string;
  image: string;
  internalPort?: number;
  description?: string;
  tags?: string[];
};

type RunnerResponse<T> = {
  ok: boolean;
  message?: string;
  data?: T;
};

type PluginRunnerPanelProps = {
  plugins: PluginRegistryEntry[];
};

const runnerUrl =
  process.env.NEXT_PUBLIC_PLUGIN_RUNNER_URL ?? "http://localhost:5099";

export function PluginRunnerPanel({ plugins }: PluginRunnerPanelProps) {
  const [catalog, setCatalog] = useState<CatalogPlugin[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [form, setForm] = useState({
    id: "",
    name: "",
    image: "",
  });
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

  const callRunner = async <T,>(path: string, body?: unknown) => {
    const response = await fetch(`${runnerUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return (await response.json()) as RunnerResponse<T>;
  };

  const handleInstall = async (payload: CatalogPlugin) => {
    setBusyId(payload.id);
    setIsInstalling(true);
    setStatus(null);
    try {
      const response = await callRunner("/plugins/install", {
        id: payload.id,
        name: payload.name,
        image: payload.image,
      });
      if (!response.ok) {
        setStatus(response.message ?? "Failed to install plugin.");
        return;
      }
      setStatus("Plugin installed. Refresh to load it.");
    } catch {
      setStatus("Runner is not reachable.");
    } finally {
      setIsInstalling(false);
      setBusyId(null);
    }
  };

  const handleUpdate = async (plugin: PluginRegistryEntry) => {
    const image = (plugin as Record<string, unknown>).image;
    if (typeof image !== "string" || !image) {
      setStatus("No image recorded for this plugin. Reinstall from image.");
      return;
    }
    setBusyId(plugin.id);
    setStatus(null);
    try {
      const response = await callRunner("/plugins/install", {
        id: plugin.id,
        name: plugin.name,
        image,
      });
      if (!response.ok) {
        setStatus(response.message ?? "Failed to update plugin.");
        return;
      }
      setStatus("Plugin updated. Refresh to load changes.");
    } catch {
      setStatus("Runner is not reachable.");
    } finally {
      setBusyId(null);
    }
  };

  const handleStart = async (plugin: PluginRegistryEntry) => {
    setBusyId(plugin.id);
    setStatus(null);
    try {
      const response = await callRunner("/plugins/start", { id: plugin.id });
      if (!response.ok) {
        setStatus(response.message ?? "Failed to start plugin.");
        return;
      }
      setStatus("Plugin started. Refresh to update baseUrl.");
    } catch {
      setStatus("Runner is not reachable.");
    } finally {
      setBusyId(null);
    }
  };

  const handleStop = async (pluginId: string) => {
    setBusyId(pluginId);
    setStatus(null);
    try {
      const response = await callRunner("/plugins/stop", { id: pluginId });
      if (!response.ok) {
        setStatus(response.message ?? "Failed to stop plugin.");
        return;
      }
      setStatus("Plugin stopped.");
    } catch {
      setStatus("Runner is not reachable.");
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (pluginId: string) => {
    setBusyId(pluginId);
    setStatus(null);
    try {
      const response = await callRunner("/plugins/remove", { id: pluginId });
      if (!response.ok) {
        setStatus(response.message ?? "Failed to remove plugin.");
        return;
      }
      setStatus("Plugin removed. Refresh to unload it.");
    } catch {
      setStatus("Runner is not reachable.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="bg-surface">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Plugin Runner
          </h2>
          <p className="text-sm text-subtle">
            Instala plugins desde imágenes Docker y el runner asigna un puerto
            libre automáticamente.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <FormField label="Plugin ID">
            <Input
              className="h-9"
              value={form.id}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, id: event.target.value }))
              }
              placeholder="redis"
            />
          </FormField>
          <FormField label="Name">
            <Input
              className="h-9"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Redis Plugin"
            />
          </FormField>
          <FormField label="Image">
            <Input
              className="h-9"
              value={form.image}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, image: event.target.value }))
              }
              placeholder="ghcr.io/your-org/rainbow-plugin-redis:latest"
            />
          </FormField>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="solid" tone="primary"
            onClick={() =>
              handleInstall({
                id: form.id,
                name: form.name || form.id,
                image: form.image,
              })
            }
            disabled={!form.id || !form.image || isInstalling}
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
                  className="rounded-xl border border-border bg-surface-2 p-4"
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
                    variant={installedIds.has(item.id) ? "secondary" : "primary"}
                    onClick={() => handleInstall(item)}
                    disabled={busyId === item.id}
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
                className="rounded-xl border border-border bg-surface-2 p-4"
              >
                <div className="text-sm font-semibold text-foreground">
                  {plugin.name}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-subtle">
                  {plugin.id}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="solid" tone="accent"
                    onClick={() => handleStart(plugin)}
                    disabled={busyId === plugin.id}
                  >
                    Start
                  </Button>
                  <Button
                    variant="solid" tone="primary"
                    onClick={() => handleUpdate(plugin)}
                    disabled={busyId === plugin.id}
                  >
                    Update
                  </Button>
                  <Button
                    variant="outline" tone="neutral"
                    onClick={() => handleStop(plugin.id)}
                    disabled={busyId === plugin.id}
                  >
                    Stop
                  </Button>
                  <Button
                    variant="ghost" tone="neutral"
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
