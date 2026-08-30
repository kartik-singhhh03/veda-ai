import { geminiRuntimeSummary } from "@/lib/ai/config";
import { probePdfjsAssets } from "@/lib/documents/pdfjsServer";

export const runtime = "nodejs";

/** Deployment diagnostic — verify env + code version on Vercel. */
export async function GET() {
  const gemini = geminiRuntimeSummary();
  const key =
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  const keySuffix = key && key.length > 8 ? key.slice(-4) : null;

  return Response.json({
    ok: true,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    gemini,
    keySuffix,
    pdfAssets: probePdfjsAssets(),
    node: process.version,
  });
}
