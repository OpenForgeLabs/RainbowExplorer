import type { Config } from "tailwindcss";
import preset from "@openforgelabs/rainbow-ui/tailwind-preset";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx}"],
  presets: [preset],
};

export default config;
