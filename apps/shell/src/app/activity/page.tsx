"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Select } from "@openforgelabs/rainbow-ui";
import { useGlobalLoader } from "@/lib/globalLoader";

type ActivityEvent = {
  id: string;
  timestamp: string;
  category: "plugins" | "connections" | "themes" | "environment" | "system";
  action: string;
  target?: string;
  status: "success" | "error" | "info";
  message: string;
  metadata?: Record<string, unknown>;
};

type ActivityConfig = {
  retentionHours: number;
  maxEntries: number;
};

const PAGE_SIZE = 50;

export default function ActivityPage() {
  const { withLoader } = useGlobalLoader();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [config, setConfig] = useState<ActivityConfig | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const load = async () => {
    const response = await withLoader(
      async () => fetch("/api/activity", { cache: "no-store" }),
      "Loading activity log...",
    );
    const payload = await response.json();
    if (payload?.isSuccess) {
      setEvents(payload.data.events ?? []);
      setConfig(payload.data.config ?? null);
    }
  };

  useEffect(() => {
    void load();
  }, [withLoader]);

  const filtered = useMemo(() => {
    return events.filter((event) => {
      if (filterCategory !== "all" && event.category !== filterCategory) return false;
      if (filterStatus !== "all" && event.status !== filterStatus) return false;
      if (!query.trim()) return true;
      const hay = `${event.message} ${event.action} ${event.target ?? ""}`.toLowerCase();
      return hay.includes(query.toLowerCase());
    });
  }, [events, filterCategory, filterStatus, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Activity Log</h1>
          <p className="text-sm text-subtle">
            Recent operations recorded in local workspace.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            tone="neutral"
            onClick={async () => {
              await withLoader(
                async () =>
                  fetch("/api/activity", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "clear" }),
                  }),
                "Clearing activity log...",
              );
              await load();
            }}
          >
            Clear log
          </Button>
          <Button variant="solid" tone="primary" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </header>

      <Card>
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by action/message/target"
            aria-label="Search activity"
          />
          <Select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)}>
            <option value="all">All categories</option>
            <option value="plugins">Plugins</option>
            <option value="connections">Connections</option>
            <option value="themes">Themes</option>
            <option value="environment">Environment</option>
            <option value="system">System</option>
          </Select>
          <Select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
            <option value="all">All status</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="info">Info</option>
          </Select>
          <div className="flex items-center text-xs text-subtle">
            Retention: {config?.retentionHours ?? 24}h · Cap: {config?.maxEntries ?? 2000}
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-subtle">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Target</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Message</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((item) => (
                <tr key={item.id} className="border-b border-border/50">
                  <td className="px-3 py-2 text-xs text-subtle">{new Date(item.timestamp).toLocaleString()}</td>
                  <td className="px-3 py-2">{item.category}</td>
                  <td className="px-3 py-2">{item.action}</td>
                  <td className="px-3 py-2 font-mono text-xs">{item.target ?? "-"}</td>
                  <td className="px-3 py-2">{item.status}</td>
                  <td className="px-3 py-2">{item.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!pageItems.length ? (
            <div className="px-3 py-8 text-center text-sm text-subtle">No activity entries found.</div>
          ) : null}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-subtle">
          <span>
            Page {page} / {totalPages} · {filtered.length} records
          </span>
          <div className="flex gap-2">
            <Button variant="outline" tone="neutral" onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
              Prev
            </Button>
            <Button variant="outline" tone="neutral" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
              Next
            </Button>
          </div>
        </div>
      </Card>
    </main>
  );
}
