import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      // Corrected configuration for Firebase Storage images
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "", // Keep port empty unless you use a non-standard port
        // Corrected pathname to match the URL structure from the error
        pathname: "/v0/b/healthvault-13934.firebasestorage.app/o/**",
      },
    ],
  },
  // Add any other Next.js configurations you might have here
};

export default nextConfig;
