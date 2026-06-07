import type { NextConfig } from "next";
import path from "path";

// Allow disabling turbopack in containerized dev environments where the
// Turbopack watcher is brittle. When DISABLE_TURBOPACK=1, skip the
// turbopack option so Next falls back to the webpack dev watcher.
const nextConfig: NextConfig = (() => {
  const base: NextConfig = {};
  const disable = process.env.DISABLE_TURBOPACK;
  if (!disable || disable === "0" || disable.toLowerCase() === "false") {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - turbopack is an internal option used only in dev
    base.turbopack = { root: path.join(__dirname) };
  }
  return base;
})();

export default nextConfig;
