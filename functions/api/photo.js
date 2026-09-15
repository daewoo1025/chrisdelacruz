/**
 * GET /api/photo — serves custom uploaded photo (or 404 → use static default).
 */
import { readPhoto } from "../_lib/card.js";

export async function onRequestGet(context) {
  const photo = await readPhoto(context.env);
  if (!photo) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(photo.bytes, {
    status: 200,
    headers: {
      "Content-Type": photo.type || "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
