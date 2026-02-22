"use client";

import { useMemo, useState } from "react";
import { Button, Card, EmptyState, Select } from "@openforgelabs/rainbow-ui";
import type { ViewDefinition } from "@openforgelabs/rainbow-contracts";

type ConnectionItem = {
  name?: string;
};

type ViewItem = {
  pluginId: string;
  pluginName: string;
  view: ViewDefinition;
  connections: ConnectionItem[];
};

type ViewsCatalogProps = {
  views: ViewItem[];
};

const resolveViewHref = (item: ViewItem, connectionName: string) =>
  `/views/${item.pluginId}/${item.view.id}?conn=${encodeURIComponent(connectionName)}`;

export function ViewsCatalog({ views }: ViewsCatalogProps) {
  const initialSelection = useMemo(() => {
    const map: Record<string, string> = {};
    views.forEach((item) => {
      const first = item.connections?.[0]?.name;
      if (first) {
        map[`${item.pluginId}:${item.view.id}`] = first;
      }
    });
    return map;
  }, [views]);

  const [selected, setSelected] = useState<Record<string, string>>(initialSelection);

  if (!views.length) {
    return (
      <EmptyState
        title="No views available"
        description="Habilita plugins para publicar vistas o agrega conexiones."
        actionLabel="Manage connections"
        onAction={() => {
          window.location.href = "/connections";
        }}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {views.map((item) => {
        const key = `${item.pluginId}:${item.view.id}`;
        const options = item.connections ?? [];
        const selectedName = selected[key] ?? "";
        return (
          <Card key={key} className="bg-surface-dark/40">
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-lg font-semibold text-slate-100">
                  {item.view.title}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                  {item.pluginName}
                </div>
                <p className="mt-3 text-sm text-slate-300">
                  {item.view.route}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Connection
                </div>
                <Select
                  className="h-10 text-sm"
                  value={selectedName}
                  onChange={(event) =>
                    setSelected((prev) => ({
                      ...prev,
                      [key]: event.target.value,
                    }))
                  }
                >
                  <option value="">Select connection</option>
                  {options.map((connection) => (
                    <option key={connection.name} value={connection.name}>
                      {connection.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  {options.length} available
                </div>
                <Button
                  variant="navigate"
                  disabled={!selectedName}
                  onClick={() => {
                    if (!selectedName) {
                      return;
                    }
                    window.location.href = resolveViewHref(item, selectedName);
                  }}
                >
                  Open view
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
