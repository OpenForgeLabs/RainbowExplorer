"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Input, SearchInput, Select, Textarea } from "@openforgelabs/rainbow-ui";
import { useTheme } from "@/lib/theme";
import { useGlobalLoader } from "@/lib/globalLoader";
import {
  THEME_TOKEN_KEYS,
  THEME_TOKEN_SECTIONS,
  hexToRgb,
  rgbToHex,
  type ThemeDefinition,
  type ThemeRegistry,
} from "@/lib/themeRegistry";

type RegistryResponse = {
  isSuccess: boolean;
  data: ThemeRegistry;
  message?: string;
  reasons?: string[];
};

type EditorMode = "editor" | "json";

const cloneTokens = (source: Record<string, string | undefined> | undefined) =>
  Object.fromEntries(
    Object.entries(source ?? {}).filter(([, value]) => typeof value === "string"),
  ) as Record<string, string>;

const captureComputedTokens = () => {
  const computed = getComputedStyle(document.documentElement);
  const next: Record<string, string> = {};
  for (const key of THEME_TOKEN_KEYS) {
    const raw = computed.getPropertyValue(key).trim();
    if (raw) {
      next[key] = raw;
    }
  }
  return next;
};

const parseEditorPayload = (value: string): { ok: true; data: ThemeDefinition } | { ok: false } => {
  try {
    const parsed = JSON.parse(value) as ThemeDefinition;
    if (!parsed || typeof parsed !== "object") {
      return { ok: false };
    }
    if (typeof parsed.label !== "string" || typeof parsed.description !== "string") {
      return { ok: false };
    }
    const tokens = cloneTokens(parsed.tokens as Record<string, string | undefined> | undefined);
    return {
      ok: true,
      data: {
        ...parsed,
        basedOn: parsed.basedOn,
        tokens,
      },
    };
  } catch {
    return { ok: false };
  }
};

export default function ThemeLabPage() {
  const { themes, theme, setTheme, reloadThemes } = useTheme();
  const { withLoader } = useGlobalLoader();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedThemeId, setSelectedThemeId] = useState<string>(theme);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftBasedOn, setDraftBasedOn] = useState("github-dark");
  const [draftTokens, setDraftTokens] = useState<Record<string, string>>({});
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [mode, setMode] = useState<EditorMode>("editor");
  const [tokenSearch, setTokenSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(THEME_TOKEN_SECTIONS.map((section, index) => [section.title, index < 2])),
  );
  const [jsonDraft, setJsonDraft] = useState("");

  const selectedTheme = useMemo(
    () => themes.find((item) => item.id === selectedThemeId) ?? null,
    [themes, selectedThemeId],
  );

  useEffect(() => {
    if (!themes.length) {
      return;
    }
    if (!themes.some((item) => item.id === selectedThemeId)) {
      setSelectedThemeId(themes[0].id);
    }
  }, [themes, selectedThemeId]);

  useEffect(() => {
    if (!selectedTheme) {
      return;
    }

    let cancelled = false;

    const hydrate = async () => {
      setTheme(selectedTheme.id);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (cancelled) {
        return;
      }

      const computedTokens = captureComputedTokens();
      const mergedTokens = { ...computedTokens, ...cloneTokens(selectedTheme.tokens) };
      setDraftLabel(selectedTheme.label);
      setDraftDescription(selectedTheme.description);
      setDraftBasedOn(selectedTheme.basedOn ?? selectedTheme.id);
      setDraftTokens(mergedTokens);
      setJsonDraft(
        JSON.stringify(
          {
            id: selectedTheme.id,
            label: selectedTheme.label,
            description: selectedTheme.description,
            basedOn: selectedTheme.basedOn ?? selectedTheme.id,
            tokens: mergedTokens,
          },
          null,
          2,
        ),
      );
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [selectedTheme, setTheme]);

  const saveRegistry = async (nextThemes: ThemeDefinition[]) => {
    setIsBusy(true);
    setStatus(null);
    try {
      const response = await withLoader(
        async () =>
          fetch("/api/themes/registry", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ registry: { themes: nextThemes } }),
          }),
        "Saving theme registry...",
      );
      const payload = (await response.json()) as RegistryResponse;
      if (!response.ok || !payload?.isSuccess) {
        setStatus(payload.message ?? "Failed to save theme registry.");
        return false;
      }
      await reloadThemes();
      setStatus("Theme registry saved.");
      return true;
    } catch {
      setStatus("Failed to save theme registry.");
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveTheme = async () => {
    if (!selectedTheme) {
      return;
    }

    const nextThemes = themes.map((item) => {
      if (item.id !== selectedTheme.id) {
        return item;
      }
      return {
        ...item,
        label: draftLabel.trim() || item.label,
        description: draftDescription.trim() || item.description,
        basedOn: draftBasedOn,
        tokens: cloneTokens(draftTokens),
      };
    });

    await saveRegistry(nextThemes);
  };

  const handleCreateTheme = async () => {
    const seed = `custom-${Date.now().toString(36)}`;
    const base = selectedTheme?.id ?? "github-dark";
    const tokens = captureComputedTokens();
    const nextThemes: ThemeDefinition[] = [
      ...themes,
      {
        id: seed,
        label: `Custom ${themes.length + 1}`,
        description: "User customized theme.",
        basedOn: base,
        tokens,
      },
    ];

    const ok = await saveRegistry(nextThemes);
    if (ok) {
      setSelectedThemeId(seed);
      setTheme(seed);
    }
  };

  const handleDeleteTheme = async () => {
    if (!selectedTheme) {
      return;
    }
    if (selectedTheme.isBuiltIn) {
      setStatus("Built-in themes cannot be removed. Use reset to restore defaults.");
      return;
    }
    const nextThemes = themes.filter((item) => item.id !== selectedTheme.id);
    const ok = await saveRegistry(nextThemes);
    if (ok) {
      const fallbackId = nextThemes[0]?.id ?? "github-dark";
      setSelectedThemeId(fallbackId);
      setTheme(fallbackId);
    }
  };

  const handleResetRegistry = async () => {
    setIsBusy(true);
    setStatus(null);
    try {
      const response = await withLoader(
        async () =>
          fetch("/api/themes/registry", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reset" }),
          }),
        "Resetting themes...",
      );
      const payload = (await response.json()) as RegistryResponse;
      if (!response.ok || !payload?.isSuccess) {
        setStatus(payload.message ?? "Failed to reset theme registry.");
        return;
      }
      await reloadThemes();
      setSelectedThemeId("github-dark");
      setTheme("github-dark");
      setStatus("Theme registry restored to defaults.");
    } catch {
      setStatus("Failed to reset theme registry.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleExportTheme = () => {
    const payload: ThemeRegistry = { themes };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rainbow-theme-registry.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportThemeFile = async (file: File) => {
    setIsBusy(true);
    setStatus(null);
    try {
      const text = await file.text();
      const incoming = JSON.parse(text) as ThemeRegistry;
      const response = await withLoader(
        async () =>
          fetch("/api/themes/registry", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "import", mode: "merge", registry: incoming }),
          }),
        "Importing themes...",
      );
      const payload = (await response.json()) as RegistryResponse;
      if (!response.ok || !payload?.isSuccess) {
        setStatus(payload.message ?? "Failed to import themes.");
        return;
      }
      await reloadThemes();
      setStatus("Themes imported.");
    } catch {
      setStatus("Failed to import themes.");
    } finally {
      setIsBusy(false);
    }
  };

  const updateToken = (token: string, value: string) => {
    setDraftTokens((prev) => ({ ...prev, [token]: value }));
    document.documentElement.style.setProperty(token, value);
  };

  const updateTokenFromHex = (token: string, hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) {
      return;
    }
    updateToken(token, rgb);
  };

  const visibleSections = useMemo(() => {
    const normalized = tokenSearch.trim().toLowerCase();
    if (!normalized) {
      return THEME_TOKEN_SECTIONS;
    }
    return THEME_TOKEN_SECTIONS.map((section) => ({
      ...section,
      tokens: section.tokens.filter((token) => {
        const haystack = `${token.label} ${token.key} ${token.description}`.toLowerCase();
        return haystack.includes(normalized);
      }),
    })).filter((section) => section.tokens.length > 0);
  }, [tokenSearch]);

  const themeJsonTemplate = useMemo(
    () =>
      JSON.stringify(
        {
          id: selectedTheme?.id ?? "theme-id",
          label: draftLabel,
          description: draftDescription,
          basedOn: draftBasedOn,
          tokens: cloneTokens(draftTokens),
        },
        null,
        2,
      ),
    [selectedTheme?.id, draftLabel, draftDescription, draftBasedOn, draftTokens],
  );

  const applyJsonDraft = () => {
    const parsed = parseEditorPayload(jsonDraft);
    if (!parsed.ok) {
      setStatus("Invalid JSON payload for theme editor.");
      return;
    }

    setDraftLabel(parsed.data.label);
    setDraftDescription(parsed.data.description);
    setDraftBasedOn(parsed.data.basedOn ?? draftBasedOn);
    setDraftTokens(cloneTokens(parsed.data.tokens));
    for (const [key, value] of Object.entries(parsed.data.tokens ?? {})) {
      if (typeof value === "string") {
        document.documentElement.style.setProperty(key, value);
      }
    }
    setStatus("JSON payload applied to editor draft.");
  };

  return (
    <main className="flex h-[calc(100vh-7rem)] min-h-[720px] flex-col overflow-hidden px-6 py-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[var(--rx-radius-lg)] border border-border bg-surface p-4 shadow-[var(--rx-shadow-xs)]">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground">Theme Lab</h1>
          <p className="text-xs text-muted-foreground">
            Gestiona temas en <code>~/.rainbow/theme-registry.json</code> con edición visual y preview en vivo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-[var(--rx-radius-md)] border border-border bg-surface-2 p-1">
            <button
              type="button"
              onClick={() => setMode("editor")}
              className={mode === "editor" ? "rounded-[var(--rx-radius-sm)] bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground" : "rounded-[var(--rx-radius-sm)] px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"}
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => {
                setJsonDraft(themeJsonTemplate);
                setMode("json");
              }}
              className={mode === "json" ? "rounded-[var(--rx-radius-sm)] bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground" : "rounded-[var(--rx-radius-sm)] px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"}
            >
              JSON
            </button>
          </div>

          <Button variant="outline" tone="neutral" onClick={handleCreateTheme} disabled={isBusy}>
            New theme
          </Button>
          <Button variant="outline" tone="neutral" onClick={() => fileInputRef.current?.click()} disabled={isBusy}>
            Import
          </Button>
          <Button variant="outline" tone="neutral" onClick={handleExportTheme} disabled={isBusy}>
            Export
          </Button>
          <Button variant="ghost" tone="danger" onClick={handleResetRegistry} disabled={isBusy}>
            Reset
          </Button>
          <Button variant="solid" tone="primary" onClick={handleSaveTheme} disabled={isBusy || !selectedTheme}>
            Save changes
          </Button>
        </div>
      </header>

      {status ? (
        <div className="mb-4 rounded-[var(--rx-radius-md)] border border-border bg-surface-2 px-4 py-2 text-xs text-muted-foreground">
          {status}
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="application/json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleImportThemeFile(file);
          }
          event.currentTarget.value = "";
        }}
      />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[360px_1fr]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-[var(--rx-radius-lg)] border border-border bg-surface shadow-[var(--rx-shadow-xs)]">
          <div className="border-b border-border p-4">
            <div className="grid gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-subtle">Theme</span>
                <Select value={selectedThemeId} onChange={(event) => setSelectedThemeId(event.target.value)}>
                  {themes.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label} ({option.id})
                    </option>
                  ))}
                </Select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-subtle">Label</span>
                <Input value={draftLabel} onChange={(event) => setDraftLabel(event.target.value)} />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-subtle">Description</span>
                <Input value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-subtle">Based On</span>
                <Select value={draftBasedOn} onChange={(event) => setDraftBasedOn(event.target.value)}>
                  {themes.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>

              <SearchInput
                aria-label="Search tokens"
                placeholder="Search token by name or key..."
                value={tokenSearch}
                onChange={(event) => setTokenSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {mode === "json" ? (
              <div className="p-4">
                <Textarea
                  className="min-h-[420px] font-mono text-xs"
                  value={jsonDraft}
                  onChange={(event) => setJsonDraft(event.target.value)}
                />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Button variant="outline" tone="neutral" onClick={() => setJsonDraft(themeJsonTemplate)}>
                    Reset JSON
                  </Button>
                  <Button variant="solid" tone="accent" onClick={applyJsonDraft}>
                    Apply JSON
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {visibleSections.map((section) => {
                  const expanded = expandedSections[section.title] ?? true;
                  return (
                    <section key={section.title}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-2"
                        onClick={() =>
                          setExpandedSections((prev) => ({
                            ...prev,
                            [section.title]: !expanded,
                          }))
                        }
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-subtle">
                            {expanded ? "expand_more" : "chevron_right"}
                          </span>
                          <span className="text-sm font-semibold text-foreground">{section.title}</span>
                        </div>
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {section.tokens.length}
                        </span>
                      </button>

                      {expanded ? (
                        <div className="space-y-2 px-4 pb-4">
                          {section.tokens.map((token) => (
                            <div
                              key={token.key}
                              className="rounded-[var(--rx-radius-md)] border border-border-subtle bg-surface-2 p-2.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold text-foreground">{token.label}</p>
                                  <p className="truncate text-[10px] text-subtle">{token.key}</p>
                                </div>
                                <input
                                  type="color"
                                  value={rgbToHex(draftTokens[token.key] ?? "0 0 0")}
                                  onChange={(event) => updateTokenFromHex(token.key, event.target.value)}
                                  className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent"
                                />
                              </div>
                              <Input
                                className="mt-2 text-xs"
                                value={draftTokens[token.key] ?? ""}
                                onChange={(event) => updateToken(token.key, event.target.value)}
                                placeholder="r g b"
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </section>
                  );
                })}

                {!visibleSections.length ? (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                    No tokens match your search.
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            <Button
              variant="ghost"
              tone="danger"
              className="w-full"
              onClick={handleDeleteTheme}
              disabled={isBusy || !selectedTheme || selectedTheme.isBuiltIn}
            >
              Delete custom theme
            </Button>
          </div>
        </aside>

        <section className="relative min-h-0 overflow-hidden rounded-[var(--rx-radius-xl)] border border-border bg-background shadow-[var(--rx-shadow-md)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgb(var(--rx-color-primary)/0.12),transparent_55%)]" />
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgb(var(--rx-color-border)/0.5)_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--rx-color-border)/0.5)_1px,transparent_1px)] [background-size:24px_24px]" />

          <div className="relative z-10 flex h-full min-h-0 flex-col p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Live Preview</h2>
                <p className="text-xs text-muted-foreground">Visualiza cambios sobre componentes del DS en tiempo real.</p>
              </div>
              <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] uppercase tracking-widest text-subtle">
                realtime
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-[var(--rx-radius-lg)] border border-border-strong/50 bg-surface p-4">
              <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
                <Card className="h-fit bg-surface-2">
                  <div className="space-y-2">
                    <div className="rounded-[var(--rx-radius-md)] bg-primary/15 px-3 py-2 text-sm font-semibold text-primary">
                      Overview
                    </div>
                    <div className="rounded-[var(--rx-radius-md)] px-3 py-2 text-sm text-muted-foreground">Team</div>
                    <div className="rounded-[var(--rx-radius-md)] px-3 py-2 text-sm text-muted-foreground">Resources</div>
                    <div className="rounded-[var(--rx-radius-md)] px-3 py-2 text-sm text-muted-foreground">Analytics</div>
                  </div>
                </Card>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Team Members</h3>
                      <p className="text-sm text-muted-foreground">Manage your team and account permissions.</p>
                    </div>
                    <Button variant="solid" tone="primary" leftIcon={<span className="material-symbols-outlined text-base">add</span>}>
                      Add Member
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <Card className="bg-surface-2">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-subtle">Total Users</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">1,234</p>
                      <p className="mt-1 text-xs text-success">+12% this month</p>
                    </Card>
                    <Card className="bg-surface-2">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-subtle">Active Now</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">845</p>
                      <div className="mt-2 h-1.5 rounded-full bg-surface-3">
                        <div className="h-full w-2/3 rounded-full bg-primary" />
                      </div>
                    </Card>
                    <Card className="bg-surface-2">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-subtle">Pending</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">28</p>
                      <p className="mt-1 text-xs text-warning">Requires approval</p>
                    </Card>
                  </div>

                  <Card className="overflow-hidden bg-surface-2 p-0">
                    <div className="border-b border-border p-3">
                      <div className="flex flex-wrap gap-2">
                        <SearchInput aria-label="Preview search" placeholder="Search members..." className="min-w-[240px] flex-1" />
                        <Button variant="outline" tone="neutral">Filter</Button>
                      </div>
                    </div>
                    <div className="divide-y divide-border">
                      {[
                        { name: "Jane Doe", role: "Admin", status: "Active", tone: "success" },
                        { name: "Alex Smith", role: "Editor", status: "Invited", tone: "warning" },
                        { name: "Mike K.", role: "Viewer", status: "Offline", tone: "neutral" },
                      ].map((row) => (
                        <div key={row.name} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{row.name}</p>
                            <p className="text-xs text-muted-foreground">{row.role}</p>
                          </div>
                          <span className={row.tone === "success" ? "rounded-full bg-success/15 px-2 py-1 text-xs font-semibold text-success" : row.tone === "warning" ? "rounded-full bg-warning/15 px-2 py-1 text-xs font-semibold text-warning" : "rounded-full bg-surface-3 px-2 py-1 text-xs font-semibold text-muted-foreground"}>
                            {row.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
