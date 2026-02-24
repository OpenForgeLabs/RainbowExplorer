# Rainbow Plugin Starter (Next.js)

Production-oriented starter template to build a new RainbowExplorer plugin quickly.

## Includes
- Plugin manifest endpoint (`/api/plugin-manifest`)
- Connection test endpoint (`/api/starter/connections/test`)
- Optional summary endpoint (`/api/starter/connections/summary`)
- Hosted view route (`/[connectionName]`)
- Theme bridge integration (`HostedThemeBridge`)
- Shell global loader bridge helper (`src/lib/shellLoader.ts`)
- `@openforgelabs/rainbow-ui` usage out of the box

## Quick start

Copy this starter into your own repository:

```bash
cp -R templates/plugin-starter-next /path/to/my-plugin
cd /path/to/my-plugin
pnpm install
pnpm dev
```

## Required convention

- `next.config.ts` uses `basePath = /plugins/<pluginId>`
- `manifest.id` must match `<pluginId>`
- Manifest endpoint must be reachable at `/plugins/<pluginId>/api/plugin-manifest`

Shell runner uses this convention to install plugins from Docker image automatically.

## Register in shell

Preferred path: install from image in shell (`Plugins` page).

Manual registry entry (`~/.rainbow/plugin-registry.json`) is optional for advanced scenarios.

## Important

- Keep semantic token styling only (`rainbow-ui` classes/components).
- Keep manifest/endpoint contracts aligned with `@openforgelabs/rainbow-contracts`.

## Global loader integration

Shell supports a global full-screen loader. This starter includes:

- `src/lib/shellLoader.ts`
- `src/components/ShellLoaderDemoButton.tsx` (usage example)

Use it around long operations:

```ts
import { withShellLoader } from "@/lib/shellLoader";

await withShellLoader(async () => {
  await fetch("/api/my-plugin/heavy-operation");
}, "Loading plugin data...");
```

Message contract sent to shell:

```ts
window.parent.postMessage(
  { type: "shell:loader", active: true, message: "Loading plugin data..." },
  "*",
);
```
