# RainbowExplorer

[![Shell](https://img.shields.io/badge/App-Shell-22c55e)](./apps/shell)
[![Plugins](https://img.shields.io/badge/Architecture-Plugin%20Host-0ea5e9)](#)
[![Donate](https://img.shields.io/badge/Donate-PayPal-00457C?logo=paypal&logoColor=white)](https://paypal.me/JuanTellezRojas)

RainbowExplorer is the host shell for the Rainbow plugin ecosystem.

It lets you load infrastructure plugins in iframes with shared theming and contracts, so each plugin can evolve independently while preserving a cohesive UX.

## Core ideas
- Shell-first architecture with pluggable views.
- Shared design system and contracts from `rainbow-packages`.
- Local-first workflows for developers and operators.

## Repository map
- `apps/shell`: main host application.
- `apps/runner`: local plugin runner.
- `plugin-registry.json`: plugin discovery source.

Related repos:
- `rainbow-packages`: UI/Contracts/Connections packages.
- `rainbow-redis`: Redis plugin implementation.

## Development
```bash
pnpm install
pnpm dev:shell
```

Run shell + runner:
```bash
pnpm dev:all
```

## Plugin registry
By default, the shell reads local `plugin-registry.json`.
You can override with:

```bash
PLUGIN_REGISTRY_URL=https://example.com/registry.json
```

## Licensing
This project is **source-available** under the PolyForm Noncommercial 1.0.0 license.

Commercial usage is not allowed without a separate commercial agreement.
See `LICENSE` for details.

## Support
If RainbowExplorer helps your team, consider supporting development:

[![PayPal](https://img.shields.io/badge/Donate%20via%20PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/JuanTellezRojas)
