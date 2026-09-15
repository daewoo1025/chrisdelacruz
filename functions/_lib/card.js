/** Shared card settings, auth cookie, and storage helpers. */

export const COOKIE = "card_auth";
export const SETTINGS_KEY = "settings";
export const PHOTO_KEY = "photo";
export const PHOTO_MOBILE_KEY = "photo_mobile";
export const PASSWORD_KEY = "admin_password_hash";
export const RESUME_ACTIVE_KEY = "resume_active";
export const RESUME_PDF_KEY = "resume_active_pdf";
export const RESUME_ACTIVE_DATA_KEY = "resume_active_data";
export const HERO_BG_KEY = "asset_hero_bg";
export const LOGO_KEY = "asset_logo";
export const SITE_URL = "https://chrisdelacruz.com";

/** In-memory fallback when KV is not bound (local/dev). */
const memory = {
  settings: null,
  photoBytes: null,
  photoType: "image/png",
  photoMobileBytes: null,
  photoMobileType: "image/png",
  passwordHash: null,
  resumeActive: null,
  resumeActiveData: null,
  resumePdf: null,
  resumePdfType: "application/pdf",
  resumePdfName: "Christian_Dela_Cruz_Resume.pdf",
  heroBgBytes: null,
  heroBgType: "image/jpeg",
  logoBytes: null,
  logoType: "image/png",
};

export const DEFAULT_SETTINGS = {
  theme: "sky",
  layout: "card",
  layoutDesktop: "card",
  layoutMobile: "compact",
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
  socials: {
    linkedin: { enabled: true, url: "https://www.linkedin.com/in/chris-dc/" },
    instagram: { enabled: false, url: "" },
    facebook: { enabled: false, url: "" },
    x: { enabled: false, url: "" },
    tiktok: { enabled: false, url: "" },
    youtube: { enabled: false, url: "" },
    github: { enabled: false, url: "" },
    threads: { enabled: false, url: "" },
  },
  photo: {
    src: "/images/christian-dela-cruz.png",
    mobileSrc: "",
    objectFit: "cover",
    objectPosition: "center top",
    borderRadius: "1rem",
    desktopSize: "168px",
    mobileSize: "92px",
    clearBackground: false,
    desktop: {
      objectFit: "cover",
      objectPosition: "50% 20%",
      zoom: 1,
      size: "168px",
    },
    mobile: {
      objectFit: "cover",
      objectPosition: "50% 18%",
      zoom: 1,
      size: "92px",
    },
  },
  cardChrome: {
    factsMode: "full",
    shareMode: "full",
    resumeMode: "full",
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

export const THEMES = ["sky", "ocean", "slate", "ember", "forest", "night"];
export const LAYOUTS = ["card", "split", "banner", "logo", "studio", "compact"];
export const FACTS_MODES = ["full", "icons", "hidden"];
export const ACTION_MODES = ["full", "icon", "hidden"];

export const LAYOUT_META = {
  card: {
    label: "Classic card",
    help: "Resume-style photo beside name — works everywhere",
    needs: [],
    bestFor: ["desktop", "mobile"],
  },
  split: {
    label: "Dynamic split",
    help: "Laptop hero split + phone stack. Best with hero background + clear photo",
    needs: ["hero", "clearPhoto"],
    bestFor: ["desktop"],
  },
  banner: {
    label: "Banner",
    help: "Full-width photo banner on top, details below",
    needs: ["hero"],
    bestFor: ["desktop"],
  },
  logo: {
    label: "Company logo",
    help: "Logo-led card for branded intros. Upload a transparent PNG logo",
    needs: ["logo"],
    bestFor: ["desktop", "mobile"],
  },
  studio: {
    label: "Studio",
    help: "Centered cutout portrait over atmosphere — use a clear PNG photo",
    needs: ["clearPhoto"],
    bestFor: ["desktop", "mobile"],
  },
  compact: {
    label: "Compact",
    help: "Tight, balanced icon card — great on phones",
    needs: [],
    bestFor: ["mobile"],
  },
};

export function hasAuth(request) {
  const cookie = request.headers.get("Cookie") || "";
  return cookie.split(";").some((part) => part.trim() === `${COOKIE}=1`);
}

export async function hashPassword(password) {
  const data = new TextEncoder().encode(String(password));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function readPasswordHash(env) {
  try {
    if (env.CARD) {
      return (await env.CARD.get(PASSWORD_KEY)) || null;
    }
    return memory.passwordHash;
  } catch {
    return null;
  }
}

export async function writePasswordHash(env, hash) {
  if (env.CARD) {
    await env.CARD.put(PASSWORD_KEY, hash);
  } else {
    memory.passwordHash = hash;
  }
}

export async function clearPasswordHash(env) {
  if (env.CARD) {
    await env.CARD.delete(PASSWORD_KEY);
  } else {
    memory.passwordHash = null;
  }
}

/** Accept either custom admin password or the deployment UNLOCK_PASSWORD. */
export async function verifyUnlockPassword(env, password) {
  if (typeof password !== "string" || !password) return false;
  const customHash = await readPasswordHash(env);
  if (customHash) {
    return (await hashPassword(password)) === customHash;
  }
  const expected = env.UNLOCK_PASSWORD;
  return Boolean(expected) && password === expected;
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

function normalizeSocials(input) {
  const base = DEFAULT_SETTINGS.socials;
  const src = input && typeof input === "object" ? input : {};
  const out = {};
  for (const key of Object.keys(base)) {
    const row = src[key] && typeof src[key] === "object" ? src[key] : {};
    out[key] = {
      enabled: Boolean(row.enabled ?? base[key].enabled),
      url: String(row.url ?? base[key].url ?? "").trim().slice(0, 400),
    };
  }
  return out;
}

export function normalizeSettings(input) {
  const merged = deepMerge(DEFAULT_SETTINGS, input || {});
  if (!THEMES.includes(merged.theme)) merged.theme = "sky";

  const legacyLayout = LAYOUTS.includes(merged.layout) ? merged.layout : "card";
  const layoutDesktop = LAYOUTS.includes(merged.layoutDesktop)
    ? merged.layoutDesktop
    : legacyLayout;
  const layoutMobile = LAYOUTS.includes(merged.layoutMobile)
    ? merged.layoutMobile
    : legacyLayout === "split" || legacyLayout === "banner"
      ? "compact"
      : legacyLayout;
  merged.layoutDesktop = layoutDesktop;
  merged.layoutMobile = layoutMobile;
  merged.layout = layoutDesktop;

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
  merged.socials = normalizeSocials(merged.socials);
  const chromeIn = merged.cardChrome && typeof merged.cardChrome === "object"
    ? merged.cardChrome
    : {};
  merged.cardChrome = {
    factsMode: FACTS_MODES.includes(chromeIn.factsMode) ? chromeIn.factsMode : "full",
    shareMode: ACTION_MODES.includes(chromeIn.shareMode) ? chromeIn.shareMode : "full",
    resumeMode: ACTION_MODES.includes(chromeIn.resumeMode) ? chromeIn.resumeMode : "full",
  };
  merged.photo = {
    ...DEFAULT_SETTINGS.photo,
    ...merged.photo,
  };
  // Keep only current photo layout fields (drop legacy hero min/max heights).
  const desktopIn = merged.photo.desktop && typeof merged.photo.desktop === "object"
    ? merged.photo.desktop
    : {};
  const mobileIn = merged.photo.mobile && typeof merged.photo.mobile === "object"
    ? merged.photo.mobile
    : {};
  const desktopSize = desktopIn.size || merged.photo.desktopSize || DEFAULT_SETTINGS.photo.desktopSize;
  const mobileSize = mobileIn.size || merged.photo.mobileSize || DEFAULT_SETTINGS.photo.mobileSize;
  const desktopFit = desktopIn.objectFit || merged.photo.objectFit || DEFAULT_SETTINGS.photo.objectFit;
  const mobileFit = mobileIn.objectFit || merged.photo.objectFit || DEFAULT_SETTINGS.photo.objectFit;
  const desktopPos =
    desktopIn.objectPosition ||
    merged.photo.objectPosition ||
    DEFAULT_SETTINGS.photo.desktop.objectPosition;
  const mobilePos =
    mobileIn.objectPosition ||
    merged.photo.objectPosition ||
    DEFAULT_SETTINGS.photo.mobile.objectPosition;
  const desktopZoom = Number(desktopIn.zoom);
  const mobileZoom = Number(mobileIn.zoom);

  merged.photo = {
    src: merged.photo.src,
    mobileSrc: merged.photo.mobileSrc || "",
    objectFit: desktopFit,
    objectPosition: desktopPos,
    borderRadius: merged.photo.borderRadius || DEFAULT_SETTINGS.photo.borderRadius,
    desktopSize,
    mobileSize,
    clearBackground: Boolean(merged.photo.clearBackground),
    desktop: {
      objectFit: desktopFit,
      objectPosition: desktopPos,
      zoom: Number.isFinite(desktopZoom) && desktopZoom > 0 ? Math.min(2.5, desktopZoom) : 1,
      size: desktopSize,
    },
    mobile: {
      objectFit: mobileFit,
      objectPosition: mobilePos,
      zoom: Number.isFinite(mobileZoom) && mobileZoom > 0 ? Math.min(2.5, mobileZoom) : 1,
      size: mobileSize,
    },
  };

  const src = merged.photo.src || DEFAULT_SETTINGS.photo.src;
  if (
    src.startsWith("/images/") ||
    src.startsWith("/api/photo") ||
    src.startsWith("data:image/")
  ) {
    merged.photo.src = src.startsWith("/api/photo/") ? "/api/photo" : src;
  } else {
    merged.photo.src = DEFAULT_SETTINGS.photo.src;
  }

  const mobileSrc = merged.photo.mobileSrc || "";
  if (
    !mobileSrc ||
    mobileSrc.startsWith("/images/") ||
    mobileSrc.startsWith("/api/photo") ||
    mobileSrc.startsWith("data:image/")
  ) {
    merged.photo.mobileSrc = mobileSrc.startsWith("/api/photo")
      ? "/api/photo/mobile"
      : mobileSrc;
  } else {
    merged.photo.mobileSrc = "";
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

export async function readPhoto(env, slot = "desktop") {
  const key = slot === "mobile" ? PHOTO_MOBILE_KEY : PHOTO_KEY;
  const memBytes = slot === "mobile" ? "photoMobileBytes" : "photoBytes";
  const memType = slot === "mobile" ? "photoMobileType" : "photoType";
  if (env.CARD) {
    const meta = await env.CARD.getWithMetadata(key, "arrayBuffer");
    if (meta?.value) {
      return {
        bytes: meta.value,
        type: meta.metadata?.type || "image/png",
      };
    }
    return null;
  }
  if (memory[memBytes]) {
    return { bytes: memory[memBytes], type: memory[memType] };
  }
  return null;
}

export async function writePhoto(env, bytes, type = "image/png", slot = "desktop") {
  const key = slot === "mobile" ? PHOTO_MOBILE_KEY : PHOTO_KEY;
  const memBytes = slot === "mobile" ? "photoMobileBytes" : "photoBytes";
  const memType = slot === "mobile" ? "photoMobileType" : "photoType";
  if (env.CARD) {
    await env.CARD.put(key, bytes, {
      metadata: { type },
    });
  } else {
    memory[memBytes] = bytes;
    memory[memType] = type;
  }
}

export async function clearPhoto(env, slot = "desktop") {
  const key = slot === "mobile" ? PHOTO_MOBILE_KEY : PHOTO_KEY;
  const memBytes = slot === "mobile" ? "photoMobileBytes" : "photoBytes";
  const memType = slot === "mobile" ? "photoMobileType" : "photoType";
  if (env.CARD) {
    await env.CARD.delete(key);
  } else {
    memory[memBytes] = null;
    memory[memType] = "image/png";
  }
}

function assetSlot(kind) {
  if (kind === "hero") {
    return {
      key: HERO_BG_KEY,
      memBytes: "heroBgBytes",
      memType: "heroBgType",
      defaultType: "image/jpeg",
    };
  }
  if (kind === "logo") {
    return {
      key: LOGO_KEY,
      memBytes: "logoBytes",
      memType: "logoType",
      defaultType: "image/png",
    };
  }
  return null;
}

export async function readAsset(env, kind) {
  const slot = assetSlot(kind);
  if (!slot) return null;
  if (env.CARD) {
    const meta = await env.CARD.getWithMetadata(slot.key, "arrayBuffer");
    if (meta?.value) {
      return {
        bytes: meta.value,
        type: meta.metadata?.type || slot.defaultType,
      };
    }
    return null;
  }
  if (memory[slot.memBytes]) {
    return { bytes: memory[slot.memBytes], type: memory[slot.memType] };
  }
  return null;
}

export async function writeAsset(env, kind, bytes, type) {
  const slot = assetSlot(kind);
  if (!slot) throw new Error("Unknown asset kind");
  const safeType = type || slot.defaultType;
  if (env.CARD) {
    await env.CARD.put(slot.key, bytes, { metadata: { type: safeType } });
  } else {
    memory[slot.memBytes] = bytes;
    memory[slot.memType] = safeType;
  }
}

export async function clearAsset(env, kind) {
  const slot = assetSlot(kind);
  if (!slot) return;
  if (env.CARD) {
    await env.CARD.delete(slot.key);
  } else {
    memory[slot.memBytes] = null;
    memory[slot.memType] = slot.defaultType;
  }
}

export async function readResumeActive(env) {
  try {
    if (env.CARD) {
      return (await env.CARD.get(RESUME_ACTIVE_KEY, "json")) || null;
    }
    return memory.resumeActive;
  } catch {
    return null;
  }
}

export async function writeResumeActive(env, meta) {
  if (env.CARD) {
    if (meta) await env.CARD.put(RESUME_ACTIVE_KEY, JSON.stringify(meta));
    else await env.CARD.delete(RESUME_ACTIVE_KEY);
  } else {
    memory.resumeActive = meta;
  }
  return meta;
}

export async function readResumeActiveData(env) {
  try {
    if (env.CARD) {
      return (await env.CARD.get(RESUME_ACTIVE_DATA_KEY, "json")) || null;
    }
    return memory.resumeActiveData;
  } catch {
    return null;
  }
}

export async function writeResumeActiveData(env, data) {
  if (env.CARD) {
    if (data && typeof data === "object") {
      await env.CARD.put(RESUME_ACTIVE_DATA_KEY, JSON.stringify(data));
    } else {
      await env.CARD.delete(RESUME_ACTIVE_DATA_KEY);
    }
  } else {
    memory.resumeActiveData = data && typeof data === "object" ? data : null;
  }
  return data;
}

export async function clearResumeActiveData(env) {
  await writeResumeActiveData(env, null);
}

export async function readResumePdf(env) {
  if (env.CARD) {
    const meta = await env.CARD.getWithMetadata(RESUME_PDF_KEY, "arrayBuffer");
    if (meta?.value) {
      return {
        bytes: meta.value,
        type: meta.metadata?.type || "application/pdf",
        filename: meta.metadata?.filename || "Christian_Dela_Cruz_Resume.pdf",
      };
    }
    return null;
  }
  if (memory.resumePdf) {
    return {
      bytes: memory.resumePdf,
      type: memory.resumePdfType,
      filename: memory.resumePdfName,
    };
  }
  return null;
}

export async function writeResumePdf(env, bytes, type = "application/pdf", filename = "Christian_Dela_Cruz_Resume.pdf") {
  if (env.CARD) {
    await env.CARD.put(RESUME_PDF_KEY, bytes, {
      metadata: { type, filename },
    });
  } else {
    memory.resumePdf = bytes;
    memory.resumePdfType = type;
    memory.resumePdfName = filename;
  }
}

export async function clearResumePdf(env) {
  if (env.CARD) {
    await env.CARD.delete(RESUME_PDF_KEY);
  } else {
    memory.resumePdf = null;
    memory.resumePdfType = "application/pdf";
    memory.resumePdfName = "Christian_Dela_Cruz_Resume.pdf";
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

export function publicCardPayload(
  settings,
  hasCustomPhoto,
  resumeActive = null,
  assets = {}
) {
  const photoSrc = hasCustomPhoto ? `/api/photo?t=${Date.now()}` : settings.photo.src;
  const mobileCustom = Boolean(assets.hasMobilePhoto);
  const photoMobileSrc = mobileCustom
    ? `/api/photo/mobile?t=${Date.now()}`
    : settings.photo.mobileSrc || photoSrc;
  const messaging = settings.messaging || DEFAULT_SETTINGS.messaging;
  const socials = settings.socials || DEFAULT_SETTINGS.socials;
  const publicSocials = {};
  for (const [key, row] of Object.entries(socials)) {
    if (row?.enabled && row.url) publicSocials[key] = { enabled: true, url: row.url };
  }
  const stamp = Date.now();
  return {
    theme: settings.theme,
    layout: settings.layoutDesktop || settings.layout || "card",
    layoutDesktop: settings.layoutDesktop || settings.layout || "card",
    layoutMobile: settings.layoutMobile || settings.layout || "card",
    identity: settings.identity,
    photo: {
      ...settings.photo,
      src: photoSrc,
      mobileSrc: photoMobileSrc,
      hasMobilePhoto: mobileCustom || Boolean(settings.photo.mobileSrc),
    },
    assets: {
      heroBg: assets.hasHero ? `/api/asset/hero?t=${stamp}` : null,
      logo: assets.hasLogo ? `/api/asset/logo?t=${stamp}` : null,
    },
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
    socials: publicSocials,
    cardChrome: settings.cardChrome || DEFAULT_SETTINGS.cardChrome,
    resumeDownload: resumeActive && (resumeActive.hasPdf || resumeActive.hasBuilder)
      ? {
          available: true,
          name: resumeActive.name || "Resume",
          url: resumeActive.hasPdf ? "/api/resume-file" : "/resume/view",
          kind: resumeActive.hasPdf ? "pdf" : "page",
        }
      : { available: false },
  };
}
