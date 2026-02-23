# Rainbow Design System v1 — Theming

This document defines the token contract and rules for Rainbow Explorer.
All apps and plugins must consume tokens from `@openforgelabs/rainbow-ui`.

## Token Contract

All tokens are CSS variables with the `--rx-` prefix and must be defined per theme.

### Colors (rgb triplets)

Values are stored as `r g b` and consumed via:

```
rgb(var(--rx-color-*) / <alpha-value>)
```

**Surfaces**
- `--rx-color-bg`
- `--rx-color-surface`
- `--rx-color-surface-2`
- `--rx-color-surface-3`
- `--rx-color-overlay`
- `--rx-color-elevated`

**Text**
- `--rx-color-text`
- `--rx-color-text-muted`
- `--rx-color-text-subtle`
- `--rx-color-text-inverse`
- `--rx-color-text-on-primary`
- `--rx-color-text-on-accent`
- `--rx-color-text-on-danger`
- `--rx-color-text-on-success`
- `--rx-color-text-on-warning`

**Structure**
- `--rx-color-border`
- `--rx-color-border-subtle`
- `--rx-color-border-strong`
- `--rx-color-divider`
- `--rx-color-ring`
- `--rx-color-focus`

**Interactive**
- `--rx-color-primary`
- `--rx-color-primary-hover`
- `--rx-color-primary-active`
- `--rx-color-accent`
- `--rx-color-accent-hover`
- `--rx-color-accent-active`
- `--rx-color-control`
- `--rx-color-control-hover`
- `--rx-color-control-active`

**Status**
- `--rx-color-success`
- `--rx-color-success-hover`
- `--rx-color-warning`
- `--rx-color-warning-hover`
- `--rx-color-danger`
- `--rx-color-danger-hover`
- `--rx-color-info`

**Data Visualization**
- `--rx-color-viz-1` … `--rx-color-viz-8`
- `--rx-color-viz-positive`
- `--rx-color-viz-negative`
- `--rx-color-viz-neutral`

### Radius
- `--rx-radius-none`
- `--rx-radius-sm`
- `--rx-radius-md`
- `--rx-radius-lg`
- `--rx-radius-xl`
- `--rx-radius-full`

### Shadow
- `--rx-shadow-xs`
- `--rx-shadow-sm`
- `--rx-shadow-md`
- `--rx-shadow-lg`
- `--rx-shadow-xl`

### Motion
- `--rx-motion-fast`
- `--rx-motion-normal`
- `--rx-motion-slow`
- `--rx-ease-standard`
- `--rx-ease-emphasized`

### Z-Index
- `--rx-z-dropdown`
- `--rx-z-modal`
- `--rx-z-toast`
- `--rx-z-tooltip`

## How to Add a Theme

1. Edit `@openforgelabs/rainbow-ui/styles/themes.css`.
2. Add a new `[data-theme="your-theme-name"]` block.
3. Define **all** tokens above (no inheritance or missing values).
4. Run:
   - `pnpm validate:themes` (in `rainbow-packages`)

## Rules (No Hardcodes)

Do not use:
- Tailwind color names (`text-slate-*`, `bg-blue-*`, etc.)
- Hex colors in className strings
- Hardcoded rgba shadows

Use semantic classes from the tailwind preset and CSS variables only.

## Visualization Token Policy

Use `viz-1..8` for categorical data.
Use `viz-positive / viz-negative / viz-neutral` for directional or KPI values.
Do **not** map visualization tokens to status colors.

## Accessibility Requirements

Minimum contrast ratios enforced by validator:
- `text` on `bg`
- `text-on-primary` on `primary`
- `text-on-danger` on `danger`
- `text-on-success` on `success`
- `text-on-warning` on `warning`

Target ratio: **4.5:1** or higher.
