/**
 * POST /api/lock — clears the admin/resume auth cookie.
 */
import { COOKIE, json } from "../_lib/card.js";

export async function onRequestPost() {
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append(
    "Set-Cookie",
    `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
