import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const basePath = "/plugins/starter";
const appRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  basePath,
  assetPrefix: basePath,
  turbopack: {
    root: appRoot,
  },
  transpilePackages: [
    "@openforgelabs/rainbow-ui",
    "@openforgelabs/rainbow-contracts",
  ],
};

export default nextConfig;
