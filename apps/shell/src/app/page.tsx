import Link from "next/link";
import { Button, Card } from "@openforgelabs/rainbow-ui";
import { loadPluginRegistry } from "@/lib/pluginRegistry";

export default async function Home() {
  const registry = await loadPluginRegistry();
  const plugins = registry.plugins.filter((plugin) => plugin.enabled !== false);
  const pluginCount = plugins.length;
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-subtle">
            <span className="rounded-full border border-border bg-surface-2 px-2 py-1 text-foreground">
              Local workspace
            </span>
            <span>{pluginCount} plugins</span>
          </div>
          <h1 className="text-3xl font-semibold text-foreground">
            RainbowExplorer Dashboard
          </h1>
          <p className="text-sm text-subtle">
            Conecta recursos, monitorea salud y entra a cada plugin en segundos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/plugins"
            className="inline-flex h-10 items-center justify-center rounded-[var(--rx-radius-md)] border border-transparent bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-[var(--rx-shadow-sm)] transition hover:bg-accent-hover"
          >
            Ver plugins
          </Link>
          <Button type="button" variant="solid" tone="primary">
            Nuevo workspace
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-surface-2">
          <div className="text-xs uppercase tracking-[0.2em] text-subtle">
            Plugins activos
          </div>
          <div className="mt-2 text-2xl font-semibold text-foreground">
            {pluginCount}
          </div>
          <p className="mt-2 text-sm text-subtle">
            Multi-zone dinámico cargando solo lo necesario.
          </p>
        </Card>
        <Card className="bg-surface-2">
          <div className="text-xs uppercase tracking-[0.2em] text-subtle">
            Conexiones
          </div>
          <div className="mt-2 text-2xl font-semibold text-foreground">
            Listas
          </div>
          <p className="mt-2 text-sm text-subtle">
            Gestiona tus recursos por tipo desde un solo lugar.
          </p>
        </Card>
        <Card className="bg-surface-2">
          <div className="text-xs uppercase tracking-[0.2em] text-subtle">
            Estado
          </div>
          <div className="mt-2 text-2xl font-semibold text-foreground">
            Operativo
          </div>
          <p className="mt-2 text-sm text-subtle">
            Plugins y shell listos para conectar.
          </p>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
        <Card>
          <div className="mb-4 text-sm font-semibold text-foreground">
            Plugins habilitados
          </div>
          <div className="flex flex-col gap-3">
            {plugins.map((plugin) => (
              <div
                key={plugin.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-foreground shadow-[var(--rx-shadow-xs)]"
              >
                <div>
                  <div className="font-semibold">{plugin.name}</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-subtle">
                    {plugin.id}
                  </div>
                </div>
                <Link
                  href="/views"
                  className="inline-flex h-8 items-center justify-center rounded-[var(--rx-radius-md)] border border-transparent bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-[var(--rx-shadow-sm)] transition hover:bg-primary-hover"
                >
                  Open views
                </Link>
              </div>
            ))}
          </div>
        </Card>
        <aside className="flex flex-col gap-4">
          <Card className="bg-surface-2">
            <div className="mb-3 text-sm font-semibold text-foreground">
              Administra plugins
            </div>
            <p className="text-sm text-subtle">
              Ve a Connections para agregar recursos. Aquí puedes habilitar o
              deshabilitar plugins desde el registro.
            </p>
            <Link
              href="/plugins"
              className="mt-4 inline-flex h-8 items-center justify-center rounded-[var(--rx-radius-md)] border border-transparent bg-accent px-3 text-xs font-semibold text-accent-foreground shadow-[var(--rx-shadow-sm)] transition hover:bg-accent-hover"
            >
              Gestionar registry
            </Link>
          </Card>
        </aside>
      </section>
    </main>
  );
}
