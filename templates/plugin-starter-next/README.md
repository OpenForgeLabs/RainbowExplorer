# Rainbow Plugin Starter (Next.js)

Production-oriented starter template to build a new RainbowExplorer plugin quickly.

## Includes
- Plugin manifest endpoint (`/api/plugin-manifest`)
- Connection test endpoint (`/api/starter/connections/test`)
- Optional summary endpoint (`/api/starter/connections/summary`)
- Hosted view route (`/[connectionName]`)
- Theme bridge integration (`HostedThemeBridge`)
- `@openforgelabs/rainbow-ui` usage out of the box

## Quick start

Copy this starter into your own repository:

```bash
cp -R templates/plugin-starter-next /path/to/my-plugin
cd /path/to/my-plugin
pnpm install
pnpm dev
```

## Register in shell

Add your plugin entry in shell registry (`apps/shell/plugin-registry.json` or `~/.rainbow/plugin-registry.json`):

```json
{
  "id": "starter",
  "name": "Starter Plugin",
  "baseUrl": "http://localhost:3000",
  "mountPath": "/plugins/starter",
  "enabled": true
}
```

Then open RainbowExplorer and configure a connection for your plugin.

## Important

- Keep semantic token styling only (`rainbow-ui` classes/components).
- Keep manifest/endpoint contracts aligned with `@openforgelabs/rainbow-contracts`.
