# RainbowExplorer

[![Infrastructure Explorer](https://img.shields.io/badge/Product-Infrastructure%20Explorer-22c55e)](./apps/shell)
[![Plugin Architecture](https://img.shields.io/badge/Architecture-Plugin%20Based-0ea5e9)](#)
[![Self-Hosted](https://img.shields.io/badge/Deployment-Self--Hosted-f59e0b)](#)
[![Donate](https://img.shields.io/badge/Donate-PayPal-00457C?logo=paypal&logoColor=white)](https://paypal.me/JuanTellezRojas)

RainbowExplorer is a **plugin-based infrastructure explorer** for teams that need a modern, extensible way to manage cloud and platform resources.

It is the host shell of the Rainbow ecosystem: one product UI, multiple specialized plugins, shared theming, and consistent UX.

## What this software is
RainbowExplorer is designed as a:
- self-hosted infrastructure operations workspace,
- plugin runtime for internal/dev tools,
- extensible alternative to single-purpose admin UIs.

## Why teams use it
- **Plugin-first**: add or remove capabilities without rewriting the shell.
- **Consistent UX**: shared design system and contracts from RainbowPackages.
- **Local-first and portable**: optimized for developer workflows.
- **Scalable architecture**: shell + plugin model keeps each module decoupled.

## Available plugins

| Plugin | Status | Repository | Notes |
|---|---|---|---|
| **Redis** | ![Stable](https://img.shields.io/badge/Status-Stable-22c55e) | [OpenForgeLabs/RainbowRedis](https://github.com/OpenForgeLabs/RainbowRedis) | DB navigation, key browser, type-specific editors |
| **Service Bus** | ![Under Construction](https://img.shields.io/badge/Status-Under%20Construction-f59e0b) | _TBD_ | Planned module, currently in progress |

## Repository map
- `apps/shell`: main host application.
- `apps/runner`: local plugin runner.
- `~/.rainbow/plugin-registry.json`: installed plugin registry (local workspace).
- `~/.rainbow/connections.json`: connection store.
- `~/.rainbow/theme-registry.json`: theme registry.
- `~/.rainbow/activity-log.json`: activity log.

Related repositories:
- [`OpenForgeLabs/RainbowPackages`](https://github.com/OpenForgeLabs/RainbowPackages): shared UI, contracts, and connections packages.
- [`OpenForgeLabs/RainbowRedis`](https://github.com/OpenForgeLabs/RainbowRedis): Redis plugin implementation.

## Product flow
- **Connections** is the primary operational view.
- **Plugins** is management only (install/enable/runner actions + manifest metadata).
- **Activity** and **Settings** are fixed management areas.
- Theme editor lives at `/settings/themes`.

## Guides
- [Plugin image sources and installation](./docs/PLUGIN_IMAGES.md)
- [How to build a new plugin (template)](./docs/PLUGIN_TEMPLATE.md)
- [Plugin starter project (copy/paste base)](./templates/plugin-starter-next)
- [Theme registry and custom themes](./docs/THEMING.md)

## Development
```bash
pnpm install
pnpm dev:shell
```

Run shell + runner together:
```bash
pnpm dev:all
```

## Plugin registry
By default, the shell reads local `~/.rainbow/plugin-registry.json`.

You can override with a remote registry:

```bash
PLUGIN_REGISTRY_URL=https://example.com/registry.json
```

## Licensing
This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

See the full license text in `LICENSE`.

## Support
If RainbowExplorer helps your team, consider supporting development:

[![PayPal](https://img.shields.io/badge/Donate%20via%20PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/JuanTellezRojas)
