import fs from "fs/promises";
import os from "os";
import path from "path";
import registryFallback from "../../plugin-registry.json";

export type PluginRegistryEntry = {
  id: string;
  name: string;
  baseUrl: string;
  mountPath?: string;
  defaultPath?: string;
  description?: string;
  enabled?: boolean;
  image?: string;
  hostPort?: number;
  internalPort?: number;
};

export type PluginRegistry = {
  plugins: PluginRegistryEntry[];
};

const fallbackRegistry = registryFallback as PluginRegistry;

export const getPluginRegistryPath = () => {
  const override = process.env.RAINBOW_REGISTRY_PATH;
  if (override) {
    return override;
  }
  return path.join(os.homedir(), ".rainbow", "plugin-registry.json");
};

const ensureRegistryDir = async (filePath: string) => {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
};

export const normalizePluginRegistry = (registry: PluginRegistry): PluginRegistry => {
  return {
    plugins: (registry.plugins ?? [])
      .filter((plugin) => plugin && plugin.id && plugin.baseUrl)
      .map((plugin) => ({
        ...plugin,
        mountPath: plugin.mountPath ?? `/plugins/${plugin.id}`,
        defaultPath: plugin.defaultPath ?? "/",
        enabled: plugin.enabled ?? true,
      })),
  };
};

export const loadLocalPluginRegistry = async (): Promise<PluginRegistry> => {
  const filePath = getPluginRegistryPath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return normalizePluginRegistry(JSON.parse(raw) as PluginRegistry);
  } catch {
    await ensureRegistryDir(filePath);
    const normalized = normalizePluginRegistry(fallbackRegistry);
    await fs.writeFile(
      filePath,
      JSON.stringify(normalized, null, 2),
      "utf8",
    );
    return normalized;
  }
};

export const saveLocalPluginRegistry = async (
  registry: PluginRegistry,
): Promise<PluginRegistry> => {
  const filePath = getPluginRegistryPath();
  await ensureRegistryDir(filePath);
  const normalized = normalizePluginRegistry(registry);
  await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
};

export const loadPluginRegistry = async (): Promise<PluginRegistry> => {
  const registryUrl = process.env.PLUGIN_REGISTRY_URL;
  if (!registryUrl) {
    return loadLocalPluginRegistry();
  }

  try {
    const response = await fetch(registryUrl, { cache: "no-store" });
    if (!response.ok) {
      return loadLocalPluginRegistry();
    }
    const data = (await response.json()) as PluginRegistry;
    return normalizePluginRegistry(data);
  } catch {
    return loadLocalPluginRegistry();
  }
};

export const getPluginById = (registry: PluginRegistry, id: string) =>
  registry.plugins.find((plugin) => plugin.id === id && plugin.enabled !== false);
