const statusEl = document.getElementById("status");
const sheet = document.getElementById("resume");

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\n|•|;/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function jobBullets(job) {
  const bullets =
    job?.bullets ||
    job?.highlights ||
    job?.points ||
    job?.description ||
    job?.details ||
    [];
  if (typeof bullets === "string") return textList(bullets);
  if (Array.isArray(bullets)) {
    return bullets
      .map((b) => (typeof b === "string" ? b : b?.text || b?.value || ""))
      .map((b) => String(b).trim())
      .filter(Boolean);
  }
  return [];
}

function sectionEnabled(sections, key, fallback = true) {
  if (!sections || typeof sections !== "object") return fallback;
  if (typeof sections[key] === "boolean") return sections[key];
  return fallback;
}

function renderResume(payload) {
  const data = payload.data || {};
  const sections = data.sections || {};
  const contact = data.contact || {};
  const name = data.name || payload.name || "Resume";
  const role =
    data.role ||
    data.title ||
    data.headline ||
    (Array.isArray(data.experience) && data.experience[0]?.title) ||
    "";

  document.title = `${name} · Resume`;

  const showPhoto = sectionEnabled(sections, "photo", Boolean(data.photo));
  const photo = data.photo || "/images/christian-dela-cruz.png";

  const contactBits = [
    contact.location,
    contact.phone
      ? `<a href="tel:${esc(String(contact.phone).replace(/\s+/g, ""))}">${esc(contact.phone)}</a>`
      : "",
    contact.email
      ? `<a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a>`
      : "",
    contact.linkedin
      ? `<a href="${esc(contact.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>`
      : "",
    contact.website
      ? `<a href="${esc(contact.website)}" target="_blank" rel="noopener">Website</a>`
      : "",
  ].filter(Boolean);

  const blocks = [];

  blocks.push(`
    <header class="resume-top${showPhoto ? "" : " no-photo"}">
      ${showPhoto ? `<img class="resume-photo" src="${esc(photo)}" alt="">` : ""}
      <div>
        <h1 class="resume-name">${esc(name)}</h1>
        ${role ? `<p class="resume-role">${esc(role)}</p>` : ""}
        ${contactBits.length ? `<div class="resume-contact">${contactBits.join("<span aria-hidden=\"true\">·</span>")}</div>` : ""}
      </div>
    </header>
  `);

  if (sectionEnabled(sections, "summary", true) && data.summary) {
    blocks.push(`
      <section class="resume-section">
        <h2>Summary</h2>
        <p>${esc(data.summary)}</p>
      </section>
    `);
  }

  const competencies = textList(data.competencies || data.skills);
  if (sectionEnabled(sections, "competencies", true) && competencies.length) {
    blocks.push(`
      <section class="resume-section">
        <h2>Competencies</h2>
        <div class="resume-chips">${competencies.map((c) => `<span>${esc(c)}</span>`).join("")}</div>
      </section>
    `);
  }

  const experience = Array.isArray(data.experience) ? data.experience : [];
  if (sectionEnabled(sections, "experience", true) && experience.length) {
    const jobs = experience
      .map((job) => {
        const title = job.title || job.role || "Role";
        const company = job.company || job.org || job.organization || "";
        const dates = [job.start, job.end].filter(Boolean).join(" – ") || job.dates || "";
        const location = job.location || "";
        const bullets = jobBullets(job);
        return `
          <article class="job">
            <div class="job-head">
              <div>
                <p class="job-title">${esc(title)}${company ? ` · ${esc(company)}` : ""}</p>
                ${location ? `<p class="job-meta">${esc(location)}</p>` : ""}
              </div>
              ${dates ? `<p class="job-meta">${esc(dates)}</p>` : ""}
            </div>
            ${bullets.length ? `<ul>${bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
          </article>
        `;
      })
      .join("");
    blocks.push(`
      <section class="resume-section">
        <h2>Experience</h2>
        ${jobs}
      </section>
    `);
  }

  const education = data.education || {};
  if (
    sectionEnabled(sections, "education", true) &&
    (education.degree || education.school || education.details)
  ) {
    blocks.push(`
      <section class="resume-section">
        <h2>Education</h2>
        <p><strong>${esc(education.degree || "Education")}</strong>${
          education.school ? ` — ${esc(education.school)}` : ""
        }</p>
        ${education.details ? `<p>${esc(education.details)}</p>` : ""}
      </section>
    `);
  }

  const certifications = textList(data.certifications);
  if (sectionEnabled(sections, "certifications", true) && certifications.length) {
    blocks.push(`
      <section class="resume-section">
        <h2>Certifications</h2>
        <ul>${certifications.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
      </section>
    `);
  }

  const additional = textList(data.additionalInfo || data.additional);
  if (sectionEnabled(sections, "additionalInfo", true) && additional.length) {
    blocks.push(`
      <section class="resume-section">
        <h2>Additional</h2>
        <ul>${additional.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
      </section>
    `);
  }

  sheet.innerHTML = blocks.join("");
  sheet.hidden = false;
  statusEl.hidden = true;
}

async function load() {
  try {
    const res = await fetch("/api/resume-public", { credentials: "same-origin" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      statusEl.textContent = data.error || "Resume is not available.";
      return;
    }
    if (data.kind === "pdf" && data.url) {
      window.location.replace(data.url);
      return;
    }
    renderResume(data);
  } catch {
    statusEl.textContent = "Could not load resume.";
  }
}

document.getElementById("print-btn")?.addEventListener("click", () => window.print());
load();
