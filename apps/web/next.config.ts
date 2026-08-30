import type { NextConfig } from "next";

const pdfjsAssetTrace = [
  "./node_modules/pdfjs-dist/standard_fonts/**",
  "./node_modules/pdfjs-dist/cmaps/**",
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@vedaai/types"],
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist", "unpdf"],
  outputFileTracingIncludes: {
    "/api/extract-questions": pdfjsAssetTrace,
    "/api/extract-answers": pdfjsAssetTrace,
  },
};

export default nextConfig;
