/**
 * GET/POST/DELETE /api/admin/resume-active — manage the public downloadable resume.
 * POST JSON: { id, name, data? }
 * POST multipart: id, name, pdf (file) — optional PDF override
 * DELETE: clear active resume + PDF + builder snapshot
 */
import {
  hasAuth,
  unauthorized,
  json,
  readResumeActive,
  writeResumeActive,
  writeResumePdf,
  clearResumePdf,
  readResumePdf,
  readResumeActiveData,
  writeResumeActiveData,
  clearResumeActiveData,
} from "../../_lib/card.js";

function hasBuilderPayload(data) {
  return Boolean(data && typeof data === "object" && Object.keys(data).length);
}

async function activePayload(env) {
  const active = await readResumeActive(env);
  if (!active) return null;
  const pdf = await readResumePdf(env);
  const builder = await readResumeActiveData(env);
  return {
    ...active,
    hasPdf: Boolean(pdf?.bytes),
    hasBuilder: hasBuilderPayload(builder),
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!hasAuth(request)) return unauthorized();
  return json({
    ok: true,
    active: await activePayload(env),
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!hasAuth(request)) return unauthorized();

  const contentType = request.headers.get("Content-Type") || "";
  let id = "";
  let name = "Resume";
  let pdfFile = null;
  let builderData = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    id = String(form.get("id") || "").trim();
    name = String(form.get("name") || "Resume").trim() || "Resume";
    pdfFile = form.get("pdf");
  } else {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "Invalid request" }, 400);
    }
    id = String(body?.id || "").trim();
    name = String(body?.name || "Resume").trim() || "Resume";
    if (body?.data && typeof body.data === "object") {
      builderData = body.data;
    }
  }

  if (!id) return json({ ok: false, error: "Resume id required" }, 400);

  const previous = await readResumeActive(env);
  const idChanged = !previous || previous.id !== id;

  if (pdfFile && typeof pdfFile === "object" && typeof pdfFile.arrayBuffer === "function") {
    const bytes = await pdfFile.arrayBuffer();
    if (bytes.byteLength > 8_000_000) {
      return json({ ok: false, error: "PDF too large (max 8MB)" }, 400);
    }
    const filename =
      (pdfFile.name && String(pdfFile.name)) ||
      `${name.replace(/\s+/g, "_")}.pdf`;
    await writeResumePdf(env, bytes, "application/pdf", filename);
  } else if (idChanged) {
    // Switching profiles: drop the old PDF so the builder snapshot is used.
    await clearResumePdf(env);
  }

  if (builderData) {
    await writeResumeActiveData(env, builderData);
  } else if (idChanged) {
    await clearResumeActiveData(env);
  }

  const existingPdf = await readResumePdf(env);
  const existingBuilder = await readResumeActiveData(env);
  const meta = {
    id,
    name,
    updatedAt: new Date().toISOString(),
    hasPdf: Boolean(existingPdf?.bytes),
    hasBuilder: hasBuilderPayload(existingBuilder),
  };
  await writeResumeActive(env, meta);
  return json({ ok: true, active: meta });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!hasAuth(request)) return unauthorized();
  await writeResumeActive(env, null);
  await clearResumePdf(env);
  await clearResumeActiveData(env);
  return json({ ok: true, active: null });
}
