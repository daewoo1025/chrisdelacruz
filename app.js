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

  let photoClicks = 0;
  let photoClickTimer = null;

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

  function isAndroid() {
    return /Android/i.test(navigator.userAgent);
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

  function renderMessaging(messaging = {}) {
    const row = document.getElementById("messaging-row");
    if (!row) return;
    row.innerHTML = "";
    const items = [
      { key: "whatsapp", label: "WhatsApp" },
      { key: "viber", label: "Viber" },
      { key: "telegram", label: "Telegram" },
    ];
    let shown = 0;
    for (const item of items) {
      const cfg = messaging[item.key];
      if (!cfg?.enabled || !cfg.value) continue;
      const href = messagingHref(item.key, cfg.value);
      if (!href) continue;
      const a = document.createElement("a");
      a.className = "btn btn-msg";
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = item.label;
      row.appendChild(a);
      shown += 1;
    }
    row.hidden = shown === 0;
  }

  function applyCard(data) {
    document.documentElement.dataset.theme = data.theme || "sky";

    const id = data.identity || {};
    const setText = (elId, value) => {
      const el = document.getElementById(elId);
      if (el && value != null) el.textContent = value;
    };

    setText("brand", id.brand || "chrisdelacruz.com");
    setText("tagline", id.tagline || "Digital calling card");
    setText("eyebrow", id.eyebrow || "Hello, I’m");
    setText("display-name", id.name || "");
    setText("role", id.role || "");
    setText("place", id.place || id.workLocation || "");
    setText("footer-name", id.name || "Christian Dela Cruz");

    document.title = `${id.name || "Calling Card"} · Calling Card`;
    if (photo) photo.alt = id.name || "Profile photo";

    const linkedin = document.getElementById("linkedin-cta");
    if (linkedin && id.linkedin) linkedin.href = id.linkedin;

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
    const p = data.photo || {};
    if (photo && p.src) {
      photo.src = p.src;
      photo.style.objectFit = p.objectFit || "cover";
      photo.style.objectPosition = p.objectPosition || "center top";
    }
    if (frame) {
      if (p.minHeight) frame.style.minHeight = p.minHeight;
      if (p.maxHeight) frame.style.maxHeight = p.maxHeight;
      if (p.borderRadius) frame.style.borderRadius = p.borderRadius;
    }

    const facts = document.getElementById("facts");
    if (facts && Array.isArray(data.contacts)) {
      facts.innerHTML = "";
      for (const c of data.contacts) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = hrefFor(c);
        if (c.type === "link") {
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        }
        const label = document.createElement("span");
        label.className = "fact-label";
        label.textContent = c.label || c.type;
        const value = document.createElement("span");
        value.className = "fact-value";
        value.textContent = displayValue(c);
        a.appendChild(label);
        a.appendChild(value);
        li.appendChild(a);
        facts.appendChild(li);
      }
    }

    renderMessaging(data.messaging);

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

  if (isIOS() && googleBtn) {
    googleBtn.classList.add("btn-ghost");
    googleBtn.style.border = "1px solid var(--line)";
  }
  if (isAndroid() && appleBtn) {
    appleBtn.classList.add("btn-ghost");
    appleBtn.style.border = "1px solid var(--line)";
  }

  if (saveBtn) saveBtn.addEventListener("click", saveContact);
  if (appleBtn) appleBtn.addEventListener("click", () => addToWallet("apple"));
  if (googleBtn) googleBtn.addEventListener("click", () => addToWallet("google"));

  if (photo) {
    photo.addEventListener("click", () => {
      photoClicks += 1;
      clearTimeout(photoClickTimer);
      if (photoClicks >= 3) {
        photoClicks = 0;
        openModal();
        return;
      }
      photoClickTimer = setTimeout(() => {
        photoClicks = 0;
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

  loadCard();
})();
