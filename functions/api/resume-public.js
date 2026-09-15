/**
 * GET /api/resume-public — public active resume builder profile (no auth).
 */
import {
  readResumeActive,
  readResumeActiveData,
  readResumePdf,
  json,
} from "../_lib/card.js";

export async function onRequestGet(context) {
  const { env } = context;
  const active = await readResumeActive(env);
  if (!active) {
    return json({ ok: false, error: "No active resume" }, 404);
  }

  const data = await readResumeActiveData(env);
  const pdf = await readResumePdf(env);
  if (!data || typeof data !== "object" || !Object.keys(data).length) {
    if (pdf?.bytes) {
      return json({
        ok: true,
        name: active.name || "Resume",
        kind: "pdf",
        url: "/api/resume-file",
      });
    }
    return json({ ok: false, error: "No resume profile" }, 404);
  }

  return json({
    ok: true,
    name: active.name || data.name || "Resume",
    kind: "page",
    data,
  });
}
