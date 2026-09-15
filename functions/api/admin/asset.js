/**
 * POST/DELETE /api/admin/asset — upload or clear hero background / company logo.
 * Form fields: kind = hero|logo, file = image
 */
import {
  hasAuth,
  unauthorized,
  writeAsset,
  clearAsset,
  readAsset,
  json,
} from "../../_lib/card.js";

const MAX_BYTES = 2_500_000;

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!hasAuth(request)) return unauthorized();
  const hero = await readAsset(env, "hero");
  const logo = await readAsset(env, "logo");
  return json({
    ok: true,
    hasHero: Boolean(hero),
    hasLogo: Boolean(logo),
    heroSrc: hero ? `/api/asset/hero?t=${Date.now()}` : null,
    logoSrc: logo ? `/api/asset/logo?t=${Date.now()}` : null,
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!hasAuth(request)) return unauthorized();

  try {
    const form = await request.formData();
    const kind = String(form.get("kind") || "").trim();
    if (kind !== "hero" && kind !== "logo") {
      return json({ ok: false, error: "kind must be hero or logo" }, 400);
    }
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return json({ ok: false, error: "Missing image file" }, 400);
    }
    const type = file.type || (kind === "logo" ? "image/png" : "image/jpeg");
    if (!String(type).startsWith("image/")) {
      return json({ ok: false, error: "File must be an image" }, 400);
    }
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) {
      return json({ ok: false, error: "Image too large (max ~2.5MB)" }, 413);
    }
    await writeAsset(env, kind, bytes, type);
    return json({
      ok: true,
      kind,
      src: `/api/asset/${kind}?t=${Date.now()}`,
    });
  } catch (err) {
    return json({ ok: false, error: err?.message || "Upload failed" }, 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!hasAuth(request)) return unauthorized();
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  if (kind !== "hero" && kind !== "logo") {
    return json({ ok: false, error: "kind must be hero or logo" }, 400);
  }
  await clearAsset(env, kind);
  return json({ ok: true, kind });
}
