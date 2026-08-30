import { geminiRuntimeSummary } from "@/lib/ai/config";
import {
  probeCanvasModule,
  probePdfjsAssets,
} from "@/lib/documents/pdfjsServer";

export const runtime = "nodejs";

/** Deployment diagnostic — verify env + code version on Vercel. */
export async function GET() {
  const gemini = geminiRuntimeSummary();
  const key =
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  const keySuffix = key && key.length > 8 ? key.slice(-4) : null;
  const pdfAssets = probePdfjsAssets();
  const canvas = await probeCanvasModule();

  return Response.json({
    ok: pdfAssets.standardFonts && pdfAssets.cmaps && canvas,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    gemini,
    keySuffix,
    pdfAssets,
    canvas,
    node: process.version,
  });
}
