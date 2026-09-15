import { SOCIAL_ICONS, MESSAGE_ICONS } from "/shared/icons.js";

const THEME_LABELS = {
  sky: "Sky",
  ocean: "Ocean",
  slate: "Slate",
  ember: "Ember",
  forest: "Forest",
  night: "Night",
};

const LAYOUT_META = {
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

const state = {
  settings: null,
  dirty: false,
};

const themeGrid = document.getElementById("theme-grid");
const layoutGridDesktop = document.getElementById("layout-grid-desktop");
const layoutGridMobile = document.getElementById("layout-grid-mobile");
const contactsList = document.getElementById("contacts-list");
const socialsList = document.getElementById("socials-list");
const rowTpl = document.getElementById("contact-row-tpl");
const socialTpl = document.getElementById("social-row-tpl");
const toastHost = document.getElementById("toast-host");
let currentPhotoSrc = "/images/christian-dela-cruz.png";
let currentMobilePhotoSrc = "";
let currentHeroSrc = null;
let currentLogoSrc = null;
let availableLayouts = Object.keys(LAYOUT_META);
let livePreviewRaf = 0;

function parsePos(value, fallbackX = 50, fallbackY = 20) {
  const raw = String(value || "").trim();
  const parts = raw.split(/\s+/);
  const map = {
    left: 0,
    center: 50,
    right: 100,
    top: 0,
    bottom: 100,
  };
  const toNum = (token, fallback) => {
    if (token == null) return fallback;
    if (map[token] != null) return map[token];
    const n = Number.parseFloat(String(token).replace("%", ""));
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : fallback;
  };
  if (parts.length >= 2) {
    return { x: toNum(parts[0], fallbackX), y: toNum(parts[1], fallbackY) };
  }
  if (parts.length === 1) {
    return { x: toNum(parts[0], fallbackX), y: fallbackY };
  }
  return { x: fallbackX, y: fallbackY };
}

function posString(x, y) {
  return `${Math.round(Number(x))}% ${Math.round(Number(y))}%`;
}

function deviceCropFromForm(device) {
  const x = Number(document.getElementById(`photo-${device}-x`)?.value ?? 50);
  const y = Number(document.getElementById(`photo-${device}-y`)?.value ?? 20);
  const zoomPct = Number(document.getElementById(`photo-${device}-zoom`)?.value ?? 100);
  return {
    objectFit: document.getElementById(`photo-${device}-fit`)?.value || "cover",
    objectPosition: posString(x, y),
    zoom: Math.max(1, Math.min(2.5, (Number.isFinite(zoomPct) ? zoomPct : 100) / 100)),
    size:
      document.getElementById(`photo-${device}-size`)?.value.trim() ||
      (device === "mobile" ? "92px" : "168px"),
  };
}

function setDeviceCropForm(device, crop, defaults) {
  const parsed = parsePos(crop?.objectPosition, defaults.x, defaults.y);
  const zoom = Number(crop?.zoom);
  const zoomPct = Number.isFinite(zoom) && zoom > 0 ? Math.round(zoom * 100) : 100;
  const fitEl = document.getElementById(`photo-${device}-fit`);
  const sizeEl = document.getElementById(`photo-${device}-size`);
  const xEl = document.getElementById(`photo-${device}-x`);
  const yEl = document.getElementById(`photo-${device}-y`);
  const zEl = document.getElementById(`photo-${device}-zoom`);
  if (fitEl) fitEl.value = crop?.objectFit || "cover";
  if (sizeEl) sizeEl.value = crop?.size || defaults.size;
  if (xEl) xEl.value = String(Math.round(parsed.x));
  if (yEl) yEl.value = String(Math.round(parsed.y));
  if (zEl) zEl.value = String(zoomPct);
  const xLabel = document.getElementById(`photo-${device}-x-label`);
  const yLabel = document.getElementById(`photo-${device}-y-label`);
  const zLabel = document.getElementById(`photo-${device}-zoom-label`);
  if (xLabel) xLabel.textContent = `${Math.round(parsed.x)}%`;
  if (yLabel) yLabel.textContent = `${Math.round(parsed.y)}%`;
  if (zLabel) zLabel.textContent = `${zoomPct}%`;
}

function toast(message, kind = "") {
  if (!toastHost || !message) return;
  const el = document.createElement("div");
  el.className = `toast${kind ? ` ${kind}` : ""}`;
  el.textContent = message;
  toastHost.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    el.style.transition = "all 0.2s ease";
    setTimeout(() => el.remove(), 220);
  }, 2800);
}

function iconSvg(def) {
  if (!def) return "";
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="${def.color}" d="${def.path}"/></svg>`;
}

function paintMessageIcons() {
  document.querySelectorAll("[data-icon]").forEach((el) => {
    const key = el.getAttribute("data-icon");
    el.innerHTML = iconSvg(MESSAGE_ICONS[key]);
  });
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.href = "/?unlock=1";
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    throw new Error(data.error || data.message || "Request failed");
  }
  return data;
}

function markDirty() {
  state.dirty = true;
}

function collectIdentity() {
  return {
    brand: document.getElementById("id-brand").value.trim(),
    tagline: document.getElementById("id-tagline").value.trim(),
    eyebrow: document.getElementById("id-eyebrow").value.trim(),
    name: document.getElementById("id-name").value.trim(),
    role: document.getElementById("id-role").value.trim(),
    place: document.getElementById("id-place").value.trim(),
    workLocation: document.getElementById("id-work-location").value.trim(),
    homeLocation: document.getElementById("id-home-location").value.trim(),
    org: document.getElementById("id-org").value.trim(),
    companyWebsite: document.getElementById("id-company-website").value.trim(),
    linkedin: document.getElementById("id-linkedin").value.trim(),
    note: document.getElementById("id-note").value.trim(),
  };
}

function collectMessaging() {
  return {
    whatsapp: {
      enabled: document.getElementById("msg-wa-enabled").checked,
      value: document.getElementById("msg-wa-value").value.trim(),
    },
    viber: {
      enabled: document.getElementById("msg-viber-enabled").checked,
      value: document.getElementById("msg-viber-value").value.trim(),
    },
    telegram: {
      enabled: document.getElementById("msg-tg-enabled").checked,
      value: document.getElementById("msg-tg-value").value.trim(),
    },
  };
}

function collectSocials() {
  const out = {};
  socialsList.querySelectorAll(".social-card").forEach((card) => {
    const key = card.dataset.network;
    out[key] = {
      enabled: card.querySelector("[data-social-enabled]").checked,
      url: card.querySelector("[data-social-url]").value.trim(),
    };
  });
  return out;
}

function collectPhoto() {
  const desktop = deviceCropFromForm("desktop");
  const mobile = deviceCropFromForm("mobile");
  return {
    ...state.settings.photo,
    clearBackground: document.getElementById("photo-clear-bg")?.checked || false,
    borderRadius: document.getElementById("photo-radius").value.trim() || "1rem",
    objectFit: desktop.objectFit,
    objectPosition: desktop.objectPosition,
    desktopSize: desktop.size,
    mobileSize: mobile.size,
    desktop,
    mobile,
    src: currentPhotoSrc.startsWith("/api/photo")
      ? "/api/photo"
      : (state.settings.photo?.src || currentPhotoSrc),
    mobileSrc: currentMobilePhotoSrc
      ? currentMobilePhotoSrc.startsWith("/api/photo")
        ? "/api/photo/mobile"
        : currentMobilePhotoSrc
      : "",
  };
}

function sizeLabel(value) {
  const n = Number.parseFloat(value);
  if (Number.isFinite(n)) return `${Math.round(n)}×${Math.round(n)}`;
  return value;
}

function previewIdentity() {
  return {
    eyebrow: document.getElementById("id-eyebrow")?.value || "Hello, I’m",
    name: document.getElementById("id-name")?.value || "Christian Dela Cruz",
    role: document.getElementById("id-role")?.value || "Junior Data Analyst",
    place: document.getElementById("id-place")?.value || "Dubai, UAE",
    org: document.getElementById("id-org")?.value || "",
    brand: document.getElementById("id-brand")?.value || "chrisdelacruz.com",
    tagline: document.getElementById("id-tagline")?.value || "Digital calling card",
  };
}

function applyCropToImg(img, crop, clearBg) {
  if (!img) return;
  img.style.objectFit = clearBg ? "contain" : crop.objectFit;
  img.style.objectPosition = crop.objectPosition;
  img.style.transform = `scale(${crop.zoom})`;
  img.style.transformOrigin = crop.objectPosition;
}

function applyDeviceCropLive(device) {
  const crop = deviceCropFromForm(device);
  const clearBg = document.getElementById("photo-clear-bg")?.checked;
  const radius = document.getElementById("photo-radius")?.value.trim() || "1rem";
  const src =
    device === "mobile" ? currentMobilePhotoSrc || currentPhotoSrc : currentPhotoSrc;

  document.querySelectorAll(`.live-photo[data-crop-device="${device}"]`).forEach((img) => {
    if (img.getAttribute("src") !== src) img.src = src;
    applyCropToImg(img, crop, clearBg);
  });
  document.querySelectorAll(`.live-photo-frame[data-crop-device="${device}"]`).forEach((frame) => {
    frame.style.setProperty("--live-size", crop.size);
    frame.style.setProperty("--live-radius", radius);
    frame.classList.toggle("is-clear", Boolean(clearBg));
  });

  const previewFrame = document.getElementById(`preview-${device}-frame`);
  const previewImg = document.getElementById(`preview-${device}-img`);
  if (previewFrame && previewImg) {
    previewFrame.style.width = crop.size;
    previewFrame.style.height = crop.size;
    previewFrame.style.borderRadius = radius;
    previewFrame.classList.toggle("is-clear", Boolean(clearBg));
    if (previewImg.getAttribute("src") !== src) previewImg.src = src;
    applyCropToImg(previewImg, crop, clearBg);
  }

  const x = document.getElementById(`photo-${device}-x`)?.value || "50";
  const y = document.getElementById(`photo-${device}-y`)?.value || "20";
  const z = document.getElementById(`photo-${device}-zoom`)?.value || "100";
  const xLabel = document.getElementById(`photo-${device}-x-label`);
  const yLabel = document.getElementById(`photo-${device}-y-label`);
  const zLabel = document.getElementById(`photo-${device}-zoom-label`);
  if (xLabel) xLabel.textContent = `${x}%`;
  if (yLabel) yLabel.textContent = `${y}%`;
  if (zLabel) zLabel.textContent = `${z}%`;
  const previewLabel = document.getElementById(`preview-${device}-label`);
  if (previewLabel) {
    previewLabel.textContent = `${sizeLabel(crop.size)} · ${Math.round(crop.zoom * 100)}%`;
  }
}

function scheduleLivePreviews() {
  if (document.body.classList.contains("is-crop-dragging")) return;
  if (livePreviewRaf) cancelAnimationFrame(livePreviewRaf);
  livePreviewRaf = requestAnimationFrame(() => {
    livePreviewRaf = 0;
    renderLivePreviews();
  });
}

function buildLiveCardHtml(device) {
  const id = previewIdentity();
  const theme = state.settings?.theme || "sky";
  const layout =
    device === "mobile"
      ? state.settings?.layoutMobile || "compact"
      : state.settings?.layoutDesktop || state.settings?.layout || "card";
  const crop = deviceCropFromForm(device);
  const clearBg = document.getElementById("photo-clear-bg")?.checked;
  const radius = document.getElementById("photo-radius")?.value.trim() || "1rem";
  const photoSrc =
    device === "mobile" ? currentMobilePhotoSrc || currentPhotoSrc : currentPhotoSrc;
  const showLogo = Boolean(currentLogoSrc);
  const showHero = Boolean(currentHeroSrc) && (layout === "split" || layout === "banner");
  const headline = [id.role, id.org].filter(Boolean).join(" · ") || id.tagline;
  const fit = clearBg ? "contain" : crop.objectFit;
  const chrome = state.settings?.cardChrome || collectCardChrome();
  const factsMode = chrome.factsMode || "full";
  const shareMode = chrome.shareMode || "full";
  const resumeMode = chrome.resumeMode || "full";

  const factsHtml =
    factsMode === "hidden"
      ? ""
      : factsMode === "icons"
        ? `<div class="live-facts live-facts-icons" aria-label="Contacts">
            <span class="live-fact-chip" title="Phone"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z"/></svg></span>
            <span class="live-fact-chip" title="Email"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"/></svg></span>
            <span class="live-fact-chip" title="LinkedIn"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/></svg></span>
          </div>`
        : `<div class="live-facts">
            <div><span>Phone</span><strong>+63 971 135 8319</strong></div>
            <div><span>Email</span><strong>c000business@gmail.com</strong></div>
          </div>`;

  const shareHtml =
    shareMode === "hidden"
      ? ""
      : shareMode === "icon"
        ? `<span class="live-ico-btn" title="Share"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11A2.99 2.99 0 0 0 18 7.91a3 3 0 1 0-3-3c0 .24.04.47.09.7L8.04 9.72A2.99 2.99 0 0 0 6 9a3 3 0 1 0 0 6c.9 0 1.7-.4 2.24-1.02l7.12 4.16c-.05.21-.08.43-.08.65a3 3 0 1 0 3-3z"/></svg></span>`
        : `<span class="live-share">Share</span>`;
  const resumeHtml =
    resumeMode === "hidden"
      ? ""
      : resumeMode === "icon"
        ? `<span class="live-ico-btn" title="Resume"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-6-1 4-4h-2.5V10h-3v5H8l4 4z"/></svg></span>`
        : `<span class="live-resume">Resume</span>`;

  return `
    <div class="live-card" data-layout="${escapeHtml(layout)}" data-theme="${escapeHtml(theme)}" data-device="${device}" data-facts-mode="${escapeHtml(factsMode)}" data-share-mode="${escapeHtml(shareMode)}" data-resume-mode="${escapeHtml(resumeMode)}">
      ${
        showHero
          ? `<aside class="live-hero" style="--hero-image:url('${escapeHtml(currentHeroSrc)}')">
              <p class="live-hero-brand">${escapeHtml(id.brand)}</p>
              <p class="live-hero-line">${escapeHtml(headline)}</p>
              <div class="live-hero-photo-wrap crop-stage" data-crop-device="${device}">
                <img class="live-photo" data-crop-device="${device}" src="${escapeHtml(photoSrc)}" alt="" draggable="false"
                  style="object-fit:${fit};object-position:${escapeHtml(crop.objectPosition)};transform:scale(${crop.zoom});transform-origin:${escapeHtml(crop.objectPosition)}">
              </div>
            </aside>`
          : ""
      }
      <div class="live-rail">
        <div class="live-top">
          <span class="live-brand">${escapeHtml(id.brand)}</span>
          <span class="live-tag">${escapeHtml(id.tagline)}</span>
        </div>
        ${
          showLogo
            ? `<div class="live-logo"><img src="${escapeHtml(currentLogoSrc)}" alt=""></div>`
            : ""
        }
        <div class="live-head">
          <div class="live-photo-frame crop-stage${clearBg ? " is-clear" : ""}" data-crop-device="${device}"
            style="--live-size:${escapeHtml(crop.size)};--live-radius:${escapeHtml(radius)}">
            <img class="live-photo" data-crop-device="${device}" src="${escapeHtml(photoSrc)}" alt="" draggable="false"
              style="object-fit:${fit};object-position:${escapeHtml(crop.objectPosition)};transform:scale(${crop.zoom});transform-origin:${escapeHtml(crop.objectPosition)}">
          </div>
          <div class="live-id">
            <p class="live-eyebrow">${escapeHtml(id.eyebrow)}</p>
            <h3 class="live-name">${escapeHtml(id.name)}</h3>
            <p class="live-role">${escapeHtml(id.role)}</p>
            <p class="live-place">${escapeHtml(id.place)}</p>
            ${id.org ? `<p class="live-org">${escapeHtml(id.org)}</p>` : ""}
          </div>
        </div>
        ${factsHtml}
        <div class="live-actions">
          <span class="live-cta">Save to Contacts</span>
          ${resumeHtml}
          ${shareHtml}
          <span class="live-qr" aria-hidden="true"></span>
        </div>
      </div>
    </div>
  `;
}

function bindLiveCropSurfaces(stage, device) {
  stage.querySelectorAll(`[data-crop-device="${device}"]`).forEach((el) => {
    if (el.dataset.cropBound === "1") return;
    el.dataset.cropBound = "1";
    el.addEventListener("pointerdown", (e) => {
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      startCropDrag(device, e);
    });
  });
}

function renderLivePreviews() {
  const desktopStage = document.getElementById("live-stage-desktop");
  const mobileStage = document.getElementById("live-stage-mobile");
  if (!desktopStage || !mobileStage) return;

  const desktopLayout = state.settings?.layoutDesktop || state.settings?.layout || "card";
  const mobileLayout = state.settings?.layoutMobile || "compact";
  const desktopLabel = document.getElementById("live-desktop-layout-label");
  const mobileLabel = document.getElementById("live-mobile-layout-label");
  if (desktopLabel) desktopLabel.textContent = LAYOUT_META[desktopLayout]?.label || desktopLayout;
  if (mobileLabel) mobileLabel.textContent = LAYOUT_META[mobileLayout]?.label || mobileLayout;

  desktopStage.innerHTML = buildLiveCardHtml("desktop");
  mobileStage.innerHTML = buildLiveCardHtml("mobile");
  bindLiveCropSurfaces(desktopStage, "desktop");
  bindLiveCropSurfaces(mobileStage, "mobile");
}

function startCropDrag(device, e) {
  const xEl = document.getElementById(`photo-${device}-x`);
  const yEl = document.getElementById(`photo-${device}-y`);
  if (!xEl || !yEl) return;
  let lastX = e.clientX;
  let lastY = e.clientY;
  const target = e.currentTarget;
  target.classList?.add("is-dragging");
  document.body.classList.add("is-crop-dragging");

  const onMove = (ev) => {
    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    const nextX = Math.min(100, Math.max(0, Number(xEl.value) - dx * 0.45));
    const nextY = Math.min(100, Math.max(0, Number(yEl.value) - dy * 0.45));
    xEl.value = String(Math.round(nextX));
    yEl.value = String(Math.round(nextY));
    markDirty();
    applyDeviceCropLive(device);
  };

  const onUp = () => {
    target.classList?.remove("is-dragging");
    document.body.classList.remove("is-crop-dragging");
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    syncPhotoPreviews();
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}

function syncPhotoPreviews() {
  const radius = document.getElementById("photo-radius")?.value.trim() || "1rem";
  const desktop = deviceCropFromForm("desktop");
  const mobile = deviceCropFromForm("mobile");
  const clearBg = document.getElementById("photo-clear-bg")?.checked;

  const applyFrame = (frame, img, crop, src) => {
    if (!frame || !img) return;
    frame.style.width = crop.size;
    frame.style.height = crop.size;
    frame.style.borderRadius = radius;
    frame.style.setProperty("--preview-radius", radius);
    frame.style.setProperty("--preview-fit", crop.objectFit);
    frame.style.setProperty("--preview-pos", crop.objectPosition);
    frame.style.setProperty("--preview-zoom", String(crop.zoom));
    frame.style.overflow = "hidden";
    frame.classList.toggle("is-clear", Boolean(clearBg));

    if (img.getAttribute("src") !== src) img.src = src;
    applyCropToImg(img, crop, clearBg);
    img.style.width = "100%";
    img.style.height = "100%";
  };

  applyFrame(
    document.getElementById("preview-desktop-frame"),
    document.getElementById("preview-desktop-img"),
    desktop,
    currentPhotoSrc
  );
  applyFrame(
    document.getElementById("preview-mobile-frame"),
    document.getElementById("preview-mobile-img"),
    mobile,
    currentMobilePhotoSrc || currentPhotoSrc
  );

  const desktopLabel = document.getElementById("preview-desktop-label");
  const mobileLabel = document.getElementById("preview-mobile-label");
  if (desktopLabel) desktopLabel.textContent = `${sizeLabel(desktop.size)} · ${Math.round(desktop.zoom * 100)}%`;
  if (mobileLabel) mobileLabel.textContent = `${sizeLabel(mobile.size)} · ${Math.round(mobile.zoom * 100)}%`;

  for (const device of ["desktop", "mobile"]) {
    const x = document.getElementById(`photo-${device}-x`)?.value || "50";
    const y = document.getElementById(`photo-${device}-y`)?.value || "20";
    const z = document.getElementById(`photo-${device}-zoom`)?.value || "100";
    const xLabel = document.getElementById(`photo-${device}-x-label`);
    const yLabel = document.getElementById(`photo-${device}-y-label`);
    const zLabel = document.getElementById(`photo-${device}-zoom-label`);
    if (xLabel) xLabel.textContent = `${x}%`;
    if (yLabel) yLabel.textContent = `${y}%`;
    if (zLabel) zLabel.textContent = `${z}%`;
  }

  const name = document.getElementById("id-name")?.value || "Christian Dela Cruz";
  const role = document.getElementById("id-role")?.value || "Junior Data Analyst";
  const place = document.getElementById("id-place")?.value || "Dubai, UAE";
  const org = document.getElementById("id-org")?.value || "Company";
  const eyebrow = document.getElementById("id-eyebrow")?.value || "Hello, I’m";
  document.querySelectorAll(".mock-eyebrow").forEach((el) => {
    el.textContent = eyebrow;
  });
  document.querySelectorAll(".mock-name").forEach((el) => {
    el.textContent = name;
  });
  document.querySelectorAll(".mock-role").forEach((el) => {
    el.textContent = role;
  });
  document.querySelectorAll(".mock-copy").forEach((copy) => {
    const metas = copy.querySelectorAll(".mock-meta");
    if (metas[0]) metas[0].textContent = place;
    if (metas[1]) metas[1].textContent = org || "Company";
  });

  scheduleLivePreviews();
}

function collectContacts() {
  return [...contactsList.querySelectorAll(".contact-row")].map((row, i) => ({
    id: row.dataset.id || `contact-${i}`,
    type: row.querySelector(".c-type").value,
    label: row.querySelector(".c-label").value.trim() || "Contact",
    value: row.querySelector(".c-value").value.trim(),
    visible: row.querySelector(".c-visible input").checked,
  })).filter((c) => c.value);
}

function fillIdentity(identity) {
  document.getElementById("id-brand").value = identity.brand || "";
  document.getElementById("id-tagline").value = identity.tagline || "";
  document.getElementById("id-eyebrow").value = identity.eyebrow || "";
  document.getElementById("id-name").value = identity.name || "";
  document.getElementById("id-role").value = identity.role || "";
  document.getElementById("id-place").value = identity.place || "";
  document.getElementById("id-work-location").value = identity.workLocation || identity.place || "";
  document.getElementById("id-home-location").value = identity.homeLocation || "";
  document.getElementById("id-org").value = identity.org || "";
  document.getElementById("id-company-website").value = identity.companyWebsite || "";
  document.getElementById("id-linkedin").value = identity.linkedin || "";
  document.getElementById("id-note").value = identity.note || "";
}

function fillMessaging(messaging = {}) {
  const wa = messaging.whatsapp || {};
  const vb = messaging.viber || {};
  const tg = messaging.telegram || {};
  document.getElementById("msg-wa-enabled").checked = Boolean(wa.enabled);
  document.getElementById("msg-wa-value").value = wa.value || "";
  document.getElementById("msg-viber-enabled").checked = Boolean(vb.enabled);
  document.getElementById("msg-viber-value").value = vb.value || "";
  document.getElementById("msg-tg-enabled").checked = Boolean(tg.enabled);
  document.getElementById("msg-tg-value").value = tg.value || "";
}

function fillCardChrome(chrome = {}) {
  const facts = chrome.factsMode || "full";
  const share = chrome.shareMode || "full";
  const resume = chrome.resumeMode || "full";
  const setRadio = (name, value) => {
    const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (el) el.checked = true;
  };
  setRadio("chrome-facts", facts);
  setRadio("chrome-share", share);
  setRadio("chrome-resume", resume);
  if (!state.settings.cardChrome) state.settings.cardChrome = {};
  state.settings.cardChrome = { factsMode: facts, shareMode: share, resumeMode: resume };
}

function collectCardChrome() {
  const picked = (name, fallback) =>
    document.querySelector(`input[name="${name}"]:checked`)?.value || fallback;
  return {
    factsMode: picked("chrome-facts", "full"),
    shareMode: picked("chrome-share", "full"),
    resumeMode: picked("chrome-resume", "full"),
  };
}

function bindCardChromeControls() {
  document.querySelectorAll(".chrome-options input").forEach((input) => {
    input.addEventListener("change", () => {
      if (!state.settings) return;
      state.settings.cardChrome = collectCardChrome();
      markDirty();
      scheduleLivePreviews();
    });
  });
}

function fillPhoto(photo, hasCustomPhoto, hasMobilePhoto = false) {
  document.getElementById("photo-radius").value = photo.borderRadius || "1rem";
  const clearEl = document.getElementById("photo-clear-bg");
  if (clearEl) clearEl.checked = Boolean(photo.clearBackground);

  const desktop = photo.desktop || {
    objectFit: photo.objectFit || "cover",
    objectPosition: photo.objectPosition || "50% 20%",
    zoom: 1,
    size: photo.desktopSize || "168px",
  };
  const mobile = photo.mobile || {
    objectFit: photo.objectFit || "cover",
    objectPosition: photo.objectPosition || "50% 18%",
    zoom: 1,
    size: photo.mobileSize || "92px",
  };
  setDeviceCropForm("desktop", desktop, { x: 50, y: 20, size: "168px" });
  setDeviceCropForm("mobile", mobile, { x: 50, y: 18, size: "92px" });

  currentPhotoSrc = hasCustomPhoto
    ? `/api/photo?t=${Date.now()}`
    : (photo.src || "/images/christian-dela-cruz.png");
  currentMobilePhotoSrc = hasMobilePhoto
    ? `/api/photo/mobile?t=${Date.now()}`
    : (photo.mobileSrc && photo.mobileSrc.startsWith("/api/photo")
      ? `/api/photo/mobile?t=${Date.now()}`
      : "");
  syncPhotoPreviews();
}

function syncLayoutAssetsHelp() {
  const desktop = state.settings?.layoutDesktop || state.settings?.layout || "card";
  const mobile = state.settings?.layoutMobile || desktop;
  const needs = new Set([
    ...(LAYOUT_META[desktop]?.needs || []),
    ...(LAYOUT_META[mobile]?.needs || []),
  ]);
  const help = document.getElementById("layout-assets-help");
  const pairHelp = document.getElementById("layout-pair-help");
  const labels = [...needs].map((n) => {
    if (n === "hero") return "hero/background";
    if (n === "logo") return "company logo";
    if (n === "clearPhoto") return "clear PNG photo";
    return n;
  });
  const summary = labels.length
    ? `Recommended assets for your mix: ${labels.join(" + ")}.`
    : "Your mix works without extra assets. You can still upload a logo or background under Assets.";
  if (help) help.textContent = `${summary} Missing assets stay hidden — no empty placeholders.`;
  if (pairHelp) {
    pairHelp.textContent = `${LAYOUT_META[desktop]?.label || desktop} on laptop · ${LAYOUT_META[mobile]?.label || mobile} on phone. ${summary}`;
  }
  document.querySelectorAll(".asset-card").forEach((card) => {
    const kind = card.dataset.asset;
    const needed =
      (kind === "hero" && needs.has("hero")) ||
      (kind === "logo" && needs.has("logo"));
    card.classList.toggle("is-recommended", needed);
    const badge = document.getElementById(`${kind}-need-badge`);
    if (badge) badge.textContent = needed ? "Recommended" : "Optional";
  });
}

function setAssetPreview(kind, src) {
  const el = document.getElementById(`${kind}-preview`);
  if (!el) return;
  if (kind === "hero") currentHeroSrc = src || null;
  if (kind === "logo") currentLogoSrc = src || null;
  if (src) {
    el.innerHTML = `<img src="${src}" alt="">`;
  } else {
    el.innerHTML = `<span>No ${kind === "logo" ? "logo" : "image"}</span>`;
  }
  scheduleLivePreviews();
}

function bestForLabel(meta, device) {
  const best = meta.bestFor || [];
  if (best.includes(device) && best.length === 1) {
    return device === "mobile" ? "Best on phone" : "Best on laptop";
  }
  if (best.includes(device)) return "Great fit";
  return "Also works";
}

function renderLayoutGrid(grid, device, active, layouts) {
  if (!grid) return;
  grid.innerHTML = "";
  for (const layout of layouts) {
    const meta = LAYOUT_META[layout] || { label: layout, help: "", needs: [], bestFor: [] };
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `layout-swatch${layout === active ? " is-active" : ""}`;
    btn.dataset.layout = layout;
    btn.innerHTML = `<span class="layout-best">${bestForLabel(meta, device)}</span><strong>${meta.label}</strong><span>${meta.help}</span>`;
    btn.addEventListener("click", () => {
      if (device === "mobile") state.settings.layoutMobile = layout;
      else {
        state.settings.layoutDesktop = layout;
        state.settings.layout = layout;
      }
      markDirty();
      grid.querySelectorAll(".layout-swatch").forEach((el) => {
        el.classList.toggle("is-active", el.dataset.layout === layout);
      });
      syncLayoutAssetsHelp();
      scheduleLivePreviews();
    });
    grid.appendChild(btn);
  }
}

function renderLayouts(desktopActive, mobileActive, layouts, metaMap = LAYOUT_META) {
  Object.assign(LAYOUT_META, metaMap || {});
  availableLayouts = layouts?.length ? layouts : Object.keys(LAYOUT_META);
  renderLayoutGrid(layoutGridDesktop, "desktop", desktopActive, availableLayouts);
  renderLayoutGrid(layoutGridMobile, "mobile", mobileActive, availableLayouts);
  syncLayoutAssetsHelp();
}

function renderThemes(active, themes) {
  themeGrid.innerHTML = "";
  for (const theme of themes) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `theme-swatch${theme === active ? " is-active" : ""}`;
    btn.dataset.theme = theme;
    btn.textContent = THEME_LABELS[theme] || theme;
    btn.addEventListener("click", () => {
      state.settings.theme = theme;
      markDirty();
      themeGrid.querySelectorAll(".theme-swatch").forEach((el) => {
        el.classList.toggle("is-active", el.dataset.theme === theme);
      });
      scheduleLivePreviews();
    });
    themeGrid.appendChild(btn);
  }
}

function addContactRow(contact = null) {
  const node = rowTpl.content.firstElementChild.cloneNode(true);
  node.dataset.id = contact?.id || `contact-${crypto.randomUUID()}`;
  node.querySelector(".c-type").value = contact?.type || "phone";
  node.querySelector(".c-label").value = contact?.label || "";
  node.querySelector(".c-value").value = contact?.value || "";
  node.querySelector(".c-visible input").checked = contact?.visible !== false;

  node.querySelector(".c-delete").addEventListener("click", () => {
    node.remove();
    markDirty();
  });
  node.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("input", markDirty);
    el.addEventListener("change", markDirty);
  });

  contactsList.appendChild(node);
}

function renderContacts(contacts) {
  contactsList.innerHTML = "";
  (contacts || []).forEach(addContactRow);
}

function renderSocials(socials = {}) {
  socialsList.innerHTML = "";
  for (const [key, meta] of Object.entries(SOCIAL_ICONS)) {
    const node = socialTpl.content.firstElementChild.cloneNode(true);
    node.dataset.network = key;
    const icon = node.querySelector("[data-social-icon]");
    icon.innerHTML = iconSvg(meta);
    node.querySelector("[data-social-label]").textContent = meta.label;
    const enabled = node.querySelector("[data-social-enabled]");
    const url = node.querySelector("[data-social-url]");
    const row = socials[key] || {};
    enabled.checked = Boolean(row.enabled);
    url.value = row.url || "";
    enabled.addEventListener("change", markDirty);
    url.addEventListener("input", markDirty);
    socialsList.appendChild(node);
  }
}

function bindTabs() {
  const tabs = [...document.querySelectorAll(".tab")];
  const panels = {
    appearance: document.getElementById("panel-appearance"),
    details: document.getElementById("panel-details"),
    contacts: document.getElementById("panel-contacts"),
    messaging: document.getElementById("panel-messaging"),
    socials: document.getElementById("panel-socials"),
    resume: document.getElementById("panel-resume"),
    security: document.getElementById("panel-security"),
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const id = tab.dataset.tab;
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      Object.entries(panels).forEach(([key, panel]) => {
        panel.hidden = key !== id;
        panel.classList.toggle("is-active", key === id);
      });
      if (id === "resume") loadResumes();
    });
  });

  bindSubTabs();
}

function bindSubTabs() {
  const root = document.getElementById("panel-appearance");
  if (!root) return;
  const tabs = [...root.querySelectorAll(".subtab")];
  const panels = [...root.querySelectorAll("[data-subpanel]")];
  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const id = tab.dataset.subtab;
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      panels.forEach((panel) => {
        const on = panel.dataset.subpanel === id;
        panel.hidden = !on;
        panel.classList.toggle("is-active", on);
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function resizeImage(file, maxEdge = 1200, quality = 0.86) {
  const keepPng =
    document.getElementById("photo-clear-bg")?.checked ||
    file.type === "image/png" ||
    file.type === "image/webp";

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!keepPng) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (!blob) reject(new Error("Could not process image"));
          else resolve({ blob, filename: keepPng ? "photo.png" : "photo.jpg" });
        },
        keepPng ? "image/png" : "image/jpeg",
        keepPng ? undefined : quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

async function loadResumes() {
  const list = document.getElementById("resume-list");
  const empty = document.getElementById("resume-empty");
  const activeBox = document.getElementById("resume-active-box");
  if (!list) return;

  try {
    const [versionsRes, activeRes] = await Promise.all([
      fetch("/api/resume-versions", { credentials: "same-origin" }),
      api("/api/admin/resume-active"),
    ]);
    if (versionsRes.status === 401) {
      window.location.href = "/?unlock=1";
      return;
    }
    const versions = versionsRes.ok ? await versionsRes.json() : [];
    const active = activeRes.active;
    state.resumeActive = active;

    list.innerHTML = "";
    if (!Array.isArray(versions) || versions.length === 0) {
      empty.hidden = false;
    } else {
      empty.hidden = true;
      for (const version of versions) {
        const row = document.createElement("article");
        const isActive = active?.id === version.id;
        row.className = `resume-item${isActive ? " is-active" : ""}`;
        row.innerHTML = `
          <div>
            <h3>${escapeHtml(version.name || "Untitled")}${isActive ? '<span class="badge">Active</span>' : ""}</h3>
            <p>Updated ${escapeHtml(formatDate(version.updatedAt))}</p>
          </div>
          <button type="button" class="btn ${isActive ? "btn-secondary" : "btn-primary"}" data-resume-id="${escapeHtml(version.id)}" data-resume-name="${escapeHtml(version.name || "Resume")}">
            ${isActive ? "Active" : "Set active"}
          </button>
        `;
        const btn = row.querySelector("button");
        btn.addEventListener("click", () => setActiveResume(version));
        list.appendChild(row);
      }
    }

    if (active) {
      activeBox.hidden = false;
      document.getElementById("resume-active-name").textContent = active.name || "Resume";
      if (active.hasPdf) {
        document.getElementById("resume-active-meta").textContent =
          "Public card serves your uploaded PDF.";
      } else if (active.hasBuilder) {
        document.getElementById("resume-active-meta").textContent =
          "Public card opens the builder profile as a live resume page — no PDF needed.";
      } else {
        document.getElementById("resume-active-meta").textContent =
          "Active, but no builder profile data yet. Re-set active after saving in the builder.";
      }
    } else {
      activeBox.hidden = true;
    }
  } catch (err) {
    toast(err.message || "Could not load resumes", "is-error");
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value || "";
  }
}

async function setActiveResume(version) {
  toast("Setting active resume…");
  try {
    const data = await api("/api/admin/resume-active", {
      method: "POST",
      body: JSON.stringify({
        id: version.id,
        name: version.name || "Resume",
        data: version.data || null,
      }),
    });
    state.resumeActive = data.active;
    toast("Active resume updated. Visitors will see this builder profile.", "is-ok");
    await loadResumes();
  } catch (err) {
    toast(err.message || "Could not set active resume", "is-error");
  }
}

async function load() {
  toast("Loading…");
  try {
    const data = await api("/api/admin/settings");
    state.settings = data.settings;
    fillIdentity(data.settings.identity);
    fillMessaging(data.settings.messaging);
    fillCardChrome(data.settings.cardChrome);
    fillPhoto(data.settings.photo, data.hasCustomPhoto, data.hasMobilePhoto);
    renderLayouts(
      data.settings.layoutDesktop || data.settings.layout || "card",
      data.settings.layoutMobile || data.settings.layout || "compact",
      data.layouts || Object.keys(LAYOUT_META),
      data.layoutMeta
    );
    renderThemes(data.settings.theme, data.themes || Object.keys(THEME_LABELS));
    setAssetPreview("hero", data.heroSrc);
    setAssetPreview("logo", data.logoSrc);
    renderContacts(data.settings.contacts);
    renderSocials(data.settings.socials);
    await loadResumes();
    toast("Admin ready", "is-ok");
  } catch (err) {
    if (err.message !== "unauthorized") {
      toast(err.message || "Could not load settings", "is-error");
    }
  }
}

async function save() {
  if (!state.settings) return;
  const payload = {
    ...state.settings,
    theme: state.settings.theme,
    layout: state.settings.layoutDesktop || state.settings.layout || "card",
    layoutDesktop: state.settings.layoutDesktop || state.settings.layout || "card",
    layoutMobile: state.settings.layoutMobile || state.settings.layout || "compact",
    identity: collectIdentity(),
    messaging: collectMessaging(),
    socials: collectSocials(),
    photo: collectPhoto(),
    contacts: collectContacts(),
    cardChrome: collectCardChrome(),
  };

  toast("Saving…");
  try {
    const data = await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ settings: payload }),
    });
    state.settings = data.settings;
    state.dirty = false;
    toast("Saved. Public card updated.", "is-ok");
  } catch (err) {
    toast(err.message || "Save failed", "is-error");
  }
}

document.getElementById("add-contact").addEventListener("click", () => {
  addContactRow({
    id: `contact-${crypto.randomUUID()}`,
    type: "phone",
    label: "Smart",
    value: "",
    visible: true,
  });
  markDirty();
});

document.getElementById("save-btn").addEventListener("click", save);

document.getElementById("resume-refresh")?.addEventListener("click", () => {
  loadResumes();
});

document.getElementById("resume-clear-active")?.addEventListener("click", async () => {
  toast("Clearing active resume…");
  try {
    await api("/api/admin/resume-active", { method: "DELETE" });
    state.resumeActive = null;
    toast("Public resume download cleared.", "is-ok");
    await loadResumes();
  } catch (err) {
    toast(err.message || "Could not clear active resume", "is-error");
  }
});

document.getElementById("resume-pdf-file")?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!state.resumeActive?.id) {
    toast("Set an active resume first.", "is-error");
    e.target.value = "";
    return;
  }
  toast("Uploading PDF…");
  try {
    const form = new FormData();
    form.append("id", state.resumeActive.id);
    form.append("name", state.resumeActive.name || "Resume");
    form.append("pdf", file, file.name || "resume.pdf");
    const res = await fetch("/api/admin/resume-active", {
      method: "POST",
      credentials: "same-origin",
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      window.location.href = "/?unlock=1";
      return;
    }
    if (!res.ok) throw new Error(data.error || "Upload failed");
    state.resumeActive = data.active;
    toast("PDF ready. Public card will download this file.", "is-ok");
    await loadResumes();
  } catch (err) {
    toast(err.message || "PDF upload failed", "is-error");
  } finally {
    e.target.value = "";
  }
});

document.getElementById("password-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const currentPassword = document.getElementById("pw-current").value;
  const newPassword = document.getElementById("pw-new").value;
  const confirmPassword = document.getElementById("pw-confirm").value;

  if (newPassword !== confirmPassword) {
    toast("New passwords do not match.", "is-error");
    return;
  }

  toast("Updating password…");
  try {
    await api("/api/admin/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    document.getElementById("password-form").reset();
    toast("Password updated. Use it next time you unlock.", "is-ok");
  } catch (err) {
    toast(err.message || "Could not update password", "is-error");
  }
});

document.getElementById("lock-btn").addEventListener("click", async () => {
  await fetch("/api/lock", { method: "POST", credentials: "same-origin" });
  sessionStorage.removeItem("resume_unlocked");
  window.location.href = "/";
});

async function uploadDevicePhoto(slot, file) {
  toast(`Uploading ${slot === "mobile" ? "phone" : "laptop"} photo…`);
  const processed = await resizeImage(file);
  const form = new FormData();
  form.append("slot", slot);
  form.append("photo", processed.blob, processed.filename);
  const res = await fetch("/api/admin/photo", {
    method: "POST",
    credentials: "same-origin",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.href = "/?unlock=1";
    return;
  }
  if (!res.ok) throw new Error(data.error || "Upload failed");
  if (slot === "mobile") {
    currentMobilePhotoSrc = data.src;
    if (state.settings) state.settings.photo.mobileSrc = "/api/photo/mobile";
  } else {
    currentPhotoSrc = data.src;
    if (state.settings) state.settings.photo.src = "/api/photo";
  }
  syncPhotoPreviews();
  toast(`${slot === "mobile" ? "Phone" : "Laptop"} photo updated.`, "is-ok");
}

document.getElementById("photo-file-desktop")?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    await uploadDevicePhoto("desktop", file);
  } catch (err) {
    toast(err.message || "Upload failed", "is-error");
  } finally {
    e.target.value = "";
  }
});

document.getElementById("photo-file-mobile")?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    await uploadDevicePhoto("mobile", file);
  } catch (err) {
    toast(err.message || "Upload failed", "is-error");
  } finally {
    e.target.value = "";
  }
});

document.getElementById("photo-reset-desktop")?.addEventListener("click", async () => {
  toast("Resetting laptop photo…");
  try {
    const data = await api("/api/admin/photo?slot=desktop", { method: "DELETE" });
    currentPhotoSrc = data.src;
    if (state.settings) state.settings.photo.src = data.src;
    syncPhotoPreviews();
    toast("Default laptop photo restored.", "is-ok");
  } catch (err) {
    toast(err.message || "Reset failed", "is-error");
  }
});

document.getElementById("photo-reset-mobile")?.addEventListener("click", async () => {
  toast("Clearing phone photo…");
  try {
    await api("/api/admin/photo?slot=mobile", { method: "DELETE" });
    currentMobilePhotoSrc = "";
    if (state.settings) state.settings.photo.mobileSrc = "";
    syncPhotoPreviews();
    toast("Phone now uses the laptop photo.", "is-ok");
  } catch (err) {
    toast(err.message || "Reset failed", "is-error");
  }
});

function bindCropDrag(frameId, device) {
  const frame = document.getElementById(frameId);
  if (!frame) return;
  frame.addEventListener("pointerdown", (e) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    startCropDrag(device, e);
  });
}

bindCropDrag("preview-desktop-frame", "desktop");
bindCropDrag("preview-mobile-frame", "mobile");

["id-brand", "id-tagline", "id-eyebrow", "id-name", "id-role", "id-place", "id-org"].forEach((id) => {
  document.getElementById(id)?.addEventListener("input", () => scheduleLivePreviews());
});

const photoControls = document.querySelector(".photo-controls");
if (photoControls) {
  const bumpPreview = (e) => {
    markDirty();
    const id = e?.target?.id || "";
    if (/photo-(desktop|mobile)-(x|y|zoom|fit|size)/.test(id) || id === "photo-radius") {
      const device = id.includes("mobile") ? "mobile" : "desktop";
      if (/-(x|y|zoom)$/.test(id)) {
        applyDeviceCropLive(device);
        return;
      }
    }
    syncPhotoPreviews();
  };
  photoControls.addEventListener("input", bumpPreview);
  photoControls.addEventListener("change", bumpPreview);
}

document.getElementById("photo-clear-bg")?.addEventListener("change", () => {
  markDirty();
  syncPhotoPreviews();
});

async function uploadAsset(kind, file) {
  toast(`Uploading ${kind === "logo" ? "logo" : "background"}…`);
  const form = new FormData();
  form.append("kind", kind);
  form.append("file", file, file.name || `${kind}.png`);
  const res = await fetch("/api/admin/asset", {
    method: "POST",
    credentials: "same-origin",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.href = "/?unlock=1";
    return;
  }
  if (!res.ok) throw new Error(data.error || "Upload failed");
  setAssetPreview(kind, data.src);
  toast(`${kind === "logo" ? "Logo" : "Background"} updated.`, "is-ok");
}

document.getElementById("hero-file")?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    await uploadAsset("hero", file);
  } catch (err) {
    toast(err.message || "Upload failed", "is-error");
  } finally {
    e.target.value = "";
  }
});

document.getElementById("logo-file")?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    await uploadAsset("logo", file);
  } catch (err) {
    toast(err.message || "Upload failed", "is-error");
  } finally {
    e.target.value = "";
  }
});

document.getElementById("hero-reset")?.addEventListener("click", async () => {
  try {
    await api("/api/admin/asset?kind=hero", { method: "DELETE" });
    setAssetPreview("hero", null);
    toast("Background removed.", "is-ok");
  } catch (err) {
    toast(err.message || "Remove failed", "is-error");
  }
});

document.getElementById("logo-reset")?.addEventListener("click", async () => {
  try {
    await api("/api/admin/asset?kind=logo", { method: "DELETE" });
    setAssetPreview("logo", null);
    toast("Logo removed.", "is-ok");
  } catch (err) {
    toast(err.message || "Remove failed", "is-error");
  }
});

[
  "id-brand",
  "id-tagline",
  "id-eyebrow",
  "id-name",
  "id-role",
  "id-place",
  "id-work-location",
  "id-home-location",
  "id-org",
  "id-company-website",
  "id-linkedin",
  "id-note",
  "msg-wa-value",
  "msg-viber-value",
  "msg-tg-value",
].forEach((id) => {
  document.getElementById(id).addEventListener("input", () => {
    markDirty();
    if (["id-name", "id-role", "id-place", "id-org", "id-eyebrow"].includes(id)) {
      syncPhotoPreviews();
    }
  });
});

[
  "msg-wa-enabled",
  "msg-viber-enabled",
  "msg-tg-enabled",
].forEach((id) => {
  document.getElementById(id).addEventListener("change", markDirty);
});

window.addEventListener("beforeunload", (e) => {
  if (state.dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});

paintMessageIcons();
bindTabs();
bindCardChromeControls();
load();
