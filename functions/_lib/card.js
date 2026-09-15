/** Shared card settings, auth cookie, and storage helpers. */

export const COOKIE = "card_auth";
export const SETTINGS_KEY = "settings";
export const PHOTO_KEY = "photo";
export const SITE_URL = "https://chrisdelacruz.com";

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
    role: "Junior Data Analyst",
    place: "Dubai, UAE",
    workLocation: "Dubai, UAE",
    homeLocation: "Metro Manila, Philippines",
    linkedin: "https://www.linkedin.com/in/chris-dc/",
    org: "DC Group HQ",
    companyWebsite: "",
    note:
      "Christian Dela Cruz — Junior Data Analyst and process automation professional. Currently based in Dubai, UAE, and available for freelance work in the Philippines (Metro Manila). I help teams turn data into clearer decisions, automate repetitive work, and improve day-to-day operations. Reach me via this card, LinkedIn, email, or phone.",
  },
  messaging: {
    whatsapp: { enabled: false, value: "+639711358319" },
    viber: { enabled: false, value: "+639711358319" },
    telegram: { enabled: false, value: "" },
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

function normalizeMessaging(input) {
  const base = DEFAULT_SETTINGS.messaging;
  const src = input && typeof input === "object" ? input : {};
  const out = {};
  for (const key of ["whatsapp", "viber", "telegram"]) {
    const row = src[key] && typeof src[key] === "object" ? src[key] : {};
    out[key] = {
      enabled: Boolean(row.enabled),
      value: String(row.value ?? base[key].value ?? "").trim().slice(0, 80),
    };
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

  merged.messaging = normalizeMessaging(merged.messaging);
  merged.photo = {
    ...DEFAULT_SETTINGS.photo,
    ...merged.photo,
  };

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

function escapeVCard(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function phoneType(label = "") {
  const l = label.toLowerCase();
  if (l.includes("work") || l.includes("company") || l.includes("office")) return "WORK";
  if (l.includes("home") || l.includes("personal")) return "CELL";
  return "CELL";
}

function emailType(label = "") {
  const l = label.toLowerCase();
  if (l.includes("work") || l.includes("company")) return "WORK";
  if (l.includes("home") || l.includes("personal")) return "HOME";
  return "INTERNET";
}

/**
 * Build a clean vCard 3.0.
 * Custom tags use Apple itemN.X-ABLabel so phones don't glue "Smart" onto the number.
 */
export function buildVCard(settings) {
  const id = settings.identity || {};
  const parts = String(id.name || "").trim().split(/\s+/).filter(Boolean);
  let family = "";
  let given = "";
  if (parts.length >= 3 && /^(dela|de|del|van|von)$/i.test(parts[parts.length - 2])) {
    family = parts.slice(-2).join(" ");
    given = parts.slice(0, -2).join(" ");
  } else if (parts.length > 1) {
    family = parts[parts.length - 1];
    given = parts.slice(0, -1).join(" ");
  } else {
    given = parts[0] || "";
  }

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVCard(family)};${escapeVCard(given)};;;`,
    `FN:${escapeVCard(id.name || "")}`,
  ];

  if (id.org) lines.push(`ORG:${escapeVCard(id.org)}`);
  if (id.role) lines.push(`TITLE:${escapeVCard(id.role)}`);

  let item = 1;
  for (const c of settings.contacts || []) {
    if (!c.visible || !c.value) continue;
    const label = (c.label || "").trim();

    if (c.type === "phone") {
      const digits = c.value.replace(/[^\d+]/g, "");
      lines.push(`item${item}.TEL;TYPE=${phoneType(label)}:${escapeVCard(digits)}`);
      if (label) lines.push(`item${item}.X-ABLabel:${escapeVCard(label)}`);
      item += 1;
    } else if (c.type === "email") {
      lines.push(
        `item${item}.EMAIL;TYPE=${emailType(label)}:${escapeVCard(c.value)}`
      );
      if (label) lines.push(`item${item}.X-ABLabel:${escapeVCard(label)}`);
      item += 1;
    } else if (c.type === "link") {
      lines.push(`item${item}.URL:${escapeVCard(c.value)}`);
      if (label) lines.push(`item${item}.X-ABLabel:${escapeVCard(label)}`);
      item += 1;
    }
  }

  lines.push(`URL:${SITE_URL}`);
  if (id.companyWebsite) {
    lines.push(`item${item}.URL:${escapeVCard(id.companyWebsite)}`);
    lines.push(`item${item}.X-ABLabel:Company Website`);
    item += 1;
  }

  const work = id.workLocation || id.place || "Dubai, UAE";
  const home = id.homeLocation || "Metro Manila, Philippines";
  lines.push(`ADR;TYPE=WORK:;;${escapeVCard(work)};;;;`);
  lines.push(`ADR;TYPE=HOME:;;${escapeVCard(home)};;;;`);

  if (id.note) lines.push(`NOTE:${escapeVCard(id.note)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export function publicCardPayload(settings, hasCustomPhoto) {
  const photoSrc = hasCustomPhoto ? `/api/photo?t=${Date.now()}` : settings.photo.src;
  const messaging = settings.messaging || DEFAULT_SETTINGS.messaging;
  return {
    theme: settings.theme,
    identity: settings.identity,
    photo: { ...settings.photo, src: photoSrc },
    contacts: (settings.contacts || []).filter((c) => c.visible),
    messaging: {
      whatsapp: messaging.whatsapp?.enabled
        ? { enabled: true, value: messaging.whatsapp.value }
        : { enabled: false },
      viber: messaging.viber?.enabled
        ? { enabled: true, value: messaging.viber.value }
        : { enabled: false },
      telegram: messaging.telegram?.enabled
        ? { enabled: true, value: messaging.telegram.value }
        : { enabled: false },
    },
  };
}
