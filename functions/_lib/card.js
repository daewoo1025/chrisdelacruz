/** Shared card settings, auth cookie, and storage helpers. */

export const COOKIE = "card_auth";
export const SETTINGS_KEY = "settings";
export const PHOTO_KEY = "photo";

/** In-memory fallback when KV is not bound (local/dev). */
const memory = {
  settings: null,
  photoBytes: null,
  photoType: "image/png",
};

export const DEFAULT_SETTINGS = {
  theme: "sky",
  identity: {
    brand: "chrisdelacruz.com",
    tagline: "Digital calling card",
    eyebrow: "Hello, I’m",
    name: "Christian Dela Cruz",
    role: "Process Automation and Improvement",
    place: "Dubai, UAE · DC Group HQ",
    linkedin: "https://www.linkedin.com/in/chris-dc/",
    org: "DC Group HQ",
    note: "Process automation and improvement professional based in Dubai, UAE.",
  },
  photo: {
    src: "/images/christian-dela-cruz.png",
    objectFit: "cover",
    objectPosition: "center top",
    minHeight: "68vh",
    maxHeight: "640px",
    borderRadius: "1.6rem",
  },
  contacts: [
    {
      id: "phone-smart",
      type: "phone",
      label: "Smart",
      value: "+639711358319",
      visible: true,
    },
    {
      id: "email-personal",
      type: "email",
      label: "Personal Email",
      value: "c000business@gmail.com",
      visible: true,
    },
    {
      id: "link-linkedin",
      type: "link",
      label: "LinkedIn",
      value: "https://www.linkedin.com/in/chris-dc/",
      visible: true,
    },
  ],
};

export const THEMES = ["sky", "ocean", "slate", "ember", "forest"];

export function hasAuth(request) {
  const cookie = request.headers.get("Cookie") || "";
  return cookie.split(";").some((part) => part.trim() === `${COOKIE}=1`);
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export function unauthorized() {
  return json({ ok: false, error: "unauthorized" }, 401);
}

function deepMerge(base, patch) {
  if (!patch || typeof patch !== "object") return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === "object" &&
      !Array.isArray(base[key])
    ) {
      out[key] = deepMerge(base[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function normalizeSettings(input) {
  const merged = deepMerge(DEFAULT_SETTINGS, input || {});
  if (!THEMES.includes(merged.theme)) merged.theme = "sky";
  if (!Array.isArray(merged.contacts)) merged.contacts = DEFAULT_SETTINGS.contacts;

  merged.contacts = merged.contacts
    .filter((c) => c && typeof c === "object")
    .map((c, i) => ({
      id: String(c.id || `contact-${i}-${Date.now()}`),
      type: ["phone", "email", "link"].includes(c.type) ? c.type : "link",
      label: String(c.label || "Contact").slice(0, 40),
      value: String(c.value || "").trim().slice(0, 300),
      visible: c.visible !== false,
    }))
    .filter((c) => c.value);

  merged.identity = {
    ...DEFAULT_SETTINGS.identity,
    ...merged.identity,
  };

  merged.photo = {
    ...DEFAULT_SETTINGS.photo,
    ...merged.photo,
  };

  // Never let clients point photo.src at arbitrary remote hosts via settings
  // except our own API/static paths or data URLs handled separately.
  const src = merged.photo.src || DEFAULT_SETTINGS.photo.src;
  if (
    src.startsWith("/images/") ||
    src.startsWith("/api/photo") ||
    src.startsWith("data:image/")
  ) {
    merged.photo.src = src;
  } else {
    merged.photo.src = DEFAULT_SETTINGS.photo.src;
  }

  return merged;
}

export async function readSettings(env) {
  try {
    if (env.CARD) {
      const raw = await env.CARD.get(SETTINGS_KEY, "json");
      if (raw) return normalizeSettings(raw);
    } else if (memory.settings) {
      return normalizeSettings(memory.settings);
    }
  } catch {
    /* fall through */
  }
  return normalizeSettings(DEFAULT_SETTINGS);
}

export async function writeSettings(env, settings) {
  const normalized = normalizeSettings(settings);
  if (env.CARD) {
    await env.CARD.put(SETTINGS_KEY, JSON.stringify(normalized));
  } else {
    memory.settings = normalized;
  }
  return normalized;
}

export async function readPhoto(env) {
  if (env.CARD) {
    const meta = await env.CARD.getWithMetadata(PHOTO_KEY, "arrayBuffer");
    if (meta?.value) {
      return {
        bytes: meta.value,
        type: meta.metadata?.type || "image/png",
      };
    }
    return null;
  }
  if (memory.photoBytes) {
    return { bytes: memory.photoBytes, type: memory.photoType };
  }
  return null;
}

export async function writePhoto(env, bytes, type = "image/png") {
  if (env.CARD) {
    await env.CARD.put(PHOTO_KEY, bytes, {
      metadata: { type },
    });
  } else {
    memory.photoBytes = bytes;
    memory.photoType = type;
  }
}

export async function clearPhoto(env) {
  if (env.CARD) {
    await env.CARD.delete(PHOTO_KEY);
  } else {
    memory.photoBytes = null;
    memory.photoType = "image/png";
  }
}

export function buildVCard(settings) {
  const id = settings.identity || {};
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVCard((id.name || "").split(" ").slice(-1)[0] || "")};${escapeVCard(
      (id.name || "").split(" ").slice(0, -1).join(" ")
    )};;;`,
    `FN:${escapeVCard(id.name || "")}`,
  ];

  if (id.org) lines.push(`ORG:${escapeVCard(id.org)}`);
  if (id.role) lines.push(`TITLE:${escapeVCard(id.role)}`);

  for (const c of settings.contacts || []) {
    if (!c.visible) continue;
    if (c.type === "phone") {
      lines.push(`TEL;TYPE=CELL,VOICE;X-ABLabel:${escapeVCard(c.label)}:${escapeVCard(c.value)}`);
    } else if (c.type === "email") {
      lines.push(`EMAIL;TYPE=INTERNET;X-ABLabel:${escapeVCard(c.label)}:${escapeVCard(c.value)}`);
    } else if (c.type === "link") {
      lines.push(`URL;X-ABLabel:${escapeVCard(c.label)}:${escapeVCard(c.value)}`);
    }
  }

  lines.push("URL:https://chrisdelacruz.com");
  if (id.place) {
    lines.push(`ADR;TYPE=WORK:;;${escapeVCard(id.place)};;;;`);
  }
  if (id.note) lines.push(`NOTE:${escapeVCard(id.note)}`);
  lines.push("END:VCARD");
  return lines.join("\n");
}

function escapeVCard(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function publicCardPayload(settings, hasCustomPhoto) {
  const photoSrc = hasCustomPhoto ? `/api/photo?t=${Date.now()}` : settings.photo.src;
  return {
    theme: settings.theme,
    identity: settings.identity,
    photo: { ...settings.photo, src: photoSrc },
    contacts: (settings.contacts || []).filter((c) => c.visible),
  };
}
