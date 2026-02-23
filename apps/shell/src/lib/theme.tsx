"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  THEME_TOKEN_KEYS,
  normalizeThemeRegistry,
  sanitizeThemeTokens,
  themeRegistrySchema,
  type ThemeDefinition,
  type ThemeId,
  type ThemeRegistry,
} from "@/lib/themeRegistry";

const THEME_STORAGE_KEY = "rainbow.theme.v1";
const DEFAULT_THEME_ID = "github-dark";

type ThemeMessage = {
  type: "theme";
  value: ThemeId;
  tokens?: Record<string, string>;
};

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  themes: ThemeDefinition[];
  resolvedTokens: Record<string, string>;
  reloadThemes: () => Promise<void>;
  createThemeMessage: (themeId?: ThemeId) => ThemeMessage;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const getStoredTheme = (): ThemeId => {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_ID;
  }
  const stored = sessionStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
  return stored ?? DEFAULT_THEME_ID;
};

const clearTokenOverrides = () => {
  const root = document.documentElement;
  for (const key of THEME_TOKEN_KEYS) {
    root.style.removeProperty(key);
  }
};

const resolveThemeTokens = (themeId: ThemeId, registry: ThemeRegistry): Record<string, string> => {
  const byId = new Map(registry.themes.map((item) => [item.id, item]));
  const visited = new Set<string>();

  const walk = (id: string | undefined): Record<string, string> => {
    if (!id || visited.has(id)) {
      return {};
    }
    visited.add(id);
    const current = byId.get(id);
    if (!current) {
      return {};
    }

    const base = walk(current.basedOn);
    const own = sanitizeThemeTokens(current.tokens);
    return { ...base, ...own };
  };

  const requested = byId.has(themeId) ? themeId : DEFAULT_THEME_ID;
  const resolved = walk(requested);

  if (Object.keys(resolved).length > 0) {
    return resolved;
  }

  if (requested !== DEFAULT_THEME_ID) {
    return walk(DEFAULT_THEME_ID);
  }

  return {};
};

const applyTheme = (themeId: ThemeId, registry: ThemeRegistry) => {
  const root = document.documentElement;
  clearTokenOverrides();

  const selected = registry.themes.find((item) => item.id === themeId);
  const activeId = selected?.id ?? DEFAULT_THEME_ID;
  const tokens = resolveThemeTokens(activeId, registry);

  root.setAttribute("data-theme", activeId);
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
};

export const loadThemeRegistry = async (): Promise<ThemeRegistry> => {
  if (typeof window === "undefined") {
    return { themes: [] };
  }

  const response = await fetch("/api/themes/registry", { cache: "no-store" });
  if (!response.ok) {
    return { themes: [] };
  }

  const payload = (await response.json()) as {
    isSuccess?: boolean;
    data?: unknown;
  };
  if (!payload?.isSuccess || !payload.data) {
    return { themes: [] };
  }

  const parsed = themeRegistrySchema.parse(payload.data);
  return normalizeThemeRegistry(parsed);
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [registry, setRegistry] = useState<ThemeRegistry>({ themes: [] });

  const reloadThemes = useCallback(async () => {
    const next = await loadThemeRegistry();
    setRegistry(next);
  }, []);

  useEffect(() => {
    setThemeState(getStoredTheme());
    void reloadThemes();
  }, [reloadThemes]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    if (!registry.themes.length) {
      return;
    }

    applyTheme(theme, registry);
    sessionStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, registry]);

  const resolvedTokens = useMemo(
    () => resolveThemeTokens(theme, registry),
    [theme, registry],
  );

  const createThemeMessage = useCallback(
    (themeId?: ThemeId): ThemeMessage => {
      const nextTheme = themeId ?? theme;
      const tokens = resolveThemeTokens(nextTheme, registry);
      return {
        type: "theme",
        value: nextTheme,
        tokens: Object.keys(tokens).length ? tokens : undefined,
      };
    },
    [theme, registry],
  );

  const value = useMemo(
    () => ({
      theme,
      setTheme: (next: ThemeId) => setThemeState(next),
      themes: registry.themes,
      resolvedTokens,
      reloadThemes,
      createThemeMessage,
    }),
    [theme, registry.themes, resolvedTokens, reloadThemes, createThemeMessage],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
