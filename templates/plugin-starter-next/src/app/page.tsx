import { Card } from "@openforgelabs/rainbow-ui";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-10">
      <Card>
        <h1 className="text-xl font-semibold text-foreground">Plugin Starter</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is the default root page. Open a connection from the shell to access
          your hosted views.
        </p>
      </Card>
    </main>
  );
}
