/**
 * GET/PUT /api/admin/settings — auth required.
 */
import {
  hasAuth,
  unauthorized,
  readSettings,
  writeSettings,
  readPhoto,
  publicCardPayload,
  json,
  THEMES,
} from "../../_lib/card.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!hasAuth(request)) return unauthorized();

  const settings = await readSettings(env);
  const customPhoto = await readPhoto(env);
  return json({
    ok: true,
    settings,
    themes: THEMES,
    hasCustomPhoto: Boolean(customPhoto),
    public: publicCardPayload(settings, Boolean(customPhoto)),
  });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  if (!hasAuth(request)) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const next = await writeSettings(env, body.settings || body);
  const customPhoto = await readPhoto(env);
  return json({
    ok: true,
    settings: next,
    public: publicCardPayload(next, Boolean(customPhoto)),
  });
}
