import Link from "next/link";
import { Card } from "@openforgelabs/rainbow-ui";
import { loadPluginRegistry } from "@/lib/pluginRegistry";

export default async function Home() {
  const registry = await loadPluginRegistry();
  const plugins = registry.plugins.filter((plugin) => plugin.enabled !== false);
  const pluginCount = plugins.length;
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            <span className="rounded-full border border-border-dark px-2 py-1">
              Local workspace
            </span>
            <span>{pluginCount} plugins</span>
          </div>
          <h1 className="text-3xl font-semibold text-slate-100">
            RainbowExplorer Dashboard
          </h1>
          <p className="text-sm text-slate-300">
            Conecta recursos, monitorea salud y entra a cada plugin en segundos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/plugins"
            className="inline-flex items-center gap-2 rounded-lg border border-navigate/40 bg-navigate/10 px-4 py-2 text-sm font-semibold text-navigate transition hover:border-navigate/70 hover:bg-navigate/20"
          >
            Ver plugins
          </Link>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-gradient-to-r from-action to-action-strong px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(15,23,42,0.35)] transition hover:from-action-strong hover:to-confirm"
            type="button"
          >
            Nuevo workspace
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-surface-dark/40">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Plugins activos
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">
            {pluginCount}
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Multi-zone dinámico cargando solo lo necesario.
          </p>
        </Card>
        <Card className="bg-surface-dark/40">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Conexiones
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">
            Listas
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Gestiona tus recursos por tipo desde un solo lugar.
          </p>
        </Card>
        <Card className="bg-surface-dark/40">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Estado
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">
            Operativo
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Plugins y shell listos para conectar.
          </p>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
        <Card className="bg-surface-dark/40">
          <div className="mb-4 text-sm font-semibold text-slate-100">
            Plugins habilitados
          </div>
          <div className="flex flex-col gap-3">
            {plugins.map((plugin) => (
              <div
                key={plugin.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-dark bg-surface-dark/50 px-4 py-3 text-sm text-slate-100"
              >
                <div>
                  <div className="font-semibold">{plugin.name}</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {plugin.id}
                  </div>
                </div>
                <a
                  href="/views"
                  className="rounded-lg border border-navigate/40 bg-navigate/10 px-3 py-1.5 text-xs font-semibold text-navigate transition hover:border-navigate/70 hover:bg-navigate/20"
                >
                  Open views
                </a>
              </div>
            ))}
          </div>
        </Card>
        <aside className="flex flex-col gap-4">
          <Card className="bg-surface-dark/40">
            <div className="mb-3 text-sm font-semibold text-slate-100">
              Administra plugins
            </div>
            <p className="text-sm text-slate-400">
              Ve a Connections para agregar recursos. Aquí puedes habilitar o
              deshabilitar plugins desde el registro.
            </p>
            <a
              href="/plugins"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-navigate/40 bg-navigate/10 px-4 py-2 text-xs font-semibold text-navigate transition hover:border-navigate/70 hover:bg-navigate/20"
            >
              Gestionar registry
            </a>
          </Card>
        </aside>
      </section>
    </main>
  );
}
