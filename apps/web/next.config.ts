import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Monorepo root — pdfjs-dist is hoisted to root node_modules, not apps/web/node_modules. */
const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const pdfjsAssetTrace = [
  "./node_modules/pdfjs-dist/standard_fonts/**",
  "./node_modules/pdfjs-dist/cmaps/**",
  "./node_modules/@napi-rs/canvas/**",
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@vedaai/types"],
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist", "unpdf"],
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    "/api/extract-questions": pdfjsAssetTrace,
    "/api/extract-answers": pdfjsAssetTrace,
  },
};

export default nextConfig;
