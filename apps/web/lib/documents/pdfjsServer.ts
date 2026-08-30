import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { definePDFJSModule } from "unpdf";

let pdfjsReady: Promise<void> | null = null;

function assetBase(root: string, subdir: string): string {
  const dir = join(root, subdir);
  return dir.endsWith("/") || dir.endsWith("\\") ? dir : `${dir}/`;
}

function isPdfjsRoot(dir: string): boolean {
  return existsSync(join(dir, "package.json"));
}

/**
 * Resolve pdfjs-dist root on disk.
 *
 * In this npm-workspace monorepo, pdfjs-dist is hoisted to the repository root.
 * Vercel Root Directory is `apps/web`, so process.cwd() may not contain pdfjs-dist
 * directly under ./node_modules.
 */
export function resolvePdfjsDistRoot(): string {
  const cwd = process.cwd();
  const candidates = [
    join(cwd, "node_modules", "pdfjs-dist"),
    join(cwd, "..", "node_modules", "pdfjs-dist"),
    join(cwd, "..", "..", "node_modules", "pdfjs-dist"),
  ];

  for (const candidate of candidates) {
    if (isPdfjsRoot(candidate)) {
      return candidate;
    }
  }

  for (const pkgJson of [
    join(cwd, "package.json"),
    join(cwd, "..", "package.json"),
    join(cwd, "..", "..", "package.json"),
  ]) {
    if (!existsSync(pkgJson)) continue;
    try {
      const projectRequire = createRequire(pkgJson);
      return dirname(projectRequire.resolve("pdfjs-dist/package.json"));
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    `pdfjs-dist not found (cwd=${cwd}). Ensure npm install ran at the monorepo root.`,
  );
}

/** Diagnostics for Vercel — standard fonts must exist or renders may be blank. */
export function probePdfjsAssets(): {
  root: string;
  standardFonts: boolean;
  cmaps: boolean;
  cwd: string;
  error?: string;
} {
  try {
    const root = resolvePdfjsDistRoot();
    return {
      root,
      cwd: process.cwd(),
      standardFonts: existsSync(join(root, "standard_fonts", "FoxitFixed.pfb")),
      cmaps: existsSync(join(root, "cmaps", "78-H.bcmap")),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      root: "",
      cwd: process.cwd(),
      standardFonts: false,
      cmaps: false,
      error: message,
    };
  }
}

/** Document options for Node/serverless PDF.js (fonts + CMaps from node_modules). */
export function getPdfjsDocumentOptions() {
  const root = resolvePdfjsDistRoot();
  return {
    disableFontFace: true,
    useSystemFonts: true,
    // PDF.js Node backend uses fs.readFile — plain paths, not file:// URLs.
    standardFontDataUrl: assetBase(root, "standard_fonts"),
    cMapUrl: assetBase(root, "cmaps"),
    cMapPacked: true as const,
  };
}

/**
 * Configure PDF.js legacy build for Node/serverless.
 *
 * Turbopack/Next externalize pdfjs-dist and break dynamic `import(workerSrc)`.
 * Preload WorkerMessageHandler on globalThis so PDF.js uses the fake worker
 * without resolving a bundled worker URL.
 */
export async function ensurePdfjsServer(): Promise<void> {
  if (!pdfjsReady) {
    pdfjsReady = (async () => {
      await definePDFJSModule(async () => {
        const [pdfjs, worker] = await Promise.all([
          import("pdfjs-dist/legacy/build/pdf.mjs"),
          import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
        ]);

        globalThis.pdfjsWorker = {
          WorkerMessageHandler: worker.WorkerMessageHandler,
        };

        return pdfjs;
      });
    })();
  }
  await pdfjsReady;
}

/** Lightweight runtime check for deployment diagnostics (server logs only). */
export async function probeCanvasModule(): Promise<boolean> {
  try {
    const canvas = await import("@napi-rs/canvas");
    return typeof canvas.createCanvas === "function";
  } catch {
    return false;
  }
}

declare global {
  // PDF.js reads this in Node when Web Workers are unavailable.
  var pdfjsWorker: { WorkerMessageHandler: unknown } | undefined;
}

export {};
