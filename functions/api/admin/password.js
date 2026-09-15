/**
 * POST /api/admin/password — change admin unlock password (auth required).
 * Body: { currentPassword, newPassword }
 */
import {
  hasAuth,
  unauthorized,
  json,
  verifyUnlockPassword,
  hashPassword,
  writePasswordHash,
} from "../../_lib/card.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!hasAuth(request)) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const currentPassword =
    typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!(await verifyUnlockPassword(env, currentPassword))) {
    return json({ ok: false, error: "Current password is incorrect" }, 400);
  }

  if (newPassword.length < 6) {
    return json(
      { ok: false, error: "New password must be at least 6 characters" },
      400
    );
  }

  if (newPassword.length > 128) {
    return json({ ok: false, error: "New password is too long" }, 400);
  }

  if (newPassword === currentPassword) {
    return json(
      { ok: false, error: "New password must be different from the current one" },
      400
    );
  }

  await writePasswordHash(env, await hashPassword(newPassword));
  return json({ ok: true, message: "Password updated" });
}
