import { redirect } from "next/navigation";
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

  const baseUrl = plugin?.baseUrl ?? "";
  const mountPath = plugin?.mountPath ?? `/plugins/${pluginId}`;
  const target = `${baseUrl}${mountPath}`;
  redirect(target);
}
