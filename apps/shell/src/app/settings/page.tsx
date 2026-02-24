"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, FormField, Input } from "@openforgelabs/rainbow-ui";
import { useGlobalLoader } from "@/lib/globalLoader";

type ActivityConfig = {
  retentionHours: number;
  maxEntries: number;
};

export default function SettingsPage() {
  const { withLoader } = useGlobalLoader();
  const [retentionHours, setRetentionHours] = useState("24");
  const [maxEntries, setMaxEntries] = useState("2000");
  const [status, setStatus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      const response = await withLoader(
        async () => fetch("/api/activity", { cache: "no-store" }),
        "Loading activity settings...",
      );
      const payload = await response.json();
      if (!response.ok || !payload?.isSuccess) {
        return;
      }
      const config = payload.data?.config as ActivityConfig | undefined;
      if (!config) {
        return;
      }
      setRetentionHours(String(config.retentionHours));
      setMaxEntries(String(config.maxEntries));
    };

    void loadConfig();
  }, [withLoader]);

  const applyConfig = async () => {
    setStatus(null);
    const payload = {
      action: "config",
      config: {
        retentionHours: Number(retentionHours),
        maxEntries: Number(maxEntries),
      },
    };

    const response = await withLoader(
      async () =>
        fetch("/api/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      "Saving activity settings...",
    );
    const data = await response.json();
    if (!response.ok || !data?.isSuccess) {
      setStatus(data?.message ?? "Failed to save activity settings.");
      return;
    }
    const config = data.data?.config as ActivityConfig;
    setRetentionHours(String(config.retentionHours));
    setMaxEntries(String(config.maxEntries));
    setStatus("Activity settings saved.");
  };

  const exportEnvironment = async () => {
    const response = await withLoader(
      async () => fetch("/api/environment/export", { cache: "no-store" }),
      "Exporting environment...",
    );
    const data = await response.json();
    if (!response.ok || !data?.isSuccess) {
      setStatus(data?.message ?? "Failed to export environment.");
      return;
    }

    const blob = new Blob([JSON.stringify(data.data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rainbow-environment-freeze.json";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Environment exported.");
  };

  const importEnvironment = async (file: File) => {
    const content = await file.text();
    const payload = JSON.parse(content);
    const response = await withLoader(
      async () =>
        fetch("/api/environment/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload, mode: "replace" }),
        }),
      "Importing environment...",
    );
    const data = await response.json();
    if (!response.ok || !data?.isSuccess) {
      setStatus(data?.message ?? "Failed to import environment.");
      return;
    }
    setStatus("Environment imported (replace mode).");
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-subtle">Global shell preferences and workspace freeze tools.</p>
      </header>

      <Card>
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">Activity Retention</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Retention (hours)">
              <Input
                type="number"
                min={1}
                max={168}
                value={retentionHours}
                onChange={(event) => setRetentionHours(event.target.value)}
              />
            </FormField>
            <FormField label="Max entries">
              <Input
                type="number"
                min={100}
                max={50000}
                value={maxEntries}
                onChange={(event) => setMaxEntries(event.target.value)}
              />
            </FormField>
          </div>
          <div>
            <Button variant="solid" tone="primary" onClick={() => void applyConfig()}>
              Save activity settings
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">Environment Freeze</h2>
          <p className="text-sm text-subtle">
            Export and import complete shell state (plugins, connections, themes, activity).
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="solid" tone="accent" onClick={() => void exportEnvironment()}>
              Export environment
            </Button>
            <Button
              variant="outline"
              tone="neutral"
              onClick={() => inputRef.current?.click()}
            >
              Import environment (replace)
            </Button>
            <input
              ref={inputRef}
              className="hidden"
              type="file"
              accept="application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void importEnvironment(file);
                }
                event.currentTarget.value = "";
              }}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Themes</h2>
            <p className="text-sm text-subtle">Open the theme editor in a dedicated route.</p>
          </div>
          <a
            href="/settings/themes"
            className="inline-flex h-10 items-center justify-center rounded-[var(--rx-radius-md)] border border-transparent bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--rx-shadow-sm)] transition hover:bg-primary-hover"
          >
            Open Themes
          </a>
        </div>
      </Card>

      {status ? (
        <p className="text-sm text-subtle" role="status">
          {status}
        </p>
      ) : null}
    </main>
  );
}
