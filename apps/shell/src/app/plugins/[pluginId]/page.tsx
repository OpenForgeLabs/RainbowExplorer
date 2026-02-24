import { redirect } from "next/navigation";
import type { PluginManifest } from "@openforgelabs/rainbow-contracts";
import { getPluginById, loadPluginRegistry } from "@/lib/pluginRegistry";

type PluginRedirectPageProps = {
  params: Promise<{ pluginId: string }>;
};

export default async function PluginRedirectPage({ params }: PluginRedirectPageProps) {
  const { pluginId } = await params;
  const registry = await loadPluginRegistry();
  const plugin = getPluginById(registry, pluginId);

  if (!plugin) {
    redirect("/plugins");
  }

  const mountPath = plugin.mountPath ?? `/plugins/${pluginId}`;
  const manifestUrl = `${plugin.baseUrl.replace(/\/+$/, "")}${mountPath}/api/plugin-manifest`;

  try {
    const manifestResponse = await fetch(manifestUrl, { cache: "no-store" });
    if (manifestResponse.ok) {
      const manifest = (await manifestResponse.json()) as PluginManifest;
      const firstView = manifest.views?.[0];
      if (firstView?.id) {
        redirect(`/views/${pluginId}/${firstView.id}`);
      }
    }
  } catch {
    // Fall back to listing page below when manifest is not reachable.
  }

  redirect("/plugins");
}
