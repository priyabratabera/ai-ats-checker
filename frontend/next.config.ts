import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Lets the Docker build copy just .next/standalone instead of shipping
  // the full node_modules tree - see Dockerfile.
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
