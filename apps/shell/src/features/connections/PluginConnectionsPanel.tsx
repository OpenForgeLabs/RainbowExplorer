"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, InlineSpinner, Modal, SearchInput } from "@openforgelabs/rainbow-ui";
import type { PluginManifest } from "@openforgelabs/rainbow-contracts";
import type { PluginRegistryEntry } from "@/lib/pluginRegistry";
import { PluginConnectionModal } from "@/features/connections/PluginConnectionModal";
import { useGlobalLoader } from "@/lib/globalLoader";

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

const resolvePluginId = (plugin: PluginWithManifest) =>
  plugin.manifest.id?.trim() || plugin.registry.id;

const resolvePluginName = (plugin: PluginWithManifest) =>
  plugin.manifest.name?.trim() || plugin.registry.name || resolvePluginId(plugin);

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

const resolveConnectionEndpoint = (pluginId: string) =>
  `/api/connections/${pluginId}`;

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
  const { withLoader } = useGlobalLoader();
  const [plugins, setPlugins] = useState<PluginWithManifest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePlugin, setActivePlugin] = useState<PluginWithManifest | null>(null);
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const [addPickerSelection, setAddPickerSelection] = useState("");
  const [editValues, setEditValues] = useState<
    Record<string, string | number | boolean | null> | null
  >(null);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selectedConnectionKey, setSelectedConnectionKey] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchConnections = useCallback(async (sourcePlugins: PluginWithManifest[]) => {
    if (!sourcePlugins.length) {
      setPlugins([]);
      return;
    }
    const updates = await Promise.all(
      sourcePlugins.map(async (plugin) => {
        try {
          const response = await fetch(
            resolveConnectionEndpoint(plugin.registry.id),
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
  }, []);

  const loadPlugins = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const manifests = await withLoader(async () => {
        const registryResponse = await fetch("/api/plugins/registry", {
          cache: "no-store",
        });
        const registryData = (await registryResponse.json()) as RegistryResponse;
        const entries = (registryData.plugins ?? []).filter(
          (plugin) => plugin.enabled !== false,
        );

        return Promise.all(
          entries.map(async (entry) => {
            const response = await fetch(
              `/api/plugins/${entry.id}/proxy/api/plugin-manifest`,
              { cache: "no-store" },
            );
            if (!response.ok) {
              throw new Error(`Manifest for '${entry.id}' is not reachable.`);
            }
            const manifest = (await response.json()) as PluginManifest;
            return { registry: entry, manifest };
          }),
        );
      }, "Loading plugin manifests...");

      await fetchConnections(manifests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plugins.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchConnections, withLoader]);

  useEffect(() => {
    void loadPlugins();
  }, [loadPlugins]);

  const connections = useMemo(() => {
    return plugins.flatMap((plugin) => {
      const raw = (plugin as PluginWithManifest & { connections?: unknown }).connections;
      return (raw as Array<Record<string, unknown>> | undefined)?.map((item) => ({
        pluginId: resolvePluginId(plugin),
        pluginName: resolvePluginName(plugin),
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
    const normalizedQuery = query.trim().toLowerCase();
    return connections.filter((item) => {
      if (filter !== "all" && item.pluginId !== filter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const hay = [
        item.connectionName,
        item.pluginName,
        item.pluginId,
        item.host ?? "",
        item.environment ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }, [connections, filter, query]);

  const handleExport = async () => {
    const response = await withLoader(
      async () => fetch("/api/connections/export", { cache: "no-store" }),
      "Exporting connections...",
    );
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
    await withLoader(
      async () =>
        fetch("/api/connections/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ store, mode: "merge" }),
        }),
      "Importing connections...",
    );
    await fetchConnections(plugins);
  };

  const technologyCount = plugins.length;
  const healthyCount = connections.length;

  const handleEdit = async (connection: ConnectionCard) => {
    try {
      const response = await withLoader(
        async () =>
          fetch(
            `/api/connections/${connection.pluginId}/${encodeURIComponent(
              connection.connectionName,
            )}/resolve`,
            { cache: "no-store" },
          ),
        "Resolving connection...",
      );
      const data = await response.json();
      if (!data?.isSuccess || !data?.data) {
        return;
      }
      setEditValues(data.data as Record<string, string | number | boolean | null>);
      setActivePlugin(
        plugins.find((plugin) => resolvePluginId(plugin) === connection.pluginId) ?? null,
      );
      setSelectedConnectionKey(`${connection.pluginId}-${connection.connectionName}`);
    } catch {
      return;
    }
  };

  const openAddPicker = () => {
    setAddPickerSelection("");
    setAddPickerOpen(true);
  };

  const handleConfirmAddTechnology = () => {
    if (!addPickerSelection) {
      return;
    }
    const target = plugins.find((plugin) => resolvePluginId(plugin) === addPickerSelection);
    if (!target) {
      return;
    }
    setEditValues(null);
    setActivePlugin(target);
    setAddPickerOpen(false);
  };

  return (
    <section className="flex flex-col gap-4">
      <header className="rounded-xl border border-border bg-surface px-4 py-4 shadow-[var(--rx-shadow-xs)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Resource Connections</h2>
            <p className="text-sm text-muted-foreground">
              Monitor, manage and open your infrastructure connections from one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-border bg-surface-2 p-1">
              <Button
                variant="ghost"
                tone="neutral"
                className="h-8 px-3 text-xs"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Import
              </Button>
              <Button variant="ghost" tone="neutral" className="h-8 px-3 text-xs" onClick={handleExport}>
                <span className="material-symbols-outlined text-[16px]">upload</span>
                Export
              </Button>
            </div>
            <Button onClick={openAddPicker} variant="solid" tone="primary">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Connection
            </Button>
            <Button variant="outline" tone="neutral" onClick={loadPlugins}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="grid min-w-0 flex-1 gap-2 md:grid-cols-[1fr_220px]">
            <SearchInput
              aria-label="Filter connections"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by name, host or technology..."
            />
            <select
              className="ui-focus h-10 rounded-[var(--rx-radius-md)] border border-border bg-control px-3 text-sm text-foreground"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All technologies</option>
              {plugins.map((plugin) => (
                <option key={resolvePluginId(plugin)} value={resolvePluginId(plugin)}>
                  {resolvePluginName(plugin)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 text-xs text-subtle">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-success" />
              {healthyCount} configured
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {technologyCount} technologies
            </span>
          </div>
        </div>
      </header>

      {isLoading ? (
        <Card>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <InlineSpinner className="size-4 border-border-subtle border-t-foreground" />
            Loading plugins...
          </div>
        </Card>
      ) : error ? (
        <Card className="bg-surface-2">
          <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filteredConnections.map((connection) => (
            <ConnectionCardView
              key={`${connection.pluginId}-${connection.connectionName}`}
              connection={connection}
              selected={selectedConnectionKey === `${connection.pluginId}-${connection.connectionName}`}
              onOpen={() => setSelectedConnectionKey(`${connection.pluginId}-${connection.connectionName}`)}
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
            await fetchConnections(plugins);
            setEditValues(null);
          }}
          initialValues={editValues ?? undefined}
        />
      ) : null}

      <Modal
        open={addPickerOpen}
        onClose={() => setAddPickerOpen(false)}
        title="Add Connection"
        description="Choose the technology first, then configure its connection fields."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" tone="neutral" onClick={() => setAddPickerOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="solid"
              tone="primary"
              onClick={handleConfirmAddTechnology}
              disabled={!addPickerSelection}
            >
              Continue
            </Button>
          </div>
        }
      >
        <div className="grid gap-2">
          {plugins.map((plugin) => {
            const pluginId = resolvePluginId(plugin);
            const selectedTech = addPickerSelection === pluginId;
            return (
              <button
                key={pluginId}
                type="button"
                className={`ui-focus relative rounded-xl border px-3 py-3 text-left transition ${
                  selectedTech
                    ? "border-primary bg-primary/10 shadow-[var(--rx-shadow-xs)]"
                    : "border-border bg-surface hover:border-primary/40"
                }`}
                onClick={() => setAddPickerSelection(pluginId)}
              >
                <span
                  className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${
                    selectedTech ? "bg-primary" : "bg-transparent"
                  }`}
                  aria-hidden="true"
                />
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-primary">
                    <span className="material-symbols-outlined text-[18px]">extension</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{resolvePluginName(plugin)}</div>
                    <div className="text-xs uppercase tracking-widest text-subtle">{pluginId}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Modal>
    </section>
  );
}

function ConnectionCardView({
  connection,
  selected,
  onOpen,
  onEdit,
}: {
  connection: ConnectionCard;
  selected: boolean;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const tagClassesByPlugin: Record<string, string> = {
    redis: "border-transparent bg-accent text-accent-foreground shadow-[var(--rx-shadow-xs)]",
  };
  const tagClass =
    tagClassesByPlugin[connection.pluginId] ??
    "border-border bg-surface-2 text-foreground";
  const [summary, setSummary] = useState<Record<string, string | number> | null>(
    null,
  );
  const [summaryError, setSummaryError] = useState(false);
  const summaryEntries = useMemo(() => {
    if (!summary) {
      return [];
    }
    return Object.entries(summary).filter(([, value]) => {
      const valueType = typeof value;
      return valueType === "string" || valueType === "number" || valueType === "boolean";
    });
  }, [summary]);

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
    <Card
      className={`relative overflow-hidden rounded-xl border transition ${
        selected
          ? "border-primary/70 bg-primary/10 shadow-[var(--rx-shadow-sm)]"
          : "border-border bg-surface hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surface-2"
      }`}
    >
      <span
        className={`absolute inset-x-0 top-0 h-1 ${selected ? "bg-primary" : "bg-transparent"}`}
        aria-hidden="true"
      />
      <div className="flex h-[22rem] flex-col p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-3 text-accent">
                <span className="material-symbols-outlined text-[20px]">
                  {connection.icon}
                </span>
              </div>
              <div>
                <div className="text-base font-semibold text-foreground">
                  {connection.connectionName}
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

        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded border border-border bg-surface-3 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
            {connection.environment ?? "dev"}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-surface-2/80 p-2">
          {connection.manifest.connections.summaryEndpoint ? (
            summary ? (
              summaryEntries.length > 0 ? (
                <div className="custom-scrollbar grid h-full gap-1 overflow-y-auto overflow-x-hidden pb-1 pr-1">
                  {summaryEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className="flex min-w-0 items-center justify-between gap-2 overflow-hidden rounded-md border border-border-subtle/60 bg-surface px-2 py-1"
                    >
                      <span className="min-w-0 flex-1 truncate text-[10px] uppercase tracking-widest text-subtle">
                        {key}
                      </span>
                      <span className="max-w-[45%] truncate text-right font-mono text-[11px] text-foreground">
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-subtle">
                  Summary has no scalar values.
                </div>
              )
            ) : summaryError ? (
              <div className="flex h-full items-center justify-center text-xs text-danger">
                Summary unavailable
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-subtle">
                Loading summary…
              </div>
            )
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-subtle">
              No summary available for this plugin.
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
            <a
              onClick={onOpen}
              className="flex-1 rounded-lg border border-transparent bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground shadow-[var(--rx-shadow-sm)] transition hover:bg-primary-hover"
              href={openRoute(connection.manifest, connection.connectionName)}
            >
              Open Connection
            </a>
            <button
              type="button"
              onClick={onEdit}
              className="ui-focus inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-subtle transition hover:bg-surface-3 hover:text-foreground"
              aria-label="Edit connection"
              title="Edit connection"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
        </div>
      </div>
    </Card>
  );
}
