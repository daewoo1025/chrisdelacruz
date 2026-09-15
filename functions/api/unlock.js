/**
 * POST /api/unlock — sets HttpOnly session cookie for admin + resume.
 * Password: UNLOCK_PASSWORD in .dev.vars / Pages secret.
 */
import { COOKIE, json } from "../_lib/card.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request" }, 400);
  }

  const password = typeof body?.password === "string" ? body.password : "";
  const expected = env.UNLOCK_PASSWORD;

  if (!expected) {
    return json(
      { ok: false, error: "Unlock is not configured on this deployment." },
      500
    );
  }

  if (password !== expected) {
    return json({ ok: false, error: "Incorrect password" }, 401);
  }

  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append(
    "Set-Cookie",
    `${COOKIE}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
  );

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
