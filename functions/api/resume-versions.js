/**
 * GET/PUT /api/resume-versions — auth required.
 * Body for PUT: JSON array of { id, name, updatedAt, data }
 */
import { hasAuth, unauthorized, json } from "../_lib/card.js";

const VERSIONS_KEY = "resume_versions";
const memory = { versions: null };

async function readVersions(env) {
  try {
    if (env.CARD) {
      const raw = await env.CARD.get(VERSIONS_KEY, "json");
      if (Array.isArray(raw)) return raw;
    } else if (Array.isArray(memory.versions)) {
      return memory.versions;
    }
  } catch {
    /* fall through */
  }
  return [];
}

async function writeVersions(env, versions) {
  if (env.CARD) {
    await env.CARD.put(VERSIONS_KEY, JSON.stringify(versions));
  } else {
    memory.versions = versions;
  }
  return versions;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!hasAuth(request)) return unauthorized();
  const versions = await readVersions(env);
  return new Response(JSON.stringify(versions), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
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

  if (!Array.isArray(body)) {
    return json({ ok: false, error: "Expected an array of versions" }, 400);
  }

  const cleaned = body
    .filter((v) => v && typeof v === "object")
    .slice(0, 40)
    .map((v) => ({
      id: String(v.id || crypto.randomUUID()),
      name: String(v.name || "Untitled").slice(0, 120),
      updatedAt: String(v.updatedAt || new Date().toISOString()),
      data: v.data && typeof v.data === "object" ? v.data : {},
    }));

  await writeVersions(env, cleaned);
  return new Response(JSON.stringify(cleaned), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
