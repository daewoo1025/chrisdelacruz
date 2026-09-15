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
  LAYOUTS,
  LAYOUT_META,
  readAsset,
} from "../../_lib/card.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!hasAuth(request)) return unauthorized();

  const settings = await readSettings(env);
  const customPhoto = await readPhoto(env);
  const mobilePhoto = await readPhoto(env, "mobile");
  const hero = await readAsset(env, "hero");
  const logo = await readAsset(env, "logo");
  return json({
    ok: true,
    settings,
    themes: THEMES,
    layouts: LAYOUTS,
    layoutMeta: LAYOUT_META,
    hasCustomPhoto: Boolean(customPhoto),
    hasMobilePhoto: Boolean(mobilePhoto),
    hasHero: Boolean(hero),
    hasLogo: Boolean(logo),
    heroSrc: hero ? `/api/asset/hero?t=${Date.now()}` : null,
    logoSrc: logo ? `/api/asset/logo?t=${Date.now()}` : null,
    desktopPhotoSrc: customPhoto ? `/api/photo?t=${Date.now()}` : null,
    mobilePhotoSrc: mobilePhoto ? `/api/photo/mobile?t=${Date.now()}` : null,
    public: publicCardPayload(settings, Boolean(customPhoto), null, {
      hasHero: Boolean(hero),
      hasLogo: Boolean(logo),
      hasMobilePhoto: Boolean(mobilePhoto),
    }),
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
  const mobilePhoto = await readPhoto(env, "mobile");
  const hero = await readAsset(env, "hero");
  const logo = await readAsset(env, "logo");
  return json({
    ok: true,
    settings: next,
    public: publicCardPayload(next, Boolean(customPhoto), null, {
      hasHero: Boolean(hero),
      hasLogo: Boolean(logo),
      hasMobilePhoto: Boolean(mobilePhoto),
    }),
  });
}
