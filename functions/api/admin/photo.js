/**
 * POST /api/admin/photo — upload custom photo (multipart or JSON base64).
 * Form field slot = desktop|mobile (default desktop)
 * DELETE /api/admin/photo?slot=desktop|mobile — reset that slot
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

const MAX_BYTES = 1_800_000;

function parseSlot(value) {
  return String(value || "desktop").toLowerCase() === "mobile" ? "mobile" : "desktop";
}

async function readUpload(request) {
  const contentType = request.headers.get("Content-Type") || "";
  let bytes;
  let type = "image/jpeg";
  let slot = "desktop";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    slot = parseSlot(form.get("slot"));
    const file = form.get("photo");
    if (!file || typeof file === "string") {
      return { error: "Missing photo file", status: 400 };
    }
    type = file.type || "image/jpeg";
    bytes = await file.arrayBuffer();
  } else {
    const body = await request.json();
    slot = parseSlot(body?.slot);
    const dataUrl = body?.dataUrl;
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
      return { error: "Expected dataUrl image", status: 400 };
    }
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
    if (!match) return { error: "Invalid dataUrl", status: 400 };
    type = match[1];
    const binary = atob(match[2]);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    bytes = arr.buffer;
  }

  if (bytes.byteLength > MAX_BYTES) {
    return { error: "Image too large. Please use a smaller photo.", status: 413 };
  }
  if (!type.startsWith("image/")) {
    return { error: "File must be an image", status: 400 };
  }
  return { bytes, type, slot };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!hasAuth(request)) return unauthorized();

  try {
    const uploaded = await readUpload(request);
    if (uploaded.error) {
      return json({ ok: false, error: uploaded.error }, uploaded.status);
    }

    await writePhoto(env, uploaded.bytes, uploaded.type, uploaded.slot);

    const settings = await readSettings(env);
    if (uploaded.slot === "mobile") {
      settings.photo.mobileSrc = "/api/photo/mobile";
    } else {
      settings.photo.src = "/api/photo";
    }
    await writeSettings(env, settings);

    const src =
      uploaded.slot === "mobile"
        ? `/api/photo/mobile?t=${Date.now()}`
        : `/api/photo?t=${Date.now()}`;
    return json({ ok: true, slot: uploaded.slot, src });
  } catch (err) {
    return json({ ok: false, error: err?.message || "Upload failed" }, 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!hasAuth(request)) return unauthorized();

  const url = new URL(request.url);
  const slot = parseSlot(url.searchParams.get("slot"));
  await clearPhoto(env, slot);

  const settings = await readSettings(env);
  if (slot === "mobile") {
    settings.photo.mobileSrc = "";
    await writeSettings(env, settings);
    return json({ ok: true, slot, src: settings.photo.src || "/images/christian-dela-cruz.png" });
  }

  settings.photo.src = "/images/christian-dela-cruz.png";
  await writeSettings(env, settings);
  return json({ ok: true, slot, src: settings.photo.src });
}
