/**
 * One-time helper: attach chrisdelacruz.com to the Pages project + DNS.
 * Uses wrangler OAuth token from local config (not printed).
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ACCOUNT = "9bb80c113ba158e7e086c8c7e0952280";
const PROJECT = "chrisdelacruz";
const DOMAINS = ["chrisdelacruz.com", "www.chrisdelacruz.com"];
const API = "https://api.cloudflare.com/client/v4";

function token() {
  const cfg = path.join(
    os.homedir(),
    "AppData/Roaming/xdg.config/.wrangler/config/default.toml"
  );
  const raw = fs.readFileSync(cfg, "utf8");
  const m = raw.match(/oauth_token\s*=\s*"([^"]+)"/);
  if (!m) throw new Error("No wrangler oauth token");
  return m[1];
}

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) {
    const err = data.errors?.[0]?.message || res.statusText;
    throw new Error(`${method} ${url}: ${err}`);
  }
  return data.result;
}

async function ensureDomain(name) {
  const base = `${API}/accounts/${ACCOUNT}/pages/projects/${PROJECT}/domains`;
  try {
    await api("GET", `${base}/${name}`);
    console.log(`domain ok: ${name}`);
  } catch {
    await api("POST", base, { name });
    console.log(`domain added: ${name}`);
  }
}

async function ensureDns(zoneId, name, target) {
  const list = await api(
    "GET",
    `${API}/zones/${zoneId}/dns_records?type=CNAME&name=${encodeURIComponent(name)}`
  );
  const existing = list.find((r) => r.name === name);
  if (existing?.content === target) {
    console.log(`dns ok: ${name} -> ${target}`);
    return;
  }
  if (existing) {
    await api("PUT", `${API}/zones/${zoneId}/dns_records/${existing.id}`, {
      type: "CNAME",
      name,
      content: target,
      proxied: true,
    });
    console.log(`dns updated: ${name} -> ${target}`);
    return;
  }
  await api("POST", `${API}/zones/${zoneId}/dns_records`, {
    type: "CNAME",
    name,
    content: target,
    proxied: true,
  });
  console.log(`dns created: ${name} -> ${target}`);
}

async function main() {
  const project = await api(
    "GET",
    `${API}/accounts/${ACCOUNT}/pages/projects/${PROJECT}`
  );
  const target = project.subdomain.includes(".")
    ? project.subdomain
    : `${project.subdomain}.pages.dev`;
  console.log(`pages target: ${target}`);

  for (const d of DOMAINS) await ensureDomain(d);

  const zones = await api(
    "GET",
    `${API}/zones?name=chrisdelacruz.com`
  );
  const zone = zones[0];
  if (!zone) {
    console.log("no zone for chrisdelacruz.com — add domain in dashboard DNS manually");
    return;
  }

  await ensureDns(zone.id, "chrisdelacruz.com", target);
  await ensureDns(zone.id, "www.chrisdelacruz.com", target);
  console.log("done");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
