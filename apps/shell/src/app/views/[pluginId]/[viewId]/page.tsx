import type { PluginManifest } from "@openforgelabs/rainbow-contracts";
import { headers } from "next/headers";
import { loadPluginRegistry } from "@/lib/pluginRegistry";
import { HostedViewFrame } from "@/features/views/HostedViewFrame";

type ViewPageProps = {
  params: Promise<{ pluginId: string; viewId: string }>;
  searchParams: Promise<{ conn?: string }>;
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

export default async function ViewPage({ params, searchParams }: ViewPageProps) {
  const { pluginId, viewId } = await params;
  const { conn } = await searchParams;
  const headerList = await headers();
  const host = headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${proto}://${host}` : "";
  const registry = await loadPluginRegistry();
  const plugin = registry.plugins.find((item) => item.id === pluginId);
  const manifest = await fetchManifest(origin, pluginId);
  const view = manifest?.views?.find((item) => item.id === viewId);

  if (!plugin || !manifest || !view) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-10">
        <h1 className="text-2xl font-semibold text-foreground">
          Vista no encontrada
        </h1>
        <p className="text-sm text-subtle">
          El plugin o la vista solicitada no está disponible.
        </p>
      </main>
    );
  }

  const base = plugin.baseUrl.replace(/\/+$/, "");
  const mountPath = plugin.mountPath ?? `/plugins/${plugin.id}`;
  const connectionName = conn ?? "Docker";
  const route = view.route.replace(
    "{connectionName}",
    encodeURIComponent(connectionName),
  );
  const src = `${base}${mountPath}${route}`;

  return (
    <main className="flex min-h-[calc(100dvh-64px)] flex-1 flex-col px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {view.title}
          </h1>
          <p className="text-xs text-subtle">
            {manifest.name} · Hosted View
          </p>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden rounded-xl border border-border bg-surface">
        <HostedViewFrame
          title={`${manifest.name} ${view.title}`}
          srcBase={src}
        />
      </div>
    </main>
  );
}
