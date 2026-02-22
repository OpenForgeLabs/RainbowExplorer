import { loadPluginRegistry } from "@/lib/pluginRegistry";
import { PluginRegistryToggle } from "@/features/plugins/PluginRegistryToggle";
import { PluginRunnerPanel } from "@/features/plugins/PluginRunnerPanel";

export default async function PluginsPage() {
  const registry = await loadPluginRegistry();
  const plugins = registry.plugins;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Plugins</h1>
        <p className="text-sm text-slate-300">
          Plugins are loaded declaratively from the registry.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {plugins.map((plugin) => {
          const path = plugin.defaultPath ?? "/";
          const mountPath = plugin.mountPath ?? `/plugins/${plugin.id}`;
          const baseUrl = plugin.baseUrl.replace(/\/+$/, "");
          const href = `${baseUrl}${mountPath}${path}`;
          return (
            <div
              key={plugin.id}
              className="rounded-2xl border border-border-dark bg-surface-dark/50 p-5 transition hover:border-action/50"
            >
              <div className="text-lg font-semibold">{plugin.name}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                {plugin.id}
              </div>
              {plugin.description ? (
                <div className="mt-4 text-sm text-slate-300">
                  {plugin.description}
                </div>
              ) : null}
              <div className="mt-4">
                <PluginRegistryToggle
                  pluginId={plugin.id}
                  enabled={plugin.enabled !== false}
                />
              </div>
              <a
                href={href}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border-dark bg-surface-dark px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-action"
              >
                Open
              </a>
            </div>
          );
        })}
      </div>

      <PluginRunnerPanel plugins={plugins} />
    </main>
  );
}
