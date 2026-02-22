"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, SearchInput, Select } from "@openforgelabs/rainbow-ui";

type ThemeToken = {
  key: string;
  label: string;
  description: string;
};

const BASE_TOKENS: ThemeToken[] = [
  { key: "--rx-background", label: "Background", description: "App background." },
  { key: "--rx-surface", label: "Surface", description: "Primary surface." },
  { key: "--rx-surface-2", label: "Surface 2", description: "Secondary surface." },
  { key: "--rx-border", label: "Border", description: "Default border." },
  { key: "--rx-border-strong", label: "Border Strong", description: "Emphasis border." },
  { key: "--rx-control", label: "Control", description: "Inputs & controls." },
  { key: "--rx-control-hover", label: "Control Hover", description: "Hover state." },
  { key: "--rx-foreground", label: "Foreground", description: "Base text color." },
];

const PALETTE_TOKENS: ThemeToken[] = [
  { key: "--rx-palette-1", label: "Palette 1", description: "Primary accent." },
  { key: "--rx-palette-2", label: "Palette 2", description: "Secondary accent." },
  { key: "--rx-palette-3", label: "Palette 3", description: "Navigation accent." },
  { key: "--rx-palette-4", label: "Palette 4", description: "Confirm accent." },
  { key: "--rx-palette-5", label: "Palette 5", description: "Warning accent." },
];

const CONTEXT_TOKENS: ThemeToken[] = [
  { key: "--rx-action", label: "Action", description: "Primary CTA." },
  { key: "--rx-action-strong", label: "Action Strong", description: "CTA gradient." },
  { key: "--rx-navigate", label: "Navigate", description: "Links / routing." },
  { key: "--rx-navigate-strong", label: "Navigate Strong", description: "Navigate gradient." },
  { key: "--rx-confirm", label: "Confirm", description: "Success actions." },
  { key: "--rx-confirm-strong", label: "Confirm Strong", description: "Confirm gradient." },
  { key: "--rx-tag", label: "Tag", description: "Chips / tags." },
  { key: "--rx-danger", label: "Danger", description: "Destructive actions." },
  { key: "--rx-warning", label: "Warning", description: "Warnings." },
  { key: "--rx-success", label: "Success", description: "Success." },
];

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
  const parts = value
    .trim()
    .split(/\\s+/)
    .map((item) => Number(item));
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) {
    return "#000000";
  }
  return `#${parts
    .slice(0, 3)
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("")}`;
};

export default function ThemeLabPage() {
  const [colors, setColors] = useState<Record<string, string>>({});

  const sections = useMemo(
    () => [
      { title: "Base", tokens: BASE_TOKENS },
      { title: "Palette", tokens: PALETTE_TOKENS },
      { title: "Context", tokens: CONTEXT_TOKENS },
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
        next[token.key] = rgbToHex(raw);
      }
    });
    setColors(next);
  }, [sections]);

  const updateToken = (token: string, hex: string) => {
    setColors((prev) => ({ ...prev, [token]: hex }));
    const rgb = hexToRgb(hex);
    if (!rgb) {
      return;
    }
    document.documentElement.style.setProperty(token, rgb);
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
        next[token.key] = rgbToHex(raw);
      }
    });
    setColors(next);
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Theme Lab</h1>
          <p className="text-sm text-slate-400">
            Ajusta la paleta y revisa cómo se ven los elementos primitivos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={resetOverrides}>
            Reset overrides
          </Button>
          <Button variant="action">Guardar preset</Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.2fr]">
        <Card className="bg-surface-dark/40">
          <div className="flex flex-col gap-6">
            {sections.map((section) => (
              <div key={section.title} className="flex flex-col gap-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {section.title}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {section.tokens.map((token) => (
                    <div
                      key={token.key}
                      className="rounded-lg border border-border-dark/60 bg-surface-dark/50 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-slate-100">
                            {token.label}
                          </div>
                          <div className="text-xs text-slate-400">
                            {token.description}
                          </div>
                        </div>
                        <input
                          type="color"
                          value={colors[token.key] ?? "#000000"}
                          onChange={(event) =>
                            updateToken(token.key, event.target.value)
                          }
                          className="h-10 w-10 cursor-pointer rounded border border-border-dark bg-transparent"
                        />
                      </div>
                      <div className="mt-3">
                        <Input
                          value={colors[token.key] ?? ""}
                          onChange={(event) =>
                            updateToken(token.key, event.target.value)
                          }
                          placeholder="#RRGGBB"
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
          <Card className="bg-surface-dark/40">
            <div className="text-sm font-semibold text-slate-100">
              Buttons
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="action">Primary action</Button>
              <Button variant="navigate">Navigate</Button>
              <Button variant="confirm">Confirm</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </Card>

          <Card className="bg-surface-dark/40">
            <div className="text-sm font-semibold text-slate-100">
              Inputs & Selects
            </div>
            <div className="mt-4 grid gap-3">
              <Input placeholder="Text input" />
              <SearchInput placeholder="Search resources..." />
              <Select defaultValue="redis">
                <option value="redis">Redis</option>
                <option value="postgres">Postgres</option>
                <option value="servicebus">Service Bus</option>
              </Select>
            </div>
          </Card>

          <Card className="bg-surface-dark/40">
            <div className="text-sm font-semibold text-slate-100">
              Cards & Boundaries
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border-dark bg-surface-dark/60 p-4">
                <div className="text-xs uppercase tracking-widest text-slate-500">
                  Summary
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-100">
                  32 resources
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Datos críticos listos para revisar.
                </p>
                <div className="mt-4 flex gap-2">
                  <Button variant="navigate">Open</Button>
                  <Button variant="ghost">Details</Button>
                </div>
              </div>
              <div className="rounded-xl border border-dashed border-border-dark/70 bg-background/40 p-4 text-xs text-slate-400">
                Boundary / drop zone
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
