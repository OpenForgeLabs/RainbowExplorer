import { z } from "zod";

export type ThemeId = string;

export type ThemeToken = {
  key: string;
  label: string;
  description: string;
};

export const THEME_TOKEN_SECTIONS: Array<{ title: string; tokens: ThemeToken[] }> = [
  {
    title: "Surfaces",
    tokens: [
      { key: "--rx-color-bg", label: "Background", description: "App background." },
      { key: "--rx-color-surface", label: "Surface", description: "Primary surface." },
      { key: "--rx-color-surface-2", label: "Surface 2", description: "Secondary surface." },
      { key: "--rx-color-surface-3", label: "Surface 3", description: "Tertiary surface." },
      { key: "--rx-color-overlay", label: "Overlay", description: "Modal overlays." },
      { key: "--rx-color-elevated", label: "Elevated", description: "Floating panels." },
    ],
  },
  {
    title: "Text",
    tokens: [
      { key: "--rx-color-text", label: "Text", description: "Primary text." },
      { key: "--rx-color-text-muted", label: "Text Muted", description: "Secondary text." },
      { key: "--rx-color-text-subtle", label: "Text Subtle", description: "Tertiary text." },
      { key: "--rx-color-text-inverse", label: "Text Inverse", description: "Text on dark." },
      { key: "--rx-color-text-on-primary", label: "Text on Primary", description: "Text on primary actions." },
      { key: "--rx-color-text-on-accent", label: "Text on Accent", description: "Text on accent actions." },
      { key: "--rx-color-text-on-danger", label: "Text on Danger", description: "Text on danger actions." },
      { key: "--rx-color-text-on-success", label: "Text on Success", description: "Text on success actions." },
      { key: "--rx-color-text-on-warning", label: "Text on Warning", description: "Text on warning actions." },
    ],
  },
  {
    title: "Structure",
    tokens: [
      { key: "--rx-color-border", label: "Border", description: "Default borders." },
      { key: "--rx-color-border-subtle", label: "Border Subtle", description: "Low-contrast borders." },
      { key: "--rx-color-border-strong", label: "Border Strong", description: "High-contrast borders." },
      { key: "--rx-color-divider", label: "Divider", description: "Hairline dividers." },
      { key: "--rx-color-ring", label: "Ring", description: "Focus rings." },
      { key: "--rx-color-focus", label: "Focus", description: "Keyboard focus." },
    ],
  },
  {
    title: "Interactive",
    tokens: [
      { key: "--rx-color-primary", label: "Primary", description: "Primary action." },
      { key: "--rx-color-primary-hover", label: "Primary Hover", description: "Primary hover." },
      { key: "--rx-color-primary-active", label: "Primary Active", description: "Primary active." },
      { key: "--rx-color-accent", label: "Accent", description: "Accent action." },
      { key: "--rx-color-accent-hover", label: "Accent Hover", description: "Accent hover." },
      { key: "--rx-color-accent-active", label: "Accent Active", description: "Accent active." },
      { key: "--rx-color-control", label: "Control", description: "Inputs & controls." },
      { key: "--rx-color-control-hover", label: "Control Hover", description: "Control hover." },
      { key: "--rx-color-control-active", label: "Control Active", description: "Control active." },
    ],
  },
  {
    title: "Status",
    tokens: [
      { key: "--rx-color-success", label: "Success", description: "Success state." },
      { key: "--rx-color-success-hover", label: "Success Hover", description: "Success hover." },
      { key: "--rx-color-warning", label: "Warning", description: "Warning state." },
      { key: "--rx-color-warning-hover", label: "Warning Hover", description: "Warning hover." },
      { key: "--rx-color-danger", label: "Danger", description: "Danger state." },
      { key: "--rx-color-danger-hover", label: "Danger Hover", description: "Danger hover." },
      { key: "--rx-color-info", label: "Info", description: "Info state." },
    ],
  },
  {
    title: "Visualization",
    tokens: [
      { key: "--rx-color-viz-1", label: "Viz 1", description: "Data color 1." },
      { key: "--rx-color-viz-2", label: "Viz 2", description: "Data color 2." },
      { key: "--rx-color-viz-3", label: "Viz 3", description: "Data color 3." },
      { key: "--rx-color-viz-4", label: "Viz 4", description: "Data color 4." },
      { key: "--rx-color-viz-5", label: "Viz 5", description: "Data color 5." },
      { key: "--rx-color-viz-6", label: "Viz 6", description: "Data color 6." },
      { key: "--rx-color-viz-7", label: "Viz 7", description: "Data color 7." },
      { key: "--rx-color-viz-8", label: "Viz 8", description: "Data color 8." },
      { key: "--rx-color-viz-positive", label: "Viz Positive", description: "Positive data." },
      { key: "--rx-color-viz-negative", label: "Viz Negative", description: "Negative data." },
      { key: "--rx-color-viz-neutral", label: "Viz Neutral", description: "Neutral data." },
    ],
  },
];

export const THEME_TOKEN_KEYS = THEME_TOKEN_SECTIONS.flatMap((section) =>
  section.tokens.map((token) => token.key),
);

const tokenShape = Object.fromEntries(
  THEME_TOKEN_KEYS.map((key) => [key, z.string().regex(/^\d{1,3}\s+\d{1,3}\s+\d{1,3}$/)]),
) as Record<string, z.ZodString>;

export const themeTokensSchema = z.object(tokenShape).strict().partial();

export const themeDefinitionSchema = z
  .object({
    id: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
    label: z.string().min(1).max(120),
    description: z.string().min(1).max(300),
    basedOn: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/).optional(),
    tokens: themeTokensSchema.optional(),
    isBuiltIn: z.boolean().optional(),
  })
  .strict();

export const themeRegistrySchema = z
  .object({
    themes: z.array(themeDefinitionSchema),
  })
  .strict();

export type ThemeDefinition = z.infer<typeof themeDefinitionSchema>;
export type ThemeRegistry = z.infer<typeof themeRegistrySchema>;

export const sanitizeThemeTokens = (
  tokens: Record<string, string | undefined> | undefined,
): Record<string, string> => {
  const normalizedTokens: Record<string, string> = {};

  for (const [key, value] of Object.entries(tokens ?? {})) {
    if (typeof value !== "string") {
      continue;
    }
    const parts = value
      .trim()
      .split(/\s+/)
      .map((part) => Number(part));
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
      continue;
    }
    normalizedTokens[key] = parts.map((part) => Math.round(part)).join(" ");
  }

  return normalizedTokens;
};

export const normalizeThemeRegistry = (registry: ThemeRegistry): ThemeRegistry => {
  const seen = new Set<string>();
  const themes: ThemeDefinition[] = [];

  for (const rawTheme of registry.themes) {
    if (seen.has(rawTheme.id)) {
      continue;
    }
    seen.add(rawTheme.id);

    const normalizedTokens = sanitizeThemeTokens(rawTheme.tokens);

    themes.push({
      ...rawTheme,
      basedOn: rawTheme.basedOn ?? undefined,
      isBuiltIn: rawTheme.isBuiltIn ?? false,
      tokens: Object.keys(normalizedTokens).length ? normalizedTokens : undefined,
    });
  }

  return { themes };
};

export const rgbToHex = (value: string) => {
  const parts = value
    .trim()
    .split(/\s+/)
    .map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return "#000000";
  }
  return `#${parts
    .map((part) => Math.max(0, Math.min(255, Math.round(part))).toString(16).padStart(2, "0"))
    .join("")}`;
};

export const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) {
    return null;
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some((value) => Number.isNaN(value))) {
    return null;
  }
  return `${r} ${g} ${b}`;
};
