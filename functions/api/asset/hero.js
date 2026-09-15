/**
 * GET /api/asset/hero — public hero background image
 */
import { readAsset, json } from "../../_lib/card.js";

export async function onRequestGet(context) {
  const { env } = context;
  const asset = await readAsset(env, "hero");
  if (!asset?.bytes) {
    return json({ ok: false, error: "No hero background" }, 404);
  }
  return new Response(asset.bytes, {
    status: 200,
    headers: {
      "Content-Type": asset.type || "image/jpeg",
      "Cache-Control": "public, max-age=300",
    },
  });
}
