import { PluginConnectionsPanel } from "@/features/connections/PluginConnectionsPanel";

export default function ConnectionsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <PluginConnectionsPanel />
    </main>
  );
}
