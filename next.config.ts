import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Ensure Turbopack resolves the correct workspace root when multiple lockfiles exist
  // This points Turbopack to this package folder.
  // Note: `turbopack` is an internal option; keep minimal usage.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
