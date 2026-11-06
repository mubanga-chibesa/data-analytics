import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dashboards are per-user and read auth cookies, so pages render dynamically
  // per request. cacheComponents (prerender-first) fights that, so it's off.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
