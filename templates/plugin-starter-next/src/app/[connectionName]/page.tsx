import { Badge, Button, Card } from "@openforgelabs/rainbow-ui";
import { ShellLoaderDemoButton } from "@/components/ShellLoaderDemoButton";

export default async function StarterConnectionPage({
  params,
}: {
  params: Promise<{ connectionName: string }>;
}) {
  const { connectionName } = await params;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-8">
      <div className="flex items-center gap-2">
        <Badge variant="accent">starter</Badge>
        <span className="text-sm text-muted-foreground">{connectionName}</span>
      </div>
      <Card>
        <h1 className="text-2xl font-semibold text-foreground">Starter View</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Replace this screen with your plugin UI.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="solid" tone="primary">Primary Action</Button>
          <Button variant="outline" tone="neutral">Secondary Action</Button>
          <ShellLoaderDemoButton />
        </div>
      </Card>
    </main>
  );
}
