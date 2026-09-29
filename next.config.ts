import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: `npm run build` outputs a plain `out/` folder that can be
  // uploaded to Netlify, Vercel or any static host.
  output: "export",
  trailingSlash: true,
  images: {
    // Images are already optimized WebP files, so skip the image server.
    unoptimized: true,
  },
};

export default nextConfig;
