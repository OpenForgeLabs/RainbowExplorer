"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, SearchInput, Select } from "@openforgelabs/rainbow-ui";

type ThemeToken = {
  key: string;
  label: string;
  description: string;
};

const SURFACE_TOKENS: ThemeToken[] = [
  { key: "--rx-color-bg", label: "Background", description: "App background." },
  { key: "--rx-color-surface", label: "Surface", description: "Primary surface." },
  { key: "--rx-color-surface-2", label: "Surface 2", description: "Secondary surface." },
  { key: "--rx-color-surface-3", label: "Surface 3", description: "Tertiary surface." },
  { key: "--rx-color-overlay", label: "Overlay", description: "Modal overlays." },
  { key: "--rx-color-elevated", label: "Elevated", description: "Floating panels." },
];

const TEXT_TOKENS: ThemeToken[] = [
  { key: "--rx-color-text", label: "Text", description: "Primary text." },
  { key: "--rx-color-text-muted", label: "Text Muted", description: "Secondary text." },
  { key: "--rx-color-text-subtle", label: "Text Subtle", description: "Tertiary text." },
  { key: "--rx-color-text-inverse", label: "Text Inverse", description: "Text on dark." },
  {
    key: "--rx-color-text-on-primary",
    label: "Text on Primary",
    description: "Text on primary actions.",
  },
  {
    key: "--rx-color-text-on-accent",
    label: "Text on Accent",
    description: "Text on accent actions.",
  },
  {
    key: "--rx-color-text-on-danger",
    label: "Text on Danger",
    description: "Text on danger actions.",
  },
  {
    key: "--rx-color-text-on-success",
    label: "Text on Success",
    description: "Text on success actions.",
  },
  {
    key: "--rx-color-text-on-warning",
    label: "Text on Warning",
    description: "Text on warning actions.",
  },
];

const STRUCTURE_TOKENS: ThemeToken[] = [
  { key: "--rx-color-border", label: "Border", description: "Default borders." },
  {
    key: "--rx-color-border-subtle",
    label: "Border Subtle",
    description: "Low-contrast borders.",
  },
  {
    key: "--rx-color-border-strong",
    label: "Border Strong",
    description: "High-contrast borders.",
  },
  { key: "--rx-color-divider", label: "Divider", description: "Hairline dividers." },
  { key: "--rx-color-ring", label: "Ring", description: "Focus rings." },
  { key: "--rx-color-focus", label: "Focus", description: "Keyboard focus." },
];

const INTERACTIVE_TOKENS: ThemeToken[] = [
  { key: "--rx-color-primary", label: "Primary", description: "Primary action." },
  {
    key: "--rx-color-primary-hover",
    label: "Primary Hover",
    description: "Primary hover.",
  },
  {
    key: "--rx-color-primary-active",
    label: "Primary Active",
    description: "Primary active.",
  },
  { key: "--rx-color-accent", label: "Accent", description: "Accent action." },
  {
    key: "--rx-color-accent-hover",
    label: "Accent Hover",
    description: "Accent hover.",
  },
  {
    key: "--rx-color-accent-active",
    label: "Accent Active",
    description: "Accent active.",
  },
  { key: "--rx-color-control", label: "Control", description: "Inputs & controls." },
  {
    key: "--rx-color-control-hover",
    label: "Control Hover",
    description: "Control hover.",
  },
  {
    key: "--rx-color-control-active",
    label: "Control Active",
    description: "Control active.",
  },
];

const STATUS_TOKENS: ThemeToken[] = [
  { key: "--rx-color-success", label: "Success", description: "Success state." },
  {
    key: "--rx-color-success-hover",
    label: "Success Hover",
    description: "Success hover.",
  },
  { key: "--rx-color-warning", label: "Warning", description: "Warning state." },
  {
    key: "--rx-color-warning-hover",
    label: "Warning Hover",
    description: "Warning hover.",
  },
  { key: "--rx-color-danger", label: "Danger", description: "Danger state." },
  {
    key: "--rx-color-danger-hover",
    label: "Danger Hover",
    description: "Danger hover.",
  },
  { key: "--rx-color-info", label: "Info", description: "Info state." },
];

const VIZ_TOKENS: ThemeToken[] = [
  { key: "--rx-color-viz-1", label: "Viz 1", description: "Data color 1." },
  { key: "--rx-color-viz-2", label: "Viz 2", description: "Data color 2." },
  { key: "--rx-color-viz-3", label: "Viz 3", description: "Data color 3." },
  { key: "--rx-color-viz-4", label: "Viz 4", description: "Data color 4." },
  { key: "--rx-color-viz-5", label: "Viz 5", description: "Data color 5." },
  { key: "--rx-color-viz-6", label: "Viz 6", description: "Data color 6." },
  { key: "--rx-color-viz-7", label: "Viz 7", description: "Data color 7." },
  { key: "--rx-color-viz-8", label: "Viz 8", description: "Data color 8." },
  {
    key: "--rx-color-viz-positive",
    label: "Viz Positive",
    description: "Positive data.",
  },
  {
    key: "--rx-color-viz-negative",
    label: "Viz Negative",
    description: "Negative data.",
  },
  {
    key: "--rx-color-viz-neutral",
    label: "Viz Neutral",
    description: "Neutral data.",
  },
];

const normalizeRgb = (value: string) => {
  const parts = value
    .trim()
    .split(/\\s+/)
    .map((item) => Number(item));
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  const normalized = parts.slice(0, 3).map((part) => {
    if (part < 0 || part > 255) return null;
    return Math.round(part);
  });
  if (normalized.some((part) => part === null)) {
    return null;
  }
  return normalized.join(" ");
};

const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) {
    return null;
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return null;
  }
  return `${r} ${g} ${b}`;
};

const rgbToHex = (value: string) => {
  const normalized = normalizeRgb(value);
  if (!normalized) {
    return "#000000";
  }
  return `#${normalized
    .split(" ")
    .map((part) => Number(part).toString(16).padStart(2, "0"))
    .join("")}`;
};

export default function ThemeLabPage() {
  const [colors, setColors] = useState<Record<string, string>>({});

  const sections = useMemo(
    () => [
      { title: "Surfaces", tokens: SURFACE_TOKENS },
      { title: "Text", tokens: TEXT_TOKENS },
      { title: "Structure", tokens: STRUCTURE_TOKENS },
      { title: "Interactive", tokens: INTERACTIVE_TOKENS },
      { title: "Status", tokens: STATUS_TOKENS },
      { title: "Visualization", tokens: VIZ_TOKENS },
    ],
    [],
  );

  useEffect(() => {
    const root = document.documentElement;
    const computed = getComputedStyle(root);
    const next: Record<string, string> = {};
    sections.flatMap((section) => section.tokens).forEach((token) => {
      const raw = computed.getPropertyValue(token.key).trim();
      if (raw) {
        next[token.key] = raw;
      }
    });
    setColors(next);
  }, [sections]);

  const updateToken = (token: string, nextValue: string) => {
    setColors((prev) => ({ ...prev, [token]: nextValue }));
    const normalized = normalizeRgb(nextValue);
    if (!normalized) {
      return;
    }
    document.documentElement.style.setProperty(token, normalized);
  };

  const updateTokenFromHex = (token: string, hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) {
      return;
    }
    updateToken(token, rgb);
  };

  const resetOverrides = () => {
    const root = document.documentElement;
    sections.flatMap((section) => section.tokens).forEach((token) => {
      root.style.removeProperty(token.key);
    });
    const computed = getComputedStyle(root);
    const next: Record<string, string> = {};
    sections.flatMap((section) => section.tokens).forEach((token) => {
      const raw = computed.getPropertyValue(token.key).trim();
      if (raw) {
        next[token.key] = raw;
      }
    });
    setColors(next);
  };

  const exportTheme = () => {
    const payload = {
      name: "custom-theme",
      tokens: colors,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rainbow-theme.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Theme Lab</h1>
          <p className="text-sm text-muted-foreground">
            Ajusta los tokens y revisa cómo se ven los elementos primitivos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" tone="neutral" onClick={resetOverrides}>
            Reset preview
          </Button>
          <Button variant="solid" tone="accent" onClick={exportTheme}>
            Export Theme JSON
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.2fr]">
        <Card className="bg-surface/40">
          <div className="flex flex-col gap-6">
            {sections.map((section) => (
              <div key={section.title} className="flex flex-col gap-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-subtle">
                  {section.title}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {section.tokens.map((token) => (
                    <div
                      key={token.key}
                      className="rounded-lg border border-border-subtle/60 bg-surface/50 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {token.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {token.description}
                          </div>
                        </div>
                        <input
                          type="color"
                          value={rgbToHex(colors[token.key] ?? "0 0 0")}
                          onChange={(event) =>
                            updateTokenFromHex(token.key, event.target.value)
                          }
                          className="h-10 w-10 cursor-pointer rounded border border-border bg-transparent"
                        />
                      </div>
                      <div className="mt-3">
                        <Input
                          value={colors[token.key] ?? ""}
                          onChange={(event) =>
                            updateToken(token.key, event.target.value)
                          }
                          placeholder="r g b"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="bg-surface/40">
            <div className="text-sm font-semibold text-foreground">
              Buttons
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="solid" tone="primary">Primary action</Button>
              <Button variant="solid" tone="accent">Accent action</Button>
              <Button variant="solid" tone="success">Success action</Button>
              <Button variant="solid" tone="warning">Warning action</Button>
              <Button variant="solid" tone="danger">Danger action</Button>
              <Button variant="outline" tone="neutral">Secondary</Button>
              <Button variant="ghost" tone="neutral">Ghost</Button>
            </div>
          </Card>

          <Card className="bg-surface/40">
            <div className="text-sm font-semibold text-foreground">
              Inputs & Selects
            </div>
            <div className="mt-4 grid gap-3">
              <Input placeholder="Text input" />
              <SearchInput aria-label="Search resources" placeholder="Search resources..." />
              <Select defaultValue="redis">
                <option value="redis">Redis</option>
                <option value="postgres">Postgres</option>
                <option value="servicebus">Service Bus</option>
              </Select>
            </div>
          </Card>

          <Card className="bg-surface/40">
            <div className="text-sm font-semibold text-foreground">
              Cards & Boundaries
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface/60 p-4">
                <div className="text-xs uppercase tracking-widest text-subtle">
                  Summary
                </div>
                <div className="mt-2 text-lg font-semibold text-foreground">
                  32 resources
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Datos críticos listos para revisar.
                </p>
                <div className="mt-4 flex gap-2">
                  <Button variant="solid" tone="accent">Open</Button>
                  <Button variant="ghost" tone="neutral">Details</Button>
                </div>
              </div>
              <div className="rounded-xl border border-dashed border-border-subtle/70 bg-background/40 p-4 text-xs text-muted-foreground">
                Boundary / drop zone
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
