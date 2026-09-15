/**
 * GET /api/resume-file — public download of the active resume PDF.
 */
import { readResumePdf, json } from "../_lib/card.js";

export async function onRequestGet(context) {
  const { env } = context;
  const pdf = await readResumePdf(env);
  if (!pdf?.bytes) {
    return json({ ok: false, error: "No active resume PDF" }, 404);
  }

  const filename = (pdf.filename || "Resume.pdf").replace(/[^\w.\- ]+/g, "_");
  return new Response(pdf.bytes, {
    status: 200,
    headers: {
      "Content-Type": pdf.type || "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=60",
    },
  });
}
