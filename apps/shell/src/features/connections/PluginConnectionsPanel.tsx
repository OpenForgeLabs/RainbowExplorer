"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, InlineSpinner, Select, SelectWithIcon } from "@openforgelabs/rainbow-ui";
import type { PluginManifest } from "@openforgelabs/rainbow-contracts";
import type { PluginRegistryEntry } from "@/lib/pluginRegistry";
import { PluginConnectionModal } from "@/features/connections/PluginConnectionModal";

type RegistryResponse = {
  plugins: PluginRegistryEntry[];
};

type PluginWithManifest = {
  registry: PluginRegistryEntry;
  manifest: PluginManifest;
};

type ConnectionCard = {
  pluginId: string;
  pluginName: string;
  manifest: PluginManifest;
  icon: string;
  connectionName: string;
  environment?: string;
  useTls?: boolean;
  host?: string;
  port?: number;
};

const resolveDefaultViewId = (manifest: PluginManifest) => {
  if (!manifest.views?.length) {
    return "default";
  }
  const keys = manifest.views.find((view) => view.id === "keys");
  return (keys ?? manifest.views[0]).id;
};

const openRoute = (manifest: PluginManifest, connectionName: string) => {
  const viewId = resolveDefaultViewId(manifest);
  return `/views/${manifest.id}/${viewId}?conn=${encodeURIComponent(connectionName)}`;
};

const resolveConnectionEndpoint = (
  pluginId: string,
  manifest: PluginManifest,
  endpoint: string,
) => {
  const trimmed = endpoint.replace(/^\//, "");
  if (manifest.connections.provider === "shell") {
    return `/${trimmed}`;
  }
  return `/api/plugins/${pluginId}/proxy/${trimmed}`;
};

const resolveSummaryEndpoint = (
  pluginId: string,
  manifest: PluginManifest,
  connectionName: string,
) => {
  const template = manifest.connections.summaryEndpoint;
  if (!template) {
    return null;
  }
  const filled = template.replace(
    "{connectionName}",
    encodeURIComponent(connectionName),
  );
  const trimmed = filled.replace(/^\//, "");
  return `/api/plugins/${pluginId}/proxy/${trimmed}`;
};

export function PluginConnectionsPanel() {
  const [plugins, setPlugins] = useState<PluginWithManifest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePlugin, setActivePlugin] = useState<PluginWithManifest | null>(null);
  const [editValues, setEditValues] = useState<
    Record<string, string | number | boolean | null> | null
  >(null);
  const [filter, setFilter] = useState<string>("all");
  const [addTarget, setAddTarget] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadPlugins = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const registryResponse = await fetch("/api/plugins/registry", {
        cache: "no-store",
      });
      const registryData = (await registryResponse.json()) as RegistryResponse;
      const entries = (registryData.plugins ?? []).filter(
        (plugin) => plugin.enabled !== false,
      );

      const manifests = await Promise.all(
        entries.map(async (entry) => {
          const response = await fetch(
            `/api/plugins/${entry.id}/proxy/api/plugin-manifest`,
            { cache: "no-store" },
          );
          const manifest = (await response.json()) as PluginManifest;
          return { registry: entry, manifest };
        }),
      );

      setPlugins(manifests);
      if (!addTarget && manifests.length > 0) {
        setAddTarget(manifests[0].manifest.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plugins.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  const connections = useMemo(() => {
    return plugins.flatMap((plugin) => {
      const raw = (plugin as PluginWithManifest & { connections?: unknown }).connections;
      return (raw as Array<Record<string, unknown>> | undefined)?.map((item) => ({
        pluginId: plugin.manifest.id,
        pluginName: plugin.manifest.name,
        manifest: plugin.manifest,
        icon: plugin.manifest.views?.[0]?.icon ?? "hub",
        connectionName: String(item.name ?? ""),
        environment: typeof item.environment === "string" ? item.environment : undefined,
        useTls: typeof item.useTls === "boolean" ? item.useTls : undefined,
        host: typeof item.host === "string" ? item.host : undefined,
        port: typeof item.port === "number" ? item.port : undefined,
      })) ?? [];
    });
  }, [plugins]);

  const filteredConnections = useMemo(() => {
    if (filter === "all") {
      return connections;
    }
    return connections.filter((item) => item.pluginId === filter);
  }, [connections, filter]);

  const fetchConnections = useCallback(async () => {
    const updates = await Promise.all(
      plugins.map(async (plugin) => {
        try {
          const response = await fetch(
            resolveConnectionEndpoint(
              plugin.registry.id,
              plugin.manifest,
              plugin.manifest.connections.listEndpoint,
            ),
            { cache: "no-store" },
          );
          const data = await response.json();
          return {
            ...plugin,
            connections: data?.data ?? [],
          };
        } catch {
          return { ...plugin, connections: [] };
        }
      }),
    );
    setPlugins(updates);
  }, [plugins]);

  useEffect(() => {
    if (!plugins.length) return;
    fetchConnections();
  }, [plugins.length]);

  const handleExport = async () => {
    const response = await fetch("/api/connections/export", { cache: "no-store" });
    const data = await response.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "rainbow-connections.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const store = JSON.parse(text);
    await fetch("/api/connections/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store, mode: "merge" }),
    });
    await fetchConnections();
  };

  const activePluginManifest = useMemo(
    () => plugins.find((plugin) => plugin.manifest.id === addTarget),
    [addTarget, plugins],
  );

  const handleEdit = async (connection: ConnectionCard) => {
    try {
      const response = await fetch(
        `/api/connections/${connection.pluginId}/${encodeURIComponent(
          connection.connectionName,
        )}/resolve`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!data?.isSuccess || !data?.data) {
        return;
      }
      setEditValues(data.data as Record<string, string | number | boolean | null>);
      setActivePlugin(
        plugins.find((plugin) => plugin.manifest.id === connection.pluginId) ?? null,
      );
    } catch {
      return;
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">
            Resource Connections
          </h2>
          <p className="text-sm text-slate-400">
            All connections in one place. Filter by technology and manage exports.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SelectWithIcon
            icon="filter_list"
            wrapperClassName="h-10 px-3"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">All technologies</option>
            {plugins.map((plugin) => (
              <option key={plugin.manifest.id} value={plugin.manifest.id}>
                {plugin.manifest.name}
              </option>
            ))}
          </SelectWithIcon>
          <Select
            className="h-10 min-w-[120px] text-sm"
            value={addTarget}
            onChange={(event) => setAddTarget(event.target.value)}
          >
            {plugins.map((plugin) => (
              <option key={plugin.manifest.id} value={plugin.manifest.id}>
                Add: {plugin.manifest.name}
              </option>
            ))}
          </Select>
          <Button
            onClick={() => {
              if (activePluginManifest) {
                setEditValues(null);
                setActivePlugin(activePluginManifest);
              }
            }}
          >
            Add Connection
          </Button>
          <Button variant="navigate" onClick={handleExport}>
            <span className="material-symbols-outlined text-[18px]">
              upload
            </span>
            Export
          </Button>
          <Button
            variant="navigate"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="material-symbols-outlined text-[18px]">
              download
            </span>
            Import
          </Button>
          <Button variant="ghost" onClick={loadPlugins}>
            Refresh
          </Button>
        </div>
      </header>

      {isLoading ? (
        <Card className="bg-surface-dark/30">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <InlineSpinner className="size-4 border-slate-300" />
            Loading plugins...
          </div>
        </Card>
      ) : error ? (
        <Card className="bg-surface-dark/30">
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredConnections.map((connection) => (
            <ConnectionCardView
              key={`${connection.pluginId}-${connection.connectionName}`}
              connection={connection}
              onEdit={() => handleEdit(connection)}
            />
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            handleImport(file);
          }
          event.currentTarget.value = "";
        }}
      />

      {activePlugin ? (
        <PluginConnectionModal
          open={Boolean(activePlugin)}
          plugin={activePlugin.manifest}
          onClose={() => {
            setActivePlugin(null);
            setEditValues(null);
          }}
          onSaved={async () => {
            await fetchConnections();
            setEditValues(null);
          }}
          initialValues={editValues ?? undefined}
        />
      ) : null}
    </section>
  );
}

function ConnectionCardView({
  connection,
  onEdit,
}: {
  connection: ConnectionCard;
  onEdit: () => void;
}) {
  const tagClassesByPlugin: Record<string, string> = {
    redis: "border-tag/40 bg-tag/10 text-tag",
  };
  const tagClass =
    tagClassesByPlugin[connection.pluginId] ??
    "border-tag/30 bg-tag/10 text-tag";
  const [summary, setSummary] = useState<Record<string, string | number> | null>(
    null,
  );
  const [summaryError, setSummaryError] = useState(false);

  useEffect(() => {
    const endpoint = resolveSummaryEndpoint(
      connection.pluginId,
      connection.manifest,
      connection.connectionName,
    );
    if (!endpoint) {
      return;
    }
    let cancelled = false;
    const loadSummary = async () => {
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        const data = await response.json();
        if (cancelled) return;
        if (data?.isSuccess && data?.data) {
          setSummary(data.data as Record<string, string | number>);
        } else {
          setSummaryError(true);
        }
      } catch {
        if (!cancelled) {
          setSummaryError(true);
        }
      }
    };
    loadSummary();
    return () => {
      cancelled = true;
    };
  }, [connection.connectionName, connection.manifest, connection.pluginId]);

  return (
    <Card className="overflow-hidden bg-surface-dark/30">
      <div className="flex h-80 flex-col">
        <div className="flex min-h-[20%] items-start justify-between gap-2 px-2 pb-1.5 pt-2.5">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-dark text-action">
                <span className="material-symbols-outlined text-[20px]">
                  {connection.icon}
                </span>
              </div>
              <div>
                <div className="text-base font-semibold text-slate-100">
                  {connection.connectionName}
                </div>
                <div className="text-xs text-slate-400">
                  {connection.environment ?? "development"} ·{" "}
                  {connection.useTls ? "TLS" : "Plain"}
                </div>
              </div>
            </div>
          </div>
          <span
            className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-widest ${tagClass}`}
          >
            {connection.pluginName}
          </span>
        </div>
        <div className="px-2 text-xs text-slate-400">
          {connection.host
            ? `${connection.host}${connection.port ? `:${connection.port}` : ""}`
            : "Host not provided"}
        </div>
        <div className="flex min-h-[60%] flex-1 flex-col px-2 py-1.5">
          {connection.manifest.connections.summaryEndpoint ? (
            <div className="max-h-full flex-1 overflow-y-auto rounded-lg border border-border-dark/60 bg-surface-dark/50 p-1.5 text-xs text-slate-300">
              {summary ? (
                <div className="grid gap-2">
                  {summary.version ? (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Version</span>
                      <span className="font-semibold">{summary.version}</span>
                    </div>
                  ) : null}
                  {summary.usedMemoryHuman ? (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Memory</span>
                      <span className="font-semibold">{summary.usedMemoryHuman}</span>
                    </div>
                  ) : null}
                  {typeof summary.connectedClients === "number" ? (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Clients</span>
                      <span className="font-semibold">{summary.connectedClients}</span>
                    </div>
                  ) : null}
                  {typeof summary.opsPerSec === "number" ? (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Ops/sec</span>
                      <span className="font-semibold">{summary.opsPerSec}</span>
                    </div>
                  ) : null}
                </div>
              ) : summaryError ? (
                <div className="flex h-full items-center justify-center text-rose-300">
                  Summary unavailable
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-500">
                  Loading summary…
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border-dark/60 bg-surface-dark/40 text-xs text-slate-500">
              No summary available for this plugin.
            </div>
          )}
        </div>
        <div className="mt-auto flex min-h-[20%] flex-wrap items-center justify-between gap-2 px-2 pb-2.5 pt-1.5">
          <div className="flex items-center gap-2">
            <a
              className="rounded-lg border border-navigate/40 bg-navigate/10 px-3 py-1.5 text-xs font-semibold text-navigate transition hover:border-navigate/70 hover:bg-navigate/20"
              href={openRoute(connection.manifest, connection.connectionName)}
            >
              Open
            </a>
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-action/40 bg-action/10 px-3 py-1.5 text-xs font-semibold text-action transition hover:border-action/70 hover:bg-action/20"
            >
              Edit
            </button>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-slate-500">
            {connection.pluginId}
          </span>
        </div>
      </div>
    </Card>
  );
}
