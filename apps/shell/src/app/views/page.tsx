import { headers } from "next/headers";
import type { PluginManifest, ViewDefinition } from "@openforgelabs/rainbow-contracts";
import { loadPluginRegistry } from "@/lib/pluginRegistry";
import { listConnections } from "@openforgelabs/rainbow-connections";
import { ViewsCatalog } from "@/features/views/ViewsCatalog";

type ViewItem = {
  pluginId: string;
  pluginName: string;
  view: ViewDefinition;
  connections: Array<{ name?: string }>;
};

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

export default async function ViewsPage() {
  const headerList = await headers();
  const host = headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${proto}://${host}` : "";
  const registry = await loadPluginRegistry();
  const plugins = registry.plugins.filter((plugin) => plugin.enabled !== false);

  const views: ViewItem[] = [];
  for (const plugin of plugins) {
    const manifest = await fetchManifest(origin, plugin.id);
    if (!manifest?.views?.length) {
      continue;
    }
    const connections = await listConnections(plugin.id);
    for (const view of manifest.views) {
      views.push({
        pluginId: plugin.id,
        pluginName: manifest.name,
        view,
        connections,
      });
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground">
          Plugin Views
        </h1>
        <p className="text-sm text-subtle">
          Accesos directos a vistas publicadas por cada plugin.
        </p>
      </header>

      <ViewsCatalog views={views} />
    </main>
  );
}
