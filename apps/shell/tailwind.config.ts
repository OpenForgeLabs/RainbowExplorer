import type { Config } from "tailwindcss";
import preset from "@openforgelabs/rainbow-ui/tailwind-preset";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx,js,jsx}",
    "./node_modules/@openforgelabs/rainbow-ui/src/**/*.{ts,tsx,js,jsx}",
  ],
  presets: [preset],
};

export default config;
