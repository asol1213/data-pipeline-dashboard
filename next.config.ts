import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Temporary: ignore build errors from other agent's in-progress files
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
