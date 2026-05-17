import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    root: __dirname,
  },
  output: 'standalone',
  allowedDevOrigins: [
  
    "192.168.*.*",
  ],
};

export default nextConfig;
