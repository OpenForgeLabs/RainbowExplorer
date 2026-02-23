import preset from "@openforgelabs/rainbow-ui/tailwind-preset";

const semanticSafelist = [
  {
    pattern:
      /^(bg|text|border)-(background|surface|surface-2|surface-3|control|control-hover|control-active|foreground|muted|muted-foreground|subtle|primary|primary-hover|primary-active|primary-foreground|accent|accent-hover|accent-active|accent-foreground|success|success-hover|success-foreground|warning|warning-hover|warning-foreground|danger|danger-hover|danger-foreground|info|border|border-subtle|border-strong|divider|ring|focus|viz-1|viz-2|viz-3|viz-4|viz-5|viz-6|viz-7|viz-8|viz-positive|viz-negative|viz-neutral)(\/(10|20|30|40|50|60|70|80))?$/,
  },
  {
    pattern:
      /^(hover|active|focus-within):(bg|text|border)-(background|surface|surface-2|surface-3|control|control-hover|control-active|foreground|muted|muted-foreground|subtle|primary|primary-hover|primary-active|primary-foreground|accent|accent-hover|accent-active|accent-foreground|success|success-hover|success-foreground|warning|warning-hover|warning-foreground|danger|danger-hover|danger-foreground|info|border|border-subtle|border-strong|divider|ring|focus|viz-1|viz-2|viz-3|viz-4|viz-5|viz-6|viz-7|viz-8|viz-positive|viz-negative|viz-neutral)(\/(10|20|30|40|50|60|70|80))?$/,
  },
  "ui-focus",
  "rounded-[var(--rx-radius-sm)]",
  "rounded-[var(--rx-radius-md)]",
  "rounded-[var(--rx-radius-lg)]",
  "shadow-[var(--rx-shadow-xs)]",
  "shadow-[var(--rx-shadow-sm)]",
  "shadow-[var(--rx-shadow-md)]",
  "shadow-[var(--rx-shadow-lg)]",
  "z-[var(--rx-z-modal)]",
  "z-[var(--rx-z-toast)]",
];

const config = {
  content: ["./src/**/*.{ts,tsx,js,jsx}"],
  presets: [preset],
  safelist: semanticSafelist,
};

export default config;
