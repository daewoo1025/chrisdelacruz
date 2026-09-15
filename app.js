import { SOCIAL_ICONS, MESSAGE_ICONS } from "/shared/icons.js";

(() => {
  const statusEl = document.getElementById("status");
  const saveBtn = document.getElementById("save-contact");
  const appleBtn = document.getElementById("apple-wallet");
  const googleBtn = document.getElementById("google-wallet");
  const photo = document.getElementById("profile-photo");
  const modal = document.getElementById("unlock-modal");
  const form = document.getElementById("unlock-form");
  const passwordInput = document.getElementById("unlock-password");
  const errorEl = document.getElementById("unlock-error");
  const submitBtn = document.getElementById("unlock-submit");

  let unlockClicks = 0;
  let unlockClickTimer = null;
  let cardData = null;
  const LAYOUT_MQ = window.matchMedia("(max-width: 860px)");

  function resolveLayout(data) {
    const known = ["card", "split", "banner", "logo", "studio", "compact"];
    const desktop = known.includes(data.layoutDesktop)
      ? data.layoutDesktop
      : known.includes(data.layout)
        ? data.layout
        : "card";
    const mobile = known.includes(data.layoutMobile) ? data.layoutMobile : desktop;
    return LAYOUT_MQ.matches ? mobile : desktop;
  }

  function setStatus(message, kind = "") {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.classList.remove("is-error", "is-ok");
    if (kind) statusEl.classList.add(kind);
  }

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function displayValue(contact) {
    if (contact.type === "phone") {
      const raw = contact.value.replace(/[^\d+]/g, "");
      if (raw.startsWith("+63") && raw.length >= 12) {
        return `+63 ${raw.slice(3, 6)} ${raw.slice(6, 9)} ${raw.slice(9)}`;
      }
      return contact.value;
    }
    if (contact.type === "link") {
      try {
        const u = new URL(contact.value);
        return u.host.replace(/^www\./, "") + (u.pathname === "/" ? "" : u.pathname.replace(/\/$/, ""));
      } catch {
        return contact.value;
      }
    }
    return contact.value;
  }

  function hrefFor(contact) {
    if (contact.type === "phone") return `tel:${contact.value.replace(/[^\d+]/g, "")}`;
    if (contact.type === "email") return `mailto:${contact.value}`;
    return contact.value;
  }

  function digitsOnly(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function messagingHref(kind, value) {
    const v = String(value || "").trim();
    if (!v) return null;
    if (kind === "whatsapp") return `https://wa.me/${digitsOnly(v)}`;
    if (kind === "viber") return `viber://chat?number=${encodeURIComponent(digitsOnly(v))}`;
    if (kind === "telegram") {
      const user = v.replace(/^@/, "");
      if (/^\+?\d+$/.test(user)) return `https://t.me/+${digitsOnly(user)}`;
      return `https://t.me/${encodeURIComponent(user)}`;
    }
    return null;
  }

  function iconMarkup(def) {
    if (!def) return "";
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="${def.color}" d="${def.path}"/></svg>`;
  }

  function renderMessaging(messaging = {}) {
    const row = document.getElementById("messaging-row");
    if (!row) return 0;
    row.innerHTML = "";
    let shown = 0;
    for (const [key, meta] of Object.entries(MESSAGE_ICONS)) {
      const cfg = messaging[key];
      if (!cfg?.enabled || !cfg.value) continue;
      const href = messagingHref(key, cfg.value);
      if (!href) continue;
      const a = document.createElement("a");
      a.className = "connect-link connect-link-msg";
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.title = meta.label;
      a.setAttribute("aria-label", meta.label);
      a.innerHTML = iconMarkup(meta);
      row.appendChild(a);
      shown += 1;
    }
    row.hidden = shown === 0;
    return shown;
  }

  function renderSocials(socials = {}) {
    const row = document.getElementById("social-row");
    if (!row) return 0;
    row.innerHTML = "";
    let shown = 0;
    for (const [key, meta] of Object.entries(SOCIAL_ICONS)) {
      const cfg = socials[key];
      if (!cfg?.enabled || !cfg.url) continue;
      const a = document.createElement("a");
      a.className = "connect-link connect-link-social";
      a.href = cfg.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.title = meta.label;
      a.setAttribute("aria-label", meta.label);
      a.innerHTML = iconMarkup(meta);
      row.appendChild(a);
      shown += 1;
    }
    row.hidden = shown === 0;
    return shown;
  }

  function layoutConnectRow(socialCount, messagingCount) {
    const connect = document.getElementById("connect-row");
    if (!connect) return;
    const total = socialCount + messagingCount;
    connect.hidden = total === 0;
    connect.classList.toggle("is-pair", socialCount === 1 && messagingCount === 1);
    connect.classList.toggle("is-sparse", total > 0 && total <= 2);
  }

  function factIcon(type, contact = null) {
    const label = `${contact?.label || ""} ${contact?.value || ""}`.toLowerCase();
    if (type === "phone") {
      return `<svg class="fact-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z"/></svg>`;
    }
    if (type === "email") {
      return `<svg class="fact-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"/></svg>`;
    }
    if (label.includes("linkedin")) {
      return `<svg class="fact-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.23 0z"/></svg>`;
    }
    return `<svg class="fact-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.9 12c0-1.7 1.4-3.1 3.1-3.1h4V7H7c-2.8 0-5 2.2-5 5s2.2 5 5 5h4v-1.9H7c-1.7 0-3.1-1.4-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.7 0 3.1 1.4 3.1 3.1s-1.4 3.1-3.1 3.1h-4V17h4c2.8 0 5-2.2 5-5s-2.2-5-5-5z"/></svg>`;
  }

  function applyCardChrome(chrome = {}) {
    const root = document.documentElement;
    const factsMode = chrome.factsMode || "full";
    const shareMode = chrome.shareMode || "full";
    const resumeMode = chrome.resumeMode || "full";
    root.dataset.factsMode = factsMode;
    root.dataset.shareMode = shareMode;
    root.dataset.resumeMode = resumeMode;

    const shareBtn = document.getElementById("share-card");
    if (shareBtn) {
      shareBtn.hidden = shareMode === "hidden";
      shareBtn.classList.toggle("is-icon-only", shareMode === "icon");
      shareBtn.setAttribute("aria-label", "Share my card");
      const label = shareBtn.querySelector(".btn-label");
      if (label) label.textContent = "Share my card";
    }

    const resumeBtn = document.getElementById("download-resume");
    if (resumeBtn) {
      resumeBtn.classList.toggle("is-icon-only", resumeMode === "icon");
      if (resumeMode === "hidden") {
        resumeBtn.dataset.chromeHidden = "1";
      } else {
        delete resumeBtn.dataset.chromeHidden;
      }
    }
  }

  function applyCard(data) {
    cardData = data;
    const layout = resolveLayout(data);
    document.documentElement.dataset.theme = data.theme || "sky";
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.setAttribute(
        "content",
        data.theme === "night" ? "#081018" : "#0096D6"
      );
    }
    document.documentElement.dataset.layout = layout;
    document.documentElement.dataset.layoutDesktop = data.layoutDesktop || data.layout || "card";
    document.documentElement.dataset.layoutMobile = data.layoutMobile || data.layout || "card";
    applyCardChrome(data.cardChrome);
    const hero = document.querySelector(".split-hero");
    if (hero) {
      hero.setAttribute(
        "aria-hidden",
        layout === "split" || layout === "banner" ? "false" : "true"
      );
    }

    const id = data.identity || {};
    const setText = (elId, value) => {
      const el = document.getElementById(elId);
      if (el && value != null) el.textContent = value;
    };

    setText("brand", id.brand || "chrisdelacruz.com");
    setText("brand-hero", id.brand || "chrisdelacruz.com");
    setText("tagline", id.tagline || "Digital calling card");
    setText("eyebrow", id.eyebrow || "Hello, I’m");
    setText("display-name", id.name || "");
    setText("role", id.role || "");
    setText("place", id.place || id.workLocation || "");
    setText("footer-name", id.name || "Christian Dela Cruz");
    setText("footer-name-split", id.name || "Christian Dela Cruz");

    const headline = [id.role, id.org].filter(Boolean).join(" at ") || "Digital calling card";
    setText("split-headline", headline);
    setText("split-bio", id.note || "");

    const dateEl = document.getElementById("card-date");
    if (dateEl) {
      dateEl.hidden = !(layout === "split" || layout === "banner");
      dateEl.textContent = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }

    document.title = `${id.name || "Calling Card"} · Calling Card`;
    if (photo) photo.alt = id.name || "Profile photo";

    const companyLine = document.getElementById("company-line");
    const companyName = document.getElementById("company-name");
    const companyLink = document.getElementById("company-link");
    if (companyLine && companyName && companyLink) {
      if (id.org) {
        companyName.textContent = id.org;
        if (id.companyWebsite) {
          companyLink.href = id.companyWebsite;
          companyLink.style.pointerEvents = "";
          companyLink.style.color = "";
        } else {
          companyLink.removeAttribute("href");
          companyLink.style.pointerEvents = "none";
          companyLink.style.color = "inherit";
        }
        companyLine.hidden = false;
      } else {
        companyLine.hidden = true;
      }
    }

    const frame = document.getElementById("portrait-frame");
    const photoMobile = document.getElementById("profile-photo-mobile");
    const heroPhoto = document.getElementById("hero-photo");
    const heroPhotoMobile = document.getElementById("hero-photo-mobile");
    const heroBg = document.getElementById("split-hero-bg");
    const logoWrap = document.getElementById("company-logo-wrap");
    const logoImg = document.getElementById("company-logo");
    const p = data.photo || {};
    const desktopCrop = p.desktop || {
      objectFit: p.objectFit || "cover",
      objectPosition: p.objectPosition || "50% 20%",
      zoom: 1,
      size: p.desktopSize || "168px",
    };
    const mobileCrop = p.mobile || {
      objectFit: p.objectFit || "cover",
      objectPosition: p.objectPosition || "50% 18%",
      zoom: 1,
      size: p.mobileSize || "92px",
    };
    const assets = data.assets || {};
    const root = document.documentElement;
    root.style.setProperty("--photo-desktop", desktopCrop.size || "168px");
    root.style.setProperty("--photo-mobile", mobileCrop.size || "92px");
    root.style.setProperty("--photo-radius", p.borderRadius || "1rem");
    root.style.setProperty("--photo-fit", desktopCrop.objectFit || "cover");
    root.style.setProperty("--photo-pos", desktopCrop.objectPosition || "center top");
    root.style.setProperty("--photo-fit-mobile", mobileCrop.objectFit || "cover");
    root.style.setProperty("--photo-pos-mobile", mobileCrop.objectPosition || "center top");
    root.style.setProperty("--photo-zoom", String(desktopCrop.zoom || 1));
    root.style.setProperty("--photo-zoom-mobile", String(mobileCrop.zoom || 1));
    root.classList.toggle("photo-clear", Boolean(p.clearBackground));

    if (heroBg) {
      if (assets.heroBg) {
        heroBg.style.setProperty("--hero-image", `url("${assets.heroBg}")`);
        heroBg.classList.add("has-image");
      } else {
        heroBg.style.removeProperty("--hero-image");
        heroBg.classList.remove("has-image");
      }
    }

    if (logoWrap && logoImg) {
      if (assets.logo) {
        logoImg.src = assets.logo;
        logoImg.alt = id.org ? `${id.org} logo` : "Company logo";
        logoWrap.hidden = false;
      } else {
        logoImg.removeAttribute("src");
        logoImg.alt = "";
        logoWrap.hidden = true;
      }
    }

    const desktopSrc = p.src || "/images/christian-dela-cruz.png";
    const mobileSrc = p.mobileSrc || desktopSrc;
    const applyPortrait = (img, crop, src, isMobile = false) => {
      if (!img) return;
      img.src = src;
      img.style.objectFit = p.clearBackground ? "contain" : (crop.objectFit || "cover");
      img.style.objectPosition = p.clearBackground && !isMobile
        ? (crop.objectPosition || "center top")
        : p.clearBackground
          ? "bottom center"
          : (crop.objectPosition || "center top");
      img.style.transform = `scale(${crop.zoom || 1})`;
      img.style.transformOrigin = crop.objectPosition || "center center";
    };

    applyPortrait(photo, desktopCrop, desktopSrc, false);
    applyPortrait(photoMobile, mobileCrop, mobileSrc, true);
    applyPortrait(heroPhoto, desktopCrop, desktopSrc, false);
    applyPortrait(heroPhotoMobile, {
      ...mobileCrop,
      objectPosition: p.clearBackground ? "bottom center" : mobileCrop.objectPosition,
    }, mobileSrc, true);

    if (photo) photo.alt = id.name || "Profile photo";
    if (photoMobile) photoMobile.alt = id.name || "Profile photo";

    if (frame) {
      frame.classList.toggle("is-clear", Boolean(p.clearBackground));
      if (layout === "split" || layout === "studio") {
        frame.style.borderRadius = "999px";
      } else if (p.borderRadius) {
        frame.style.borderRadius = p.borderRadius;
      }
    }

    const facts = document.getElementById("facts");
    if (facts && Array.isArray(data.contacts)) {
      facts.innerHTML = "";
      for (const c of data.contacts) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = hrefFor(c);
        const shown = displayValue(c);
        a.setAttribute("aria-label", `${c.label || c.type}: ${shown}`);
        a.title = `${c.label || c.type}: ${shown}`;
        if (c.type === "link") {
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        }
        a.insertAdjacentHTML("beforeend", factIcon(c.type, c));
        const label = document.createElement("span");
        label.className = "fact-label";
        label.textContent = c.label || c.type;
        const value = document.createElement("span");
        value.className = "fact-value";
        value.textContent = shown;
        a.appendChild(label);
        a.appendChild(value);
        li.appendChild(a);
        facts.appendChild(li);
      }
      facts.hidden = (data.cardChrome?.factsMode || "full") === "hidden" || !data.contacts.length;
    }

    const messagingCount = renderMessaging(data.messaging);
    const socialCount = renderSocials(data.socials);
    layoutConnectRow(socialCount, messagingCount);

    const resumeBtn = document.getElementById("download-resume");
    if (resumeBtn) {
      const resume = data.resumeDownload || {};
      const resumeMode = data.cardChrome?.resumeMode || "full";
      const labelEl = resumeBtn.querySelector(".btn-label");
      if (resume.available && resume.url && resumeMode !== "hidden") {
        resumeBtn.hidden = false;
        resumeBtn.href = resume.url;
        const safeName = String(resume.name || "Resume")
          .replace(/[^\w.\- ]+/g, "")
          .replace(/\s+/g, "_");
        if (resume.kind === "page") {
          resumeBtn.removeAttribute("download");
          resumeBtn.setAttribute("target", "_blank");
          resumeBtn.setAttribute("rel", "noopener noreferrer");
          if (labelEl) labelEl.textContent = "View Resume";
          resumeBtn.setAttribute("aria-label", "View Resume");
        } else {
          resumeBtn.setAttribute("download", `${safeName || "Resume"}.pdf`);
          resumeBtn.removeAttribute("target");
          resumeBtn.removeAttribute("rel");
          if (labelEl) labelEl.textContent = "Download Resume";
          resumeBtn.setAttribute("aria-label", "Download Resume");
        }
      } else {
        resumeBtn.hidden = true;
      }
    }

    if (saveBtn && id.name) {
      saveBtn.setAttribute(
        "download",
        `${String(id.name).replace(/\s+/g, "_")}.vcf`
      );
    }
  }

  async function loadCard() {
    try {
      const res = await fetch("/api/card", { credentials: "same-origin" });
      if (!res.ok) return;
      applyCard(await res.json());
    } catch {
      /* keep static defaults */
    }
  }

  function openModal() {
    modal.hidden = false;
    document.body.classList.add("modal-open");
    errorEl.hidden = true;
    errorEl.textContent = "";
    passwordInput.value = "";
    setTimeout(() => passwordInput.focus(), 50);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  async function saveContact(event) {
    if (!isIOS()) return;
    event.preventDefault();
    try {
      const res = await fetch("/api/vcf", { credentials: "same-origin" });
      const text = await res.text();
      const blob = new Blob([text], { type: "text/vcard;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setStatus("Opening Contacts…", "is-ok");
    } catch {
      window.location.href = "/api/vcf";
    }
  }

  async function addToWallet(platform) {
    const btn = platform === "apple" ? appleBtn : googleBtn;
    const other = platform === "apple" ? googleBtn : appleBtn;
    if (!btn) return;

    btn.disabled = true;
    if (other) other.disabled = true;
    setStatus("Preparing wallet pass…");

    try {
      const query =
        platform === "apple"
          ? "platform=apple"
          : platform === "google"
            ? "platform=google"
            : "platform=auto";

      const res = await fetch(`/api/wallet?${query}`, { method: "GET" });
      const contentType = res.headers.get("Content-Type") || "";

      if (contentType.includes("application/vnd.apple.pkpass")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (isIOS()) window.location.href = url;
        else {
          const a = document.createElement("a");
          a.href = url;
          a.download = "Christian_Dela_Cruz.pkpass";
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        setTimeout(() => URL.revokeObjectURL(url), 8000);
        setStatus("Apple Wallet pass ready — confirm Add on your device.", "is-ok");
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.error === "wallet_not_configured") {
          setStatus(
            "Wallet not configured yet — use Save to Contacts for now.",
            "is-error"
          );
          return;
        }
        setStatus(data.message || "Could not create wallet pass.", "is-error");
        return;
      }

      if (platform === "google" && data.googleSaveUrl) {
        window.location.href = data.googleSaveUrl;
        setStatus("Opening Google Wallet…", "is-ok");
        return;
      }

      if (data.shareUrl) {
        window.location.href = data.shareUrl;
        setStatus("Opening wallet save page…", "is-ok");
        return;
      }

      if (data.googleSaveUrl) {
        window.location.href = data.googleSaveUrl;
        setStatus("Opening Google Wallet…", "is-ok");
        return;
      }

      setStatus("Pass created, but no install link was returned.", "is-error");
    } catch {
      setStatus("Network error while creating the wallet pass.", "is-error");
    } finally {
      btn.disabled = false;
      if (other) other.disabled = false;
    }
  }

  if (saveBtn) saveBtn.addEventListener("click", saveContact);
  if (appleBtn) appleBtn.addEventListener("click", () => addToWallet("apple"));
  if (googleBtn) googleBtn.addEventListener("click", () => addToWallet("google"));

  const qr = document.getElementById("qr");
  const qrBlock = document.querySelector(".qr-block");
  const unlockTarget = qrBlock || qr;
  if (unlockTarget) {
    unlockTarget.addEventListener("click", () => {
      unlockClicks += 1;
      clearTimeout(unlockClickTimer);
      if (unlockClicks >= 3) {
        unlockClicks = 0;
        openModal();
        return;
      }
      unlockClickTimer = setTimeout(() => {
        unlockClicks = 0;
      }, 800);
    });
  }

  modal?.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.hidden) closeModal();
  });

  if (new URLSearchParams(location.search).get("unlock") === "1") {
    openModal();
    history.replaceState({}, "", "/");
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Checking…";

    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password: passwordInput.value }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        errorEl.textContent = data.error || "Incorrect password";
        errorEl.hidden = false;
        passwordInput.select();
        return;
      }

      sessionStorage.setItem("resume_unlocked", "1");
      window.location.href = "/admin/";
    } catch {
      errorEl.textContent =
        "Could not reach the server. Use wrangler pages dev for local API.";
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Unlock";
    }
  });

  const shareBtn = document.getElementById("share-card");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const url = window.location.origin + "/";
      const title = document.getElementById("display-name")?.textContent || "Calling card";
      try {
        if (navigator.share) {
          await navigator.share({ title, url, text: `Save my contact: ${url}` });
          setStatus("Shared.", "is-ok");
          return;
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
      try {
        await navigator.clipboard.writeText(url);
        setStatus("Link copied.", "is-ok");
      } catch {
        setStatus("Could not share automatically.", "is-error");
      }
    });
  }

  loadCard();
  const onLayoutMq = () => {
    if (cardData) applyCard(cardData);
  };
  if (LAYOUT_MQ.addEventListener) LAYOUT_MQ.addEventListener("change", onLayoutMq);
  else if (LAYOUT_MQ.addListener) LAYOUT_MQ.addListener(onLayoutMq);
})();
