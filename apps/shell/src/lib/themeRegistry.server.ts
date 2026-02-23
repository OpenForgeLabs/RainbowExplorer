import fs from "fs/promises";
import os from "os";
import path from "path";
import themeRegistryFallback from "../../public/theme-registry.json";
import {
  normalizeThemeRegistry,
  themeRegistrySchema,
  type ThemeDefinition,
  type ThemeRegistry,
} from "@/lib/themeRegistry";

const fallbackRegistry = themeRegistrySchema.parse(themeRegistryFallback) as ThemeRegistry;

const getRegistryPath = () => {
  const override = process.env.RAINBOW_THEME_REGISTRY_PATH;
  if (override) {
    return override;
  }
  return path.join(os.homedir(), ".rainbow", "theme-registry.json");
};

const ensureRegistryDir = async (filePath: string) => {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
};

const withBuiltInFlag = (registry: ThemeRegistry): ThemeRegistry => ({
  themes: registry.themes.map((theme) => ({ ...theme, isBuiltIn: true })),
});

const markBuiltInThemes = (themes: ThemeDefinition[]) => {
  const builtInIds = new Set(fallbackRegistry.themes.map((theme) => theme.id));
  return themes.map((theme) => ({
    ...theme,
    isBuiltIn: builtInIds.has(theme.id),
  }));
};

export const getFallbackThemeRegistry = () => withBuiltInFlag(normalizeThemeRegistry(fallbackRegistry));

export const loadThemeRegistry = async (): Promise<ThemeRegistry> => {
  const filePath = getRegistryPath();
  const fallback = getFallbackThemeRegistry();

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = themeRegistrySchema.parse(JSON.parse(raw));
    const normalized = normalizeThemeRegistry(parsed);
    return { themes: markBuiltInThemes(normalized.themes) };
  } catch {
    await ensureRegistryDir(filePath);
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
};

export const saveThemeRegistry = async (registry: ThemeRegistry): Promise<ThemeRegistry> => {
  const parsed = themeRegistrySchema.parse(registry);
  const normalized = normalizeThemeRegistry(parsed);
  const filePath = getRegistryPath();
  await ensureRegistryDir(filePath);
  await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf8");
  return { themes: markBuiltInThemes(normalized.themes) };
};

export const resetThemeRegistry = async (): Promise<ThemeRegistry> => {
  const fallback = getFallbackThemeRegistry();
  const filePath = getRegistryPath();
  await ensureRegistryDir(filePath);
  await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), "utf8");
  return fallback;
};

export const mergeThemeRegistry = async (incoming: ThemeRegistry): Promise<ThemeRegistry> => {
  const current = await loadThemeRegistry();
  const map = new Map<string, ThemeDefinition>();

  for (const theme of current.themes) {
    map.set(theme.id, { ...theme, isBuiltIn: theme.isBuiltIn ?? false });
  }
  for (const theme of incoming.themes) {
    const previous = map.get(theme.id);
    map.set(theme.id, {
      ...previous,
      ...theme,
      isBuiltIn: previous?.isBuiltIn ?? false,
    });
  }

  return saveThemeRegistry({ themes: Array.from(map.values()) });
};
