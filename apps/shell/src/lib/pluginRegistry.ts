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
};

export type PluginRegistry = {
  plugins: PluginRegistryEntry[];
};

const fallbackRegistry = registryFallback as PluginRegistry;

const getRegistryPath = () => {
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

const loadLocalRegistry = async (): Promise<PluginRegistry> => {
  const filePath = getRegistryPath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as PluginRegistry;
  } catch {
    await ensureRegistryDir(filePath);
    await fs.writeFile(
      filePath,
      JSON.stringify(fallbackRegistry, null, 2),
      "utf8",
    );
    return fallbackRegistry;
  }
};

const normalizeRegistry = (registry: PluginRegistry): PluginRegistry => {
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

export const loadPluginRegistry = async (): Promise<PluginRegistry> => {
  const registryUrl = process.env.PLUGIN_REGISTRY_URL;
  if (!registryUrl) {
    const local = await loadLocalRegistry();
    return normalizeRegistry(local);
  }

  try {
    const response = await fetch(registryUrl, { cache: "no-store" });
    if (!response.ok) {
      const local = await loadLocalRegistry();
      return normalizeRegistry(local);
    }
    const data = (await response.json()) as PluginRegistry;
    return normalizeRegistry(data);
  } catch {
    const local = await loadLocalRegistry();
    return normalizeRegistry(local);
  }
};

export const getPluginById = (registry: PluginRegistry, id: string) =>
  registry.plugins.find((plugin) => plugin.id === id && plugin.enabled !== false);
