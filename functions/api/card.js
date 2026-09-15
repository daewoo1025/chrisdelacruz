/**
 * GET /api/card — public calling-card settings (no auth).
 */
import {
  readSettings,
  readPhoto,
  publicCardPayload,
  json,
} from "../_lib/card.js";

export async function onRequestGet(context) {
  const { env } = context;
  const settings = await readSettings(env);
  const customPhoto = await readPhoto(env);
  return json(publicCardPayload(settings, Boolean(customPhoto)));
}
