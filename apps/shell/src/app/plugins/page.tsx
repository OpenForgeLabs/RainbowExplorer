import { headers } from "next/headers";
import type { PluginManifest } from "@openforgelabs/rainbow-contracts";
import { loadPluginRegistry } from "@/lib/pluginRegistry";
import { PluginRegistryWorkspace } from "@/features/plugins/PluginRegistryWorkspace";

const fetchManifest = async (origin: string, pluginId: string) => {
  const response = await fetch(
    `${origin}/api/plugins/${pluginId}/proxy/api/plugin-manifest`,
    {
      cache: "no-store",
    },
  );
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as PluginManifest;
};

export default async function PluginsPage() {
  const registry = await loadPluginRegistry();
  const plugins = registry.plugins;

  const headerList = await headers();
  const host = headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${proto}://${host}` : "";

  const initialItems = await Promise.all(
    plugins.map(async (plugin) => ({
      plugin,
      manifest: await fetchManifest(origin, plugin.id),
    })),
  );

  return <PluginRegistryWorkspace initialItems={initialItems} />;
}
