/**
 * GET /api/card — public calling-card settings (no auth).
 */
import {
  readSettings,
  readPhoto,
  readResumeActive,
  readResumeActiveData,
  readResumePdf,
  readAsset,
  publicCardPayload,
  json,
} from "../_lib/card.js";

export async function onRequestGet(context) {
  const { env } = context;
  const settings = await readSettings(env);
  const customPhoto = await readPhoto(env);
  const mobilePhoto = await readPhoto(env, "mobile");
  const resumeActive = await readResumeActive(env);
  const resumeData = await readResumeActiveData(env);
  const resumePdf = await readResumePdf(env);
  const hero = await readAsset(env, "hero");
  const logo = await readAsset(env, "logo");
  const resumeMeta = resumeActive
    ? {
        ...resumeActive,
        hasPdf: Boolean(resumePdf?.bytes),
        hasBuilder: Boolean(
          resumeData && typeof resumeData === "object" && Object.keys(resumeData).length
        ),
      }
    : null;
  return json(
    publicCardPayload(settings, Boolean(customPhoto), resumeMeta, {
      hasHero: Boolean(hero),
      hasLogo: Boolean(logo),
      hasMobilePhoto: Boolean(mobilePhoto),
    })
  );
}
