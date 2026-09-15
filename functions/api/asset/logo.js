/**
 * GET /api/asset/logo — public company logo
 */
import { readAsset, json } from "../../_lib/card.js";

export async function onRequestGet(context) {
  const { env } = context;
  const asset = await readAsset(env, "logo");
  if (!asset?.bytes) {
    return json({ ok: false, error: "No logo" }, 404);
  }
  return new Response(asset.bytes, {
    status: 200,
    headers: {
      "Content-Type": asset.type || "image/png",
      "Cache-Control": "public, max-age=300",
    },
  });
}
