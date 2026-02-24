# Plugin Template Guide

This guide defines how to create a new plugin that is fully compatible with RainbowExplorer.

## Golden rules

1. **Use Rainbow Design System components**
- Build UI using `@openforgelabs/rainbow-ui`.
- Use semantic token classes only.
- Do not hardcode colors.

2. **Follow shared contracts from RainbowPackages**
- Use `@openforgelabs/rainbow-contracts` for manifest types.
- Keep payload shapes consistent (`isSuccess`, `message`, `reasons`, `data`).

3. **Keep plugin shell-compatible**
- Expose plugin manifest endpoint.
- Expose connection test endpoint.
- Expose view routes referenced by manifest.

## Fastest path: copy the real starter

Use the ready-to-run template in this repo:

```txt
templates/plugin-starter-next
```

Copy/paste start command:

```bash
cp -R templates/plugin-starter-next /path/to/my-plugin
cd /path/to/my-plugin
pnpm install
pnpm dev
```

Then rename and adjust:
- manifest `id`/`name`
- routes under `src/app/api/<pluginId>/...`
- `next.config.ts` `basePath`

## Base path convention (mandatory)

Rainbow shell runner resolves plugin metadata from image + manifest using this convention:

- Plugin base path: `/plugins/<pluginId>`
- Manifest URL: `/plugins/<pluginId>/api/plugin-manifest`

This means:
1. `next.config.ts` `basePath` must match `/plugins/<pluginId>`
2. `manifest.id` must equal `<pluginId>`

If these values diverge, plugin installation from Docker image will fail by design.

## Installation in shell

Preferred flow:
1. Open **Plugins** in shell.
2. Paste Docker image.
3. Shell runner pulls image, starts container, validates manifest, and writes registry entry automatically.

Manual registry edit is still possible (`~/.rainbow/plugin-registry.json`) but not required for normal workflows.

## Required plugin endpoints

### Manifest

`GET {baseUrl}/plugins/{pluginId}/api/plugin-manifest`

- Must return `PluginManifest` from `@openforgelabs/rainbow-contracts`.

### Connection test

`POST {baseUrl}/plugins/{pluginId}/api/{pluginId}/connections/test`

Expected response shape:

```json
{
  "isSuccess": true,
  "message": "Connection ok",
  "reasons": [],
  "data": {}
}
```

### Optional connection summary

`GET {baseUrl}/plugins/{pluginId}/api/{pluginId}/connections/summary?name=<connectionName>`

Useful to show status/metadata in shell connection cards.

## Manifest reference

Minimal example:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "description": "Example plugin",
  "connections": {
    "summaryEndpoint": "api/my-plugin/connections/summary?name={connectionName}",
    "openConnectionPath": "/{connectionName}",
    "schema": {
      "title": "Add My Plugin Connection",
      "description": "Configure connection",
      "fields": [
        { "id": "name", "label": "Display Name", "type": "text", "required": true }
      ]
    }
  },
  "views": [
    {
      "id": "overview",
      "title": "Overview",
      "route": "/{connectionName}",
      "icon": "insights",
      "type": "iframe"
    }
  ]
}
```

## Theme compatibility (mandatory)

Plugins are hosted in iframes and receive theme through:
- query param `?theme=<themeId>`
- postMessage theme updates

Use `HostedThemeBridge` from `@openforgelabs/rainbow-ui` in plugin layout.

## Global loader bridge (recommended)

Shell now supports a global full-screen loader that plugins can trigger during long operations.

Message shape:

```ts
window.parent.postMessage(
  {
    type: "shell:loader",
    active: true,
    message: "Loading plugin data...",
  },
  "*",
);
```

Stop it with:

```ts
window.parent.postMessage({ type: "shell:loader", active: false }, "*");
```

For concurrency-safe usage, use the helper included in the starter template:

- `templates/plugin-starter-next/src/lib/shellLoader.ts`
- `templates/plugin-starter-next/src/components/ShellRouteLoaderBridge.tsx`

Example:

```ts
import { withShellLoader } from "@/lib/shellLoader";

await withShellLoader(async () => {
  await fetch("/api/my-plugin/heavy-operation");
}, "Loading plugin data...");
```

For route transitions inside the plugin iframe, mount the route bridge in plugin layout:

```tsx
import { ShellRouteLoaderBridge } from "@/components/ShellRouteLoaderBridge";

<HostedThemeBridge allowedOrigins={[process.env.NEXT_PUBLIC_SHELL_ORIGIN ?? "http://localhost:3000"]} />
<ShellRouteLoaderBridge />
{children}
```

## Where to find coherent structure references

Use these repos as the source of truth:
- `RainbowPackages`: design system, contracts, shared packages
  - https://github.com/OpenForgeLabs/RainbowPackages
- `RainbowRedis`: full production plugin example
  - https://github.com/OpenForgeLabs/RainbowRedis
- `RainbowExplorer`: host shell and runtime behavior
  - https://github.com/OpenForgeLabs/RainbowExplorer
