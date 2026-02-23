import { PluginConnectionsPanel } from "@/features/connections/PluginConnectionsPanel";

export default function ConnectionsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Connections</h1>
        <p className="text-sm text-subtle">
          Manage resource connections across all enabled plugins.
        </p>
      </header>
      <PluginConnectionsPanel />
    </main>
  );
}
