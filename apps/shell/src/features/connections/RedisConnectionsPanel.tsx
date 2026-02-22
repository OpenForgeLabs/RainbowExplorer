"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, InlineSpinner } from "@openforgelabs/rainbow-ui";
import { loadPluginRegistry, PluginRegistryEntry } from "@/lib/pluginRegistry";
import type { ApiResponse, RedisConnectionInfo } from "@/lib/types";
import { NewRedisConnectionModal } from "@/features/connections/NewRedisConnectionModal";

type RedisConnectionsPanelProps = {
  initialPlugin?: PluginRegistryEntry | null;
};

export function RedisConnectionsPanel({
  initialPlugin = null,
}: RedisConnectionsPanelProps) {
  const [connections, setConnections] = useState<RedisConnectionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [plugin, setPlugin] = useState<PluginRegistryEntry | null>(initialPlugin);

  const loadConnections = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/connections/redis", {
        cache: "no-store",
      });
      const data = (await response.json()) as ApiResponse<RedisConnectionInfo[]>;
      if (!data.isSuccess) {
        throw new Error(data.message || "Failed to load connections.");
      }
      setConnections(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load connections.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnections();
    const handler = () => loadConnections();
    window.addEventListener("connections:refresh", handler);
    return () => window.removeEventListener("connections:refresh", handler);
  }, [loadConnections]);

  useEffect(() => {
    if (initialPlugin) {
      return;
    }
    loadPluginRegistry().then((registry) => {
      const entry = registry.plugins.find(
        (candidate) => candidate.id === "redis" && candidate.enabled !== false,
      );
      setPlugin(entry ?? null);
    });
  }, [initialPlugin]);

  const openConnectionUrl = useMemo(() => {
    if (!plugin) {
      return null;
    }
    const base = plugin.baseUrl.replace(/\/+$/, "");
    const mountPath = plugin.mountPath ?? `/plugins/${plugin.id}`;
    return (name: string) =>
      `${base}${mountPath}/${encodeURIComponent(name)}`;
  }, [plugin]);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">
            Redis Connections
          </h2>
          <p className="text-sm text-slate-400">
            Create and manage Redis connections used by plugins.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={loadConnections}>
            Refresh
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            Add Connection
          </Button>
        </div>
      </header>

      <Card className="bg-surface-dark/30">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <InlineSpinner className="size-4 border-slate-300" />
            Loading connections...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : connections.length === 0 ? (
          <div className="text-sm text-slate-400">
            No Redis connections found. Add one to get started.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border-dark/60">
            {connections.map((connection) => (
              <div
                key={connection.name}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-100">
                    {connection.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {connection.environment ?? "development"} ·{" "}
                    {connection.useTls ? "TLS" : "Plain"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {openConnectionUrl ? (
                    <a
                      className="rounded-lg border border-border-dark bg-surface-dark px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-action"
                      href={openConnectionUrl(connection.name)}
                    >
                      Open
                    </a>
                  ) : (
                    <span className="text-xs text-slate-500">
                      Plugin disabled
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <NewRedisConnectionModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadConnections}
      />
    </section>
  );
}
