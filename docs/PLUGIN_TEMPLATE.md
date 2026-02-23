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

## Required shell registry entry

Add your plugin to shell registry (`apps/shell/plugin-registry.json` or `~/.rainbow/plugin-registry.json`):

```json
{
  "plugins": [
    {
      "id": "my-plugin",
      "name": "My Plugin",
      "baseUrl": "http://localhost:5100",
      "mountPath": "/plugins/my-plugin",
      "defaultPath": "/",
      "description": "My infrastructure plugin",
      "enabled": true
    }
  ]
}
```

## Required plugin endpoints

### Manifest

`GET {baseUrl}{mountPath}/api/plugin-manifest`

- Must return `PluginManifest` from `@openforgelabs/rainbow-contracts`.

### Connection test

`POST {baseUrl}{mountPath}/api/{pluginId}/connections/test`

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

`GET {baseUrl}{mountPath}/api/{pluginId}/connections/summary?name=<connectionName>`

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

## Where to find coherent structure references

Use these repos as the source of truth:
- `RainbowPackages`: design system, contracts, shared packages
  - https://github.com/OpenForgeLabs/RainbowPackages
- `RainbowRedis`: full production plugin example
  - https://github.com/OpenForgeLabs/RainbowRedis
- `RainbowExplorer`: host shell and runtime behavior
  - https://github.com/OpenForgeLabs/RainbowExplorer
