const THEME_LABELS = {
  sky: "Sky",
  ocean: "Ocean",
  slate: "Slate",
  ember: "Ember",
  forest: "Forest",
};

const state = {
  settings: null,
  dirty: false,
};

const banner = document.getElementById("banner");
const themeGrid = document.getElementById("theme-grid");
const contactsList = document.getElementById("contacts-list");
const rowTpl = document.getElementById("contact-row-tpl");
const photoPreview = document.getElementById("photo-preview");

function showBanner(message, kind = "") {
  banner.hidden = !message;
  banner.textContent = message || "";
  banner.classList.remove("is-error", "is-ok");
  if (kind) banner.classList.add(kind);
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
    org: document.getElementById("id-org").value.trim(),
    linkedin: document.getElementById("id-linkedin").value.trim(),
    note: document.getElementById("id-note").value.trim(),
  };
}

function collectPhoto() {
  return {
    ...state.settings.photo,
    objectFit: document.getElementById("photo-fit").value,
    objectPosition: document.getElementById("photo-position").value,
    minHeight: document.getElementById("photo-min-height").value.trim() || "68vh",
    maxHeight: document.getElementById("photo-max-height").value.trim() || "640px",
    borderRadius: document.getElementById("photo-radius").value.trim() || "1.6rem",
  };
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
  document.getElementById("id-org").value = identity.org || "";
  document.getElementById("id-linkedin").value = identity.linkedin || "";
  document.getElementById("id-note").value = identity.note || "";
}

function fillPhoto(photo, hasCustomPhoto) {
  document.getElementById("photo-fit").value = photo.objectFit || "cover";
  document.getElementById("photo-position").value = photo.objectPosition || "center top";
  document.getElementById("photo-min-height").value = photo.minHeight || "68vh";
  document.getElementById("photo-max-height").value = photo.maxHeight || "640px";
  document.getElementById("photo-radius").value = photo.borderRadius || "1.6rem";
  const src = hasCustomPhoto
    ? `/api/photo?t=${Date.now()}`
    : (photo.src || "/images/christian-dela-cruz.png");
  photoPreview.src = src;
  photoPreview.style.objectFit = photo.objectFit || "cover";
  photoPreview.style.objectPosition = photo.objectPosition || "center top";
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

function bindTabs() {
  const tabs = [...document.querySelectorAll(".tab")];
  const panels = {
    appearance: document.getElementById("panel-appearance"),
    details: document.getElementById("panel-details"),
    contacts: document.getElementById("panel-contacts"),
    resume: document.getElementById("panel-resume"),
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
    });
  });
}

function resizeImage(file, maxEdge = 1200, quality = 0.86) {
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
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (!blob) reject(new Error("Could not process image"));
          else resolve(blob);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

async function load() {
  showBanner("Loading…");
  try {
    const data = await api("/api/admin/settings");
    state.settings = data.settings;
    fillIdentity(data.settings.identity);
    fillPhoto(data.settings.photo, data.hasCustomPhoto);
    renderThemes(data.settings.theme, data.themes || Object.keys(THEME_LABELS));
    renderContacts(data.settings.contacts);
    showBanner("");
  } catch (err) {
    if (err.message !== "unauthorized") {
      showBanner(err.message || "Could not load settings", "is-error");
    }
  }
}

async function save() {
  if (!state.settings) return;
  const payload = {
    ...state.settings,
    theme: state.settings.theme,
    identity: collectIdentity(),
    photo: collectPhoto(),
    contacts: collectContacts(),
  };

  showBanner("Saving…");
  try {
    const data = await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ settings: payload }),
    });
    state.settings = data.settings;
    state.dirty = false;
    showBanner("Saved. Public card updated.", "is-ok");
  } catch (err) {
    showBanner(err.message || "Save failed", "is-error");
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

document.getElementById("lock-btn").addEventListener("click", async () => {
  await fetch("/api/lock", { method: "POST", credentials: "same-origin" });
  sessionStorage.removeItem("resume_unlocked");
  window.location.href = "/";
});

document.getElementById("photo-file").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  showBanner("Uploading photo…");
  try {
    const blob = await resizeImage(file);
    const form = new FormData();
    form.append("photo", blob, "photo.jpg");
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
    photoPreview.src = data.src;
    if (state.settings) state.settings.photo.src = "/api/photo";
    showBanner("Photo updated.", "is-ok");
  } catch (err) {
    showBanner(err.message || "Upload failed", "is-error");
  } finally {
    e.target.value = "";
  }
});

document.getElementById("photo-reset").addEventListener("click", async () => {
  showBanner("Resetting photo…");
  try {
    const data = await api("/api/admin/photo", { method: "DELETE" });
    photoPreview.src = data.src;
    if (state.settings) state.settings.photo.src = data.src;
    showBanner("Default photo restored.", "is-ok");
  } catch (err) {
    showBanner(err.message || "Reset failed", "is-error");
  }
});

[
  "photo-fit",
  "photo-position",
  "photo-min-height",
  "photo-max-height",
  "photo-radius",
].forEach((id) => {
  const el = document.getElementById(id);
  el.addEventListener("input", () => {
    markDirty();
    if (id === "photo-fit") photoPreview.style.objectFit = el.value;
    if (id === "photo-position") photoPreview.style.objectPosition = el.value;
  });
  el.addEventListener("change", markDirty);
});

[
  "id-brand",
  "id-tagline",
  "id-eyebrow",
  "id-name",
  "id-role",
  "id-place",
  "id-org",
  "id-linkedin",
  "id-note",
].forEach((id) => {
  document.getElementById(id).addEventListener("input", markDirty);
});

window.addEventListener("beforeunload", (e) => {
  if (state.dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});

bindTabs();
load();
