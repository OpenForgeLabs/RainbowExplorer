# Theme Registry Guide

RainbowExplorer uses a **theme registry** model. Themes are not hardcoded in code at runtime.

## Where themes are stored

### Built-in fallback
- `apps/shell/public/theme-registry.json`

### User-local registry (preferred)
- `~/.rainbow/theme-registry.json`

The shell reads local registry first and falls back to built-ins when needed.

## How to create a new theme

1. Open the **Themes** page in the shell.
2. Click **Create theme**.
3. Edit metadata (`id`, `label`, `description`, `basedOn`).
4. Edit token values visually (or switch to JSON mode).
5. Save.

## Import and export

From the Themes page you can:
- Export current registry as `rainbow-theme-registry.json`.
- Import a shared registry JSON.
- Merge imported themes by `id`.

This makes community theme sharing easy.

## Token format

All color tokens use RGB triplets:

```txt
"--rx-color-primary": "96 181 255"
```

Do not use hex in the registry file.

## Required token families

- Surfaces
- Text
- Structure
- Interactive
- Status
- Visualization

See `apps/shell/src/lib/themeRegistry.ts` for canonical token keys.

## Reset behavior

- **Reset registry** restores built-in themes.
- Built-in themes are marked and cannot be removed directly.

## Plugin theming

Hosted plugins receive theme via:
- query string `?theme=<id>`
- `postMessage({ type: "theme", value })`

Plugins should apply this value by setting `data-theme` on `document.documentElement`.
