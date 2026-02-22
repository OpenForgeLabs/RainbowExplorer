"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const THEME_STORAGE_KEY = "rainbow.theme";

export type ThemeId = string;

export type ThemeOption = {
  id: ThemeId;
  label: string;
  description: string;
  cssUrl?: string;
};

const FALLBACK_THEMES: ThemeOption[] = [
  {
    id: "default",
    label: "GitHub Dark",
    description: "GitHub Dark palette adapted for dashboards.",
  },
  {
    id: "dracula",
    label: "Dracula",
    description: "Popular neon-forward open-source theme.",
  },
  {
    id: "nord",
    label: "Nord",
    description: "Arctic-inspired contrast with soft blues.",
  },
  {
    id: "solarized-dark",
    label: "Solarized Dark",
    description: "Balanced contrast for long sessions.",
  },
  {
    id: "gruvbox-dark",
    label: "Gruvbox Dark",
    description: "Warm retro palette with low eye strain.",
  },
  {
    id: "catppuccin-mocha",
    label: "Catppuccin Mocha",
    description: "Soothing pastel palette with modern contrast.",
  },
  {
    id: "one-dark",
    label: "One Dark",
    description: "Classic editor palette from the open-source community.",
  },
];

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const getStoredTheme = (): ThemeId => {
  if (typeof window === "undefined") {
    return "default";
  }
  const stored = sessionStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
  return stored ?? "default";
};

export const loadThemeRegistry = async (): Promise<ThemeOption[]> => {
  if (typeof window === "undefined") {
    return FALLBACK_THEMES;
  }
  try {
    const response = await fetch("/themes/registry.json", { cache: "no-store" });
    if (!response.ok) {
      return FALLBACK_THEMES;
    }
    const data = (await response.json()) as { themes?: ThemeOption[] };
    return data.themes?.length ? data.themes : FALLBACK_THEMES;
  } catch {
    return FALLBACK_THEMES;
  }
};

export const ensureThemeStyles = (cssUrl?: string) => {
  if (!cssUrl || typeof document === "undefined") {
    return;
  }
  const existing = document.querySelector(`link[data-theme-css="${cssUrl}"]`);
  if (existing) {
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = cssUrl;
  link.setAttribute("data-theme-css", cssUrl);
  document.head.appendChild(link);
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("default");

  useEffect(() => {
    setThemeState(getStoredTheme());
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    if (theme === "default") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
    sessionStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (next: ThemeId) => setThemeState(next),
    }),
    [theme],
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
