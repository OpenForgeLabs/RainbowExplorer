"use client";

import { useEffect, useMemo, useState } from "react";
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

export function PluginRegistryWorkspace({ initialItems }: PluginRegistryWorkspaceProps) {
  const [items, setItems] = useState(initialItems);
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

  const logLines = useMemo(() => {
    const normalized = logsQuery.trim().toLowerCase();
    if (!normalized) return logs;
    return logs.filter((line) => line.toLowerCase().includes(normalized));
  }, [logs, logsQuery]);

  const loadStatus = async () => {
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
    void loadStatus();
    const timer = window.setInterval(() => {
      void loadStatus();
    }, 5000);
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
        await loadStatus();
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
        await loadStatus();
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
      await withLoader(async () => {
        const payload = await callRunnerAction("install", { image: installImage.trim() });
        if (!payload.ok) {
          throw new Error(payload.message ?? "Failed to install plugin.");
        }
      }, "Installing plugin from image...");
      setInstallOpen(false);
      setInstallImage("");
      window.location.reload();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to install plugin.");
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
            <Button variant="outline" tone="neutral" onClick={() => void loadStatus()}>
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-2">
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
        onClose={() => setInstallOpen(false)}
        title="Install Plugin"
        description="Register a plugin by Docker image. Runner resolves metadata from plugin manifest."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" tone="neutral" onClick={() => setInstallOpen(false)}>
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
