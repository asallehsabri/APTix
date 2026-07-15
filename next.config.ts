import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Netlify's @netlify/plugin-nextjs handles the build output.
  // No explicit "output" mode needed.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the dev server to be accessed from the sandbox preview origin
  allowedDevOrigins: ["http://127.0.0.1:3000", "http://localhost:3000"],
};

export default nextConfig;
