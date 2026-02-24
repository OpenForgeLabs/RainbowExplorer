"use client";

import { useState } from "react";
import { Button } from "@openforgelabs/rainbow-ui";
import { withShellLoader } from "@/lib/shellLoader";

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

export function ShellLoaderDemoButton() {
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="outline"
      tone="neutral"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await withShellLoader(async () => {
            await wait(1500);
          }, "Loading plugin data...");
        } finally {
          setBusy(false);
        }
      }}
    >
      Simulate global loader
    </Button>
  );
}
