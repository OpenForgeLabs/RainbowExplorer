import type { NextConfig } from "next";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const appRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appRoot, "../..");
const registryPath = resolve(appRoot, "plugin-registry.json");

type PluginRegistry = {
  plugins?: Array<{
    id: string;
    baseUrl: string;
    mountPath?: string;
  }>;
};

const loadLocalRegistry = (): PluginRegistry => {
  try {
    const raw = readFileSync(registryPath, "utf-8");
    return JSON.parse(raw) as PluginRegistry;
  } catch {
    return { plugins: [] };
  }
};

const buildRewrites = () => {
  const registry = loadLocalRegistry();
  const plugins = registry.plugins ?? [];
  return plugins
    .filter((plugin) => plugin?.id && plugin?.baseUrl)
    .flatMap((plugin) => {
      const mountPath = plugin.mountPath ?? `/plugins/${plugin.id}`;
      const base = plugin.baseUrl.replace(/\/+$/, "");
      const target = `${base}${mountPath}`;
      return [
        { source: mountPath, destination: target },
        { source: `${mountPath}/:path*`, destination: `${target}/:path*` },
      ];
    });
};

const nextConfig: NextConfig = {
  turbopack: {
    root: repoRoot,
  },
  transpilePackages: [
    "@openforgelabs/rainbow-ui",
    "@openforgelabs/rainbow-connections",
    "@openforgelabs/rainbow-contracts",
  ],
  async rewrites() {
    return [
      {
        source: "/plugins/:pluginId/:path*",
        destination: "/api/plugins/:pluginId/proxy/:path*",
      },
      ...buildRewrites(),
    ];
  },
};

export default nextConfig;
