/**
 * POST /api/admin/photo — upload custom photo (multipart or JSON base64).
 * DELETE /api/admin/photo — reset to default image.
 */
import {
  hasAuth,
  unauthorized,
  writePhoto,
  clearPhoto,
  readSettings,
  writeSettings,
  json,
} from "../../_lib/card.js";

const MAX_BYTES = 1_800_000; // ~1.8 MB after client resize

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!hasAuth(request)) return unauthorized();

  const contentType = request.headers.get("Content-Type") || "";

  try {
    let bytes;
    let type = "image/jpeg";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("photo");
      if (!file || typeof file === "string") {
        return json({ ok: false, error: "Missing photo file" }, 400);
      }
      type = file.type || "image/jpeg";
      bytes = await file.arrayBuffer();
    } else {
      const body = await request.json();
      const dataUrl = body?.dataUrl;
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
        return json({ ok: false, error: "Expected dataUrl image" }, 400);
      }
      const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
      if (!match) return json({ ok: false, error: "Invalid dataUrl" }, 400);
      type = match[1];
      const binary = atob(match[2]);
      const arr = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
      bytes = arr.buffer;
    }

    if (bytes.byteLength > MAX_BYTES) {
      return json(
        { ok: false, error: "Image too large. Please use a smaller photo." },
        413
      );
    }

    if (!type.startsWith("image/")) {
      return json({ ok: false, error: "File must be an image" }, 400);
    }

    await writePhoto(env, bytes, type);

    const settings = await readSettings(env);
    settings.photo.src = "/api/photo";
    await writeSettings(env, settings);

    return json({ ok: true, src: `/api/photo?t=${Date.now()}` });
  } catch (err) {
    return json(
      { ok: false, error: err?.message || "Upload failed" },
      500
    );
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!hasAuth(request)) return unauthorized();

  await clearPhoto(env);
  const settings = await readSettings(env);
  settings.photo.src = "/images/christian-dela-cruz.png";
  await writeSettings(env, settings);

  return json({ ok: true, src: settings.photo.src });
}
