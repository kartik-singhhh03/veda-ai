import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { definePDFJSModule } from "unpdf";

const require = createRequire(import.meta.url);

let pdfjsReady: Promise<void> | null = null;

/** Resolve pdfjs-dist root via Node require — reliable on Vercel (unlike bundled import.meta.resolve). */
export function resolvePdfjsDistRoot(): string {
  return dirname(require.resolve("pdfjs-dist/package.json"));
}

/** Document options for Node/serverless PDF.js (fonts + CMaps from node_modules). */
export function getPdfjsDocumentOptions() {
  const root = resolvePdfjsDistRoot();
  return {
    disableFontFace: true,
    useSystemFonts: true,
    standardFontDataUrl: pathToFileURL(join(root, "standard_fonts/")).href,
    cMapUrl: pathToFileURL(join(root, "cmaps/")).href,
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
