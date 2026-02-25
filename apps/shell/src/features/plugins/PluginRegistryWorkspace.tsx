"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  InlineSpinner,
  Input,
  Modal,
  SearchInput,
  Switch,
} from "@openforgelabs/rainbow-ui";
import type { PluginManifest } from "@openforgelabs/rainbow-contracts";
import type { PluginRegistryEntry } from "@/lib/pluginRegistry";
import { useGlobalLoader } from "@/lib/globalLoader";

type PluginWithManifest = {
  plugin: PluginRegistryEntry;
  manifest: PluginManifest | null;
};

type PluginContainerStatus = {
  id: string;
  exists: boolean;
  running: boolean;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number;
  health?: string;
  metadata?: PluginRegistryEntry;
};

type PluginLogsResponse = {
  id: string;
  lines: string[];
  message?: string;
};

type RunnerApiResponse<T> = {
  ok: boolean;
  message?: string;
  data?: T;
};

type InstallJobData = {
  id: string;
  type: "install";
  status: "queued" | "running" | "succeeded" | "failed";
  phase?: string;
  progress?: number;
  message?: string;
  payload?: { image?: string; pluginId?: string };
  createdAt: string;
  updatedAt: string;
  result?: { id?: string; name?: string } | null;
  error?: string | null;
};

type PendingInstallCard = {
  localId: string;
  jobId: string;
  image: string;
  status: "queued" | "running" | "succeeded" | "failed";
  phase?: string;
  progress?: number;
  message?: string;
  pluginId?: string;
  error?: string;
  showError?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type PluginRegistryWorkspaceProps = {
  initialItems: PluginWithManifest[];
};

const statusTone = (status?: PluginContainerStatus) => {
  if (!status || !status.exists) return { label: "Not installed", className: "bg-surface-2 text-subtle border-border" };
  if (status.running) return { label: "Running", className: "bg-success text-success-foreground border-transparent" };
  if (status.status === "restarting") return { label: "Restarting", className: "bg-warning text-warning-foreground border-transparent" };
  return { label: "Stopped", className: "bg-surface-3 text-foreground border-border" };
};

const elapsedFrom = (iso?: string) => {
  if (!iso) return "-";
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "-";
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const clampProgress = (value?: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value ?? 0)));
};

const fallbackInstallMessage = (status: PendingInstallCard["status"]) => {
  if (status === "queued") return "Queued for installation...";
  if (status === "running") return "Installing plugin...";
  if (status === "succeeded") return "Installed successfully.";
  return "Installation failed.";
};

const installPollIntervalMsFromEnv = Number(
  process.env.NEXT_PUBLIC_INSTALL_JOB_POLL_INTERVAL_MS ?? 5000,
);
const INSTALL_POLL_INTERVAL_MS =
  Number.isFinite(installPollIntervalMsFromEnv) && installPollIntervalMsFromEnv >= 5000
    ? installPollIntervalMsFromEnv
    : 5000;
const statusPollIntervalMsFromEnv = Number(
  process.env.NEXT_PUBLIC_PLUGIN_STATUS_POLL_INTERVAL_MS ?? 5000,
);
const STATUS_POLL_INTERVAL_MS =
  Number.isFinite(statusPollIntervalMsFromEnv) && statusPollIntervalMsFromEnv >= 5000
    ? statusPollIntervalMsFromEnv
    : 5000;
const INSTALL_SUCCESS_ANIMATION_MS = Number(
  process.env.NEXT_PUBLIC_INSTALL_SUCCESS_ANIMATION_MS ?? 1800,
);

export function PluginRegistryWorkspace({ initialItems }: PluginRegistryWorkspaceProps) {
  const completionTimerRef = useRef<number | null>(null);
  const lastStatusPollAtRef = useRef(0);
  const [items, setItems] = useState(initialItems);
  const [pendingInstalls, setPendingInstalls] = useState<PendingInstallCard[]>([]);
  const [pendingReady, setPendingReady] = useState(false);
  const [selectedPluginId, setSelectedPluginId] = useState("");
  const [query, setQuery] = useState("");
  const [statusById, setStatusById] = useState<Record<string, PluginContainerStatus>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [logsQuery, setLogsQuery] = useState("");
  const [liveTail, setLiveTail] = useState(true);
  const [tab, setTab] = useState<"overview" | "logs">("overview");
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { withLoader } = useGlobalLoader();

  const [installOpen, setInstallOpen] = useState(false);
  const [installImage, setInstallImage] = useState("");
  const [installBusy, setInstallBusy] = useState(false);
  const closeInstallModal = useCallback(() => setInstallOpen(false), []);

  const selected = useMemo(
    () => items.find((item) => item.plugin.id === selectedPluginId) ?? null,
    [items, selectedPluginId],
  );

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => {
      const status = statusById[item.plugin.id];
      const hay = [
        item.plugin.id,
        item.plugin.name,
        item.plugin.description ?? "",
        item.plugin.image ?? "",
        status?.status ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(normalized);
    });
  }, [items, query, statusById]);

  const visiblePendingInstalls = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return pendingInstalls;
    return pendingInstalls.filter((entry) =>
      [entry.image, entry.pluginId ?? "", entry.status].join(" ").toLowerCase().includes(normalized),
    );
  }, [pendingInstalls, query]);

  const activeInstallPollingKey = useMemo(
    () =>
      pendingInstalls
        .filter((entry) => entry.status === "queued" || entry.status === "running")
        .map((entry) => `${entry.localId}:${entry.jobId}:${entry.status}`)
        .join("|"),
    [pendingInstalls],
  );

  const logLines = useMemo(() => {
    const normalized = logsQuery.trim().toLowerCase();
    if (!normalized) return logs;
    return logs.filter((line) => line.toLowerCase().includes(normalized));
  }, [logs, logsQuery]);

  const loadStatus = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastStatusPollAtRef.current < STATUS_POLL_INTERVAL_MS) {
      return;
    }
    lastStatusPollAtRef.current = now;
    const ids = items.map((item) => item.plugin.id).join(",");
    if (!ids) return;
    const response = await fetch(`/api/runner/status?ids=${encodeURIComponent(ids)}`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as RunnerApiResponse<{ items: PluginContainerStatus[] }>;
    if (!response.ok || !payload.ok || !payload.data) {
      return;
    }

    const next: Record<string, PluginContainerStatus> = {};
    for (const item of payload.data.items) {
      next[item.id] = item;
    }
    setStatusById(next);
  };

  const loadLogs = async (pluginId: string) => {
    if (!pluginId) {
      setLogs([]);
      return;
    }
    const response = await fetch(`/api/runner/logs?id=${encodeURIComponent(pluginId)}&tail=300`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as RunnerApiResponse<PluginLogsResponse>;
    if (!response.ok || !payload.ok || !payload.data) {
      setLogs([]);
      return;
    }
    setLogs(payload.data.lines ?? []);
  };

  useEffect(() => {
    void loadStatus(true);
    const timer = window.setInterval(() => {
      void loadStatus(false);
    }, STATUS_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [items]);

  useEffect(() => {
    if (!selectedPluginId || tab !== "logs") return;
    void loadLogs(selectedPluginId);
    if (!liveTail) return;
    const timer = window.setInterval(() => {
      void loadLogs(selectedPluginId);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [selectedPluginId, tab, liveTail]);

  useEffect(() => {
    let active = true;
    const boot = async () => {
      try {
        const entries = await loadPendingInstallsFromStore();
        if (!active) return;
        setPendingInstalls(entries);
      } finally {
        if (active) {
          setPendingReady(true);
        }
      }
    };
    void boot();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!pendingReady) return;
    const timer = window.setTimeout(() => {
      void savePendingInstallsToStore(pendingInstalls);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [pendingInstalls, pendingReady]);

  useEffect(() => {
    return () => {
      if (completionTimerRef.current) {
        window.clearTimeout(completionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!pendingReady || completionTimerRef.current) {
      return;
    }
    const hasSucceeded = pendingInstalls.some((entry) => entry.status === "succeeded");
    if (!hasSucceeded) {
      return;
    }

    setStatusMessage("Plugin installed. Finalizing setup...");
    completionTimerRef.current = window.setTimeout(() => {
      completionTimerRef.current = null;
      void (async () => {
        const persisted = await loadPendingInstallsFromStore();
        const remaining = persisted.filter((entry) => entry.status !== "succeeded");
        await savePendingInstallsToStore(remaining);
        setPendingInstalls(remaining);
        try {
          await withLoader(
            async () => {
              await refreshRegistryItems();
              await loadStatus(true);
            },
            "Refreshing plugins...",
          );
          setStatusMessage("Plugin installed and loaded.");
        } catch {
          window.location.reload();
        }
      })();
    }, INSTALL_SUCCESS_ANIMATION_MS);
  }, [pendingInstalls, pendingReady, withLoader, loadStatus]);

  useEffect(() => {
    if (!pendingReady) {
      return;
    }
    const active = pendingInstalls.filter(
      (entry) => entry.status === "queued" || entry.status === "running",
    );
    if (!active.length) {
      return;
    }

    let cancelled = false;
    const tick = async () => {
      const updates = await Promise.all(
        active.map(async (entry) => ({
          entry,
          result: await pollInstallJob(entry.jobId),
        })),
      );

      if (cancelled) return;

      setPendingInstalls((previous) => {
        const next: PendingInstallCard[] = [];
        for (const entry of previous) {
          const update = updates.find((item) => item.entry.localId === entry.localId);
          if (!update) {
            next.push(entry);
            continue;
          }

          const { result } = update;
          if (!result.ok || !result.data) {
            next.push({
              ...entry,
              status: "failed",
              progress: 100,
              phase: "failed",
              message: "Failed to retrieve install job status.",
              error: result.message ?? "Failed to poll install job status.",
              showError: true,
            });
            continue;
          }

          const job = result.data;
          const pluginId = job.result?.id ?? job.payload?.pluginId ?? entry.pluginId;
          next.push({
            ...entry,
            status: job.status,
            phase: job.phase ?? entry.phase,
            progress:
              typeof job.progress === "number"
                ? clampProgress(job.progress)
                : job.status === "failed"
                  ? 100
                  : entry.progress,
            message: job.message ?? entry.message,
            pluginId,
            error: job.error ?? undefined,
            showError: job.status === "failed" ? entry.showError ?? true : entry.showError,
          });
        }
        return next;
      });
    };

    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, INSTALL_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pendingReady, activeInstallPollingKey]);

  const setEnabled = async (pluginId: string, enabled: boolean) => {
    await withLoader(
      async () =>
        fetch("/api/plugins/registry/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pluginId, enabled }),
        }),
      "Updating plugin availability...",
    );
    setItems((prev) =>
      prev.map((item) =>
        item.plugin.id === pluginId
          ? { ...item, plugin: { ...item.plugin, enabled } }
          : item,
      ),
    );
  };

  const callRunnerAction = async (action: "start" | "stop" | "remove" | "install", body: Record<string, unknown>) => {
    const response = await fetch(`/api/runner/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await response.json()) as RunnerApiResponse<unknown>;
  };

  const fetchManifest = async (pluginId: string): Promise<PluginManifest | null> => {
    try {
      const response = await fetch(
        `/api/plugins/${encodeURIComponent(pluginId)}/proxy/api/plugin-manifest`,
        {
          cache: "no-store",
        },
      );
      if (!response.ok) {
        return null;
      }
      return (await response.json()) as PluginManifest;
    } catch {
      return null;
    }
  };

  const refreshRegistryItems = async () => {
    const response = await fetch("/api/plugins/registry", { cache: "no-store" });
    const payload = (await response.json()) as RunnerApiResponse<{ plugins: PluginRegistryEntry[] }>;
    if (!response.ok || !payload?.data?.plugins) {
      return false;
    }
    const nextItems = await Promise.all(
      payload.data.plugins.map(async (plugin) => ({
        plugin,
        manifest: await fetchManifest(plugin.id),
      })),
    );
    setItems(nextItems);
    return true;
  };

  const handleRefresh = async () => {
    try {
      await withLoader(
        async () => {
          await refreshRegistryItems();
          await loadStatus(true);
        },
        "Refreshing plugins...",
      );
      setStatusMessage("Plugins refreshed.");
    } catch {
      setStatusMessage("Failed to refresh plugins.");
    }
  };

  const pollInstallJob = async (jobId: string) => {
    const response = await fetch(`/api/runner/jobs/${encodeURIComponent(jobId)}`, {
      cache: "no-store",
    });
    return (await response.json()) as RunnerApiResponse<InstallJobData>;
  };

  const loadPendingInstallsFromStore = async () => {
    const response = await fetch("/api/runner/pending-installs", { cache: "no-store" });
    const payload = (await response.json()) as RunnerApiResponse<{
      entries?: PendingInstallCard[];
    }>;
    if (!response.ok || !payload.ok || !payload.data?.entries) {
      return [];
    }
    return payload.data.entries;
  };

  const savePendingInstallsToStore = async (entries: PendingInstallCard[]) => {
    await fetch("/api/runner/pending-installs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
  };

  const enqueueInstallFromImage = async (image: string) => {
    const payload = await callRunnerAction("install", { image });
    if (!payload.ok || !payload.data) {
      throw new Error(payload.message ?? "Failed to queue plugin install.");
    }
    const data = payload.data as {
      jobId?: string;
      status?: "queued" | "running" | "succeeded" | "failed";
      phase?: string;
      progress?: number;
      message?: string;
    };
    if (!data.jobId) {
      throw new Error("Runner accepted install but did not return job id.");
    }
    const jobId = data.jobId;
    const localId = `${jobId}-${Date.now()}`;
    const now = new Date().toISOString();
    setPendingInstalls((prev) => [
      {
        localId,
        jobId,
        image,
        status: data.status ?? "queued",
        phase: data.phase,
        progress: typeof data.progress === "number" ? clampProgress(data.progress) : 0,
        message: data.message,
        createdAt: now,
        updatedAt: now,
      },
      ...prev,
    ]);
    return jobId;
  };

  const toggleInstallError = (localId: string) => {
    setPendingInstalls((prev) =>
      prev.map((entry) =>
        entry.localId === localId
          ? { ...entry, showError: !entry.showError }
          : entry,
      ),
    );
  };

  const dismissInstallCard = (localId: string) => {
    setPendingInstalls((prev) => prev.filter((entry) => entry.localId !== localId));
  };

  const retryInstallCard = async (localId: string) => {
    const card = pendingInstalls.find((entry) => entry.localId === localId);
    if (!card) {
      return;
    }
    setPendingInstalls((prev) => prev.filter((entry) => entry.localId !== localId));
    try {
      await enqueueInstallFromImage(card.image);
      setStatusMessage("Install retried.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to retry install.");
    }
  };

  const removeInstallCardPlugin = async (localId: string) => {
    const card = pendingInstalls.find((entry) => entry.localId === localId);
    if (!card?.pluginId) {
      return;
    }
    try {
      const payload = await callRunnerAction("remove", { id: card.pluginId });
      if (!payload.ok) {
        throw new Error(payload.message ?? "Failed to remove plugin container.");
      }
      setPendingInstalls((prev) => prev.filter((entry) => entry.localId !== localId));
      await refreshRegistryItems();
      await loadStatus(true);
      setStatusMessage("Failed install artifacts removed.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to remove plugin.");
    }
  };

  const handleStart = async () => {
    if (!selected) return;
    setIsBusy(true);
    setStatusMessage(null);
    try {
      await withLoader(async () => {
        const payload = await callRunnerAction("start", { id: selected.plugin.id });
        if (!payload.ok) {
          throw new Error(payload.message ?? "Failed to start plugin.");
        }
        await setEnabled(selected.plugin.id, true);
        await loadStatus(true);
      }, "Starting plugin...");
      setStatusMessage("Plugin started and enabled.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to start plugin.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleStop = async () => {
    if (!selected) return;
    setIsBusy(true);
    setStatusMessage(null);
    try {
      await withLoader(async () => {
        const payload = await callRunnerAction("stop", { id: selected.plugin.id });
        if (!payload.ok) {
          throw new Error(payload.message ?? "Failed to stop plugin.");
        }
        await setEnabled(selected.plugin.id, false);
        await loadStatus(true);
      }, "Stopping plugin...");
      setStatusMessage("Plugin stopped and disabled.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to stop plugin.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!selected) return;
    setIsBusy(true);
    setStatusMessage(null);
    try {
      await withLoader(async () => {
        const payload = await callRunnerAction("remove", { id: selected.plugin.id });
        if (!payload.ok) {
          throw new Error(payload.message ?? "Failed to remove plugin.");
        }
      }, "Removing plugin...");
      window.location.reload();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to remove plugin.");
      setIsBusy(false);
    }
  };

  const handleInstall = async () => {
    if (!installImage.trim()) return;
    setInstallBusy(true);
    setStatusMessage(null);
    try {
      await enqueueInstallFromImage(installImage.trim());
      closeInstallModal();
      setInstallImage("");
      setStatusMessage("Install queued. Tracking progress...");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to queue install.");
    } finally {
      setInstallBusy(false);
    }
  };

  const selectedStatus = selected ? statusById[selected.plugin.id] : undefined;
  const selectedTone = statusTone(selectedStatus);

  return (
    <main className="mx-auto flex h-[calc(100dvh-64px)] w-full max-w-[1600px] overflow-hidden px-4 py-4">
      <div className="flex h-full w-full overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--rx-shadow-sm)]">
        <section className={`flex min-w-0 flex-1 flex-col bg-background ${selected ? "border-r border-border" : ""}`}>
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h1 className="text-xl font-bold text-foreground">My Plugins</h1>
            <Button variant="solid" tone="primary" onClick={() => setInstallOpen(true)}>
              <span className="material-symbols-outlined text-[18px]">add</span>
              Install from image
            </Button>
          </div>

          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <SearchInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter plugins..."
              aria-label="Filter plugins"
              className="h-9"
            />
            <Button variant="outline" tone="neutral" onClick={() => void handleRefresh()}>
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-2">
              {visiblePendingInstalls.map((entry) => (
                <div
                  key={entry.localId}
                  className={`relative overflow-hidden rounded-xl border px-3 py-3 ${
                    entry.status === "failed"
                      ? "border-danger/50 bg-danger/10"
                      : entry.status === "succeeded"
                        ? "animate-pulse border-success/50 bg-success/10"
                        : "border-accent/50 bg-accent/10"
                  }`}
                >
                  <span
                    className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${
                      entry.status === "failed"
                        ? "bg-danger"
                        : entry.status === "succeeded"
                          ? "bg-success"
                          : "bg-accent"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-foreground">
                        {entry.status === "queued" || entry.status === "running" ? (
                          <InlineSpinner className="h-4 w-4 border-border-subtle border-t-foreground" />
                        ) : (
                          <span className="material-symbols-outlined text-[20px]">
                            {entry.status === "failed" ? "error" : "check_circle"}
                          </span>
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {entry.pluginId ? `Plugin ${entry.pluginId}` : "Importing plugin"}
                        </div>
                        <div className="truncate text-xs text-subtle">{entry.image}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {entry.message ?? fallbackInstallMessage(entry.status)}
                        </div>
                        <div className="mt-2">
                          <div className="mb-1 flex items-center justify-between text-[10px] text-subtle">
                            <span className="truncate uppercase tracking-wider">{entry.phase ?? "queued"}</span>
                            <span>{clampProgress(entry.progress)}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3/80">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                entry.status === "failed"
                                  ? "bg-danger"
                                  : entry.status === "succeeded"
                                    ? "bg-success"
                                    : "bg-accent"
                              }`}
                              style={{ width: `${clampProgress(entry.progress)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        entry.status === "failed"
                          ? "border-danger/50 bg-danger/20 text-danger-foreground"
                          : entry.status === "succeeded"
                            ? "border-success/50 bg-success/20 text-success-foreground"
                            : "border-accent/50 bg-accent/20 text-accent-foreground"
                      }`}
                    >
                      {entry.status.toUpperCase()}
                    </span>
                  </div>

                  {entry.status === "failed" ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        tone="neutral"
                        className="h-7 px-2 text-xs"
                        onClick={() => void retryInstallCard(entry.localId)}
                      >
                        Retry
                      </Button>
                      <Button
                        variant="ghost"
                        tone="neutral"
                        className="h-7 px-2 text-xs"
                        onClick={() => toggleInstallError(entry.localId)}
                      >
                        {entry.showError ? "Hide error" : "View error"}
                      </Button>
                      {entry.pluginId ? (
                        <Button
                          variant="ghost"
                          tone="danger"
                          className="h-7 px-2 text-xs"
                          onClick={() => void removeInstallCardPlugin(entry.localId)}
                        >
                          Remove
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        tone="neutral"
                        className="h-7 px-2 text-xs"
                        onClick={() => dismissInstallCard(entry.localId)}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : null}

                  {entry.status === "succeeded" ? (
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        tone="neutral"
                        className="h-7 px-2 text-xs"
                        onClick={() => dismissInstallCard(entry.localId)}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : null}

                  {entry.status === "failed" && entry.showError && entry.error ? (
                    <div className="mt-2 rounded-md border border-danger/40 bg-surface px-2 py-2 text-xs text-danger">
                      {entry.error}
                    </div>
                  ) : null}
                </div>
              ))}

              {filteredItems.map((item) => {
                const selectedRow = selectedPluginId === item.plugin.id;
                const runtime = statusById[item.plugin.id];
                const tone = statusTone(runtime);
                return (
                  <button
                    key={item.plugin.id}
                    type="button"
                    onClick={() =>
                      setSelectedPluginId((current) =>
                        current === item.plugin.id ? "" : item.plugin.id,
                      )
                    }
                    className={`relative w-full overflow-hidden rounded-xl border px-3 py-3 text-left transition ${
                      selectedRow
                        ? "border-primary/70 bg-primary/10 shadow-[var(--rx-shadow-xs)]"
                        : "border-border bg-surface hover:border-primary/40 hover:bg-surface-2"
                    }`}
                  >
                    <span
                      className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${
                        selectedRow ? "bg-primary" : "bg-transparent"
                      }`}
                      aria-hidden="true"
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-primary">
                          <span className="material-symbols-outlined text-[20px]">extension</span>
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">{item.plugin.name}</div>
                          <div className="truncate text-xs uppercase tracking-widest text-subtle">{item.plugin.id}</div>
                          <div className="mt-1 truncate text-xs text-muted-foreground">{item.plugin.image ?? "No image"}</div>
                        </div>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.className}`}>
                        {tone.label}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-subtle">
                      {runtime?.running && runtime.startedAt
                        ? `Uptime: ${elapsedFrom(runtime.startedAt)}`
                        : runtime?.status === "not-found"
                          ? "Container not found"
                          : `State: ${runtime?.status ?? "unknown"}`}
                    </div>
                  </button>
                );
              })}
              {!filteredItems.length ? (
                <Card>
                  <div className="text-sm text-subtle">No plugins match your search.</div>
                </Card>
              ) : null}
            </div>
          </div>
        </section>

        {selected ? (
          <aside className="flex w-[520px] flex-col border-l border-border bg-background/95">
            <div className="border-b border-border px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-primary">
                    <span className="material-symbols-outlined text-[22px]">extension</span>
                  </span>
                  <div>
                    <div className="text-lg font-bold text-foreground">{selected.plugin.name}</div>
                    <div className="mt-1 text-xs uppercase tracking-widest text-subtle">{selected.plugin.id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${selectedTone.className}`}>
                    {selectedTone.label}
                  </span>
                  <button
                    type="button"
                    className="ui-focus inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-2 text-subtle hover:text-foreground"
                    onClick={() => setSelectedPluginId("")}
                    aria-label="Close plugin details"
                    title="Close details panel"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border bg-surface px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-subtle">
                      Availability
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Enable or hide this plugin from shell views.
                    </div>
                  </div>
                  <Switch
                    checked={selected.plugin.enabled !== false}
                    onCheckedChange={async (nextChecked) => {
                      await setEnabled(selected.plugin.id, nextChecked);
                    }}
                    label={selected.plugin.enabled !== false ? "Enabled" : "Disabled"}
                    className="px-1 text-xs"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="solid" tone="accent" onClick={() => void handleStart()} disabled={isBusy}>
                  Start
                </Button>
                <Button variant="outline" tone="neutral" onClick={() => void handleStop()} disabled={isBusy}>
                  Stop
                </Button>
                <Button variant="solid" tone="primary" onClick={() => setInstallOpen(true)} disabled={isBusy}>
                  Reinstall
                </Button>
                <Button variant="ghost" tone="neutral" onClick={() => void handleRemove()} disabled={isBusy}>
                  Remove
                </Button>
              </div>
            </div>

            <div className="border-b border-border px-5 pt-3">
              <div className="flex gap-4">
                <button
                  type="button"
                  className={`pb-2 text-sm font-semibold ${tab === "overview" ? "border-b-2 border-primary text-primary" : "text-subtle"}`}
                  onClick={() => setTab("overview")}
                >
                  Overview
                </button>
                <button
                  type="button"
                  className={`pb-2 text-sm font-semibold ${tab === "logs" ? "border-b-2 border-primary text-primary" : "text-subtle"}`}
                  onClick={() => setTab("logs")}
                >
                  Logs
                </button>
              </div>
            </div>

            {tab === "overview" ? (
              <div className="custom-scrollbar flex-1 overflow-y-auto p-5">
                <div className="space-y-4">
                  <Card>
                    <div className="space-y-3 p-4 text-sm">
                      <div>
                        <div className="text-xs uppercase tracking-widest text-subtle">Image</div>
                        <div className="font-mono text-xs text-foreground">{selected.plugin.image ?? "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-widest text-subtle">Base URL</div>
                        <div className="font-mono text-xs text-foreground">{selected.plugin.baseUrl}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-widest text-subtle">Mount Path</div>
                        <div className="font-mono text-xs text-foreground">{selected.plugin.mountPath ?? `/plugins/${selected.plugin.id}`}</div>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <div className="p-4">
                      <div className="text-xs uppercase tracking-widest text-subtle">Exposed Views</div>
                      <div className="mt-3 space-y-2">
                        {selected.manifest?.views?.length ? (
                          selected.manifest.views.map((view) => (
                            <div key={view.id} className="rounded-lg border border-border bg-surface-2 px-3 py-2">
                              <div className="text-sm font-medium text-foreground">{view.title}</div>
                              <div className="font-mono text-xs text-subtle">{view.id} · {view.route}</div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-subtle">No views declared.</div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex items-center gap-2 border-b border-border px-4 py-2">
                  <Input
                    value={logsQuery}
                    onChange={(event) => setLogsQuery(event.target.value)}
                    placeholder="Search logs"
                    className="h-8"
                  />
                  <label className="flex items-center gap-2 text-xs text-subtle">
                    <input
                      type="checkbox"
                      checked={liveTail}
                      onChange={(event) => setLiveTail(event.target.checked)}
                    />
                    Live tail
                  </label>
                  <Button variant="ghost" tone="neutral" onClick={() => setLogs([])}>
                    Clear
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto bg-background px-4 py-3 font-mono text-xs text-foreground">
                  {logLines.map((line, index) => (
                    <div key={`${index}-${line.slice(0, 16)}`} className="whitespace-pre-wrap break-all py-0.5">
                      {line}
                    </div>
                  ))}
                  {!logLines.length ? (
                    <div className="text-subtle">No logs available.</div>
                  ) : null}
                </div>
              </div>
            )}
          </aside>
        ) : (
          <aside className="flex w-[520px] items-center justify-center border-l border-border bg-surface-2/40 px-6">
            <div className="max-w-sm text-center">
              <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface text-primary">
                <span className="material-symbols-outlined text-[22px]">extension</span>
              </div>
              <div className="text-sm font-semibold text-foreground">Select a plugin</div>
              <div className="mt-1 text-xs text-subtle">
                Choose an item from the list to inspect status, views and runtime logs.
              </div>
            </div>
          </aside>
        )}
      </div>

      <Modal
        open={installOpen}
        onClose={closeInstallModal}
        title="Install Plugin"
        description="Register a plugin by Docker image. Runner resolves metadata from plugin manifest."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" tone="neutral" onClick={closeInstallModal}>
              Cancel
            </Button>
            <Button variant="solid" tone="primary" onClick={() => void handleInstall()} disabled={installBusy || !installImage.trim()}>
              {installBusy ? (
                <span className="inline-flex items-center gap-2">
                  <InlineSpinner className="h-4 w-4" />
                  Installing
                </span>
              ) : (
                "Install & Deploy"
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            value={installImage}
            onChange={(event) => setInstallImage(event.target.value)}
            placeholder="ghcr.io/openforgelabs/rainbow-plugin-redis:latest"
            aria-label="Docker image"
          />
          <Card className="bg-surface-2">
            <div className="text-xs text-subtle">
              Expected convention: image slug maps to plugin id, and manifest is available at
              <span className="ml-1 font-mono text-foreground">/plugins/&lt;pluginId&gt;/api/plugin-manifest</span>
            </div>
          </Card>
        </div>
      </Modal>

      {statusMessage ? (
        <div className="fixed bottom-4 right-4 rounded-md border border-border bg-surface px-3 py-2 text-xs text-foreground shadow-[var(--rx-shadow-sm)]">
          {statusMessage}
        </div>
      ) : null}
    </main>
  );
}
