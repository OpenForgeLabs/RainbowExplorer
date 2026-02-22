# RainbowExplorer

Multi-zone Next.js shell + plugin architecture for infrastructure exploration.

## Structure
- `apps/shell`: Shell host (routes `/plugins/*` to plugins).
- `apps/runner`: Local plugin runner (optional).

External repos:
- `rainbow-redis`: Redis plugin.
- `rainbow-packages`: Shared UI + contracts + connections packages.

## Plugin registry
By default, the shell loads `apps/shell/plugin-registry.json`.
You can override with `PLUGIN_REGISTRY_URL` for a remote registry:

```
PLUGIN_REGISTRY_URL=https://example.com/registry.json
```

## Dev
Install dependencies:
```
pnpm install
```

Run shell + plugin:
```
pnpm dev:all
```

Run individually:
```
pnpm dev:shell
pnpm dev:runner
```

## Multi-platform note
The shell is designed to work as a desktop shell in the future (Electron/Tauri),
by running plugins as local processes and proxying `/plugins/*` locally.
