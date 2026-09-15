# Build notes — chrisdelacruz.com

Blow-by-blow of what was built so you can pull this repo and continue.

**Stack:** Cloudflare Pages + Functions · KV binding `CARD` · static admin at `/admin/` · public card at `/`

**Latest deploy pattern:**

```bash
npx wrangler pages deploy . --project-name=chrisdelacruz --commit-dirty=true
```

Production / preview: `*.chrisdelacruz.pages.dev` · custom domain: chrisdelacruz.com

---

## How to continue from GitHub

```bash
git clone https://github.com/daewoo1025/chrisdelacruz.git
cd chrisdelacruz
# secrets stay out of git — restore locally:
# copy .dev.vars with UNLOCK_PASSWORD=...
npx wrangler pages dev .
```

Production secrets (already may be set in Cloudflare):

```bash
npx wrangler pages secret put UNLOCK_PASSWORD --project-name=chrisdelacruz
npx wrangler pages secret put WALLETWALLET_API_KEY --project-name=chrisdelacruz
```

KV namespace `CARD` is wired in `wrangler.toml` (id `f97891a0afd84e05b604a78378dae104`). Keep the same binding in the Pages project dashboard.

---

## Chronology (what we shipped)

### 1. Core calling card

- Public digital card: identity, photo, contacts, QR, Save to Contacts (`.vcf`)
- Themes: sky, ocean, slate, ember, forest, **night**
- Admin unlock: **triple-click the QR** → password → `/admin/`
- Settings persisted in KV via `functions/_lib/card.js` (`normalizeSettings`, `publicCardPayload`)

### 2. Contacts, messaging, socials

- Contacts: phone / email / link rows with labels + **Show** (visibility)
- Messaging toggles: WhatsApp, Viber, Telegram (`enabled` + value)
- Socials: LinkedIn and others as icon chips (`shared/icons.js`)
- Connect row next to QR when any social/messaging channel is enabled

### 3. Wallet buttons

- Apple Wallet + Google Wallet using WalletWallet API (optional key)
- Official-style badge marks under `images/badges/`
- Twin wallet buttons on the public card

### 4. Resume builder & active resume

- Resume builder at `/resume/` (no PDF required)
- Active resume can be:
  - uploaded PDF → `/api/resume-file`
  - **or** builder profile → live page `/resume/view`
- Admin: Resume tab + Resume builder shortcut; set active version via `/api/admin/resume-active`
- Related routes: `resume-versions`, `resume-public`, `resume-file`, `view.html` / `view.js` / `view.css`

### 5. Assets (hero + logo)

- Upload hero background + company logo (`/api/admin/asset`, `/api/asset/...`)
- Public card **hides** logo / hero when missing — no empty placeholders
- Admin Appearance → **Assets** (balanced Upload / Remove buttons)

### 6. Layouts (mix & match)

Layouts: `card` | `split` | `banner` | `logo` | `studio` | `compact`

- **`layoutDesktop`** + **`layoutMobile`** — independent picks
- Public card switches with `matchMedia` (~860px) via `resolveLayout()` in `app.js`
- Admin Appearance → **Layouts**: dual columns (laptop/tablet vs phone)
- Asset recommendations (“Recommended” badges) based on layout needs

### 7. Photos & lossless crop

- Separate laptop + optional phone photo uploads (`/api/photo`, `/api/photo/mobile`)
- Framing is **CSS-only** (object-fit / object-position / zoom) — does **not** re-encode the image
- Clear / transparent PNG background option
- Drag-to-pan on crop frames and live preview photos
- Sliders: Pan X/Y, Zoom, Fit, Frame size, corner radius

### 8. Appearance UX redesign (live preview)

Admin Appearance subtabs: **Layouts · Theme · Display · Photos · Assets**

- Sticky **Live preview** dock: laptop/tablet + phone mock cards
- Updates **without Save** for layout, theme, photo framing, assets, display chrome
- Drag photo in the live preview — framing moves in real time
- Layout clicks refresh each device preview instantly

### 9. Display & space (`cardChrome`)

Admin Appearance → **Display**:

| Control | Options |
|--------|---------|
| Contact details (phone / email / LinkedIn…) | Full text · **Icons only** · **Hidden** |
| Share button | Label · **Icon only** · Hidden |
| Resume button | Label · **Icon only** · Hidden |

- Stored as `settings.cardChrome` (`factsMode`, `shareMode`, `resumeMode`)
- Public card applies `data-facts-mode` / `data-share-mode` / `data-resume-mode` on `<html>`
- Per-contact hide still available under Contacts → Show
- LinkedIn facts use LinkedIn glyph when label/value matches

---

## Key files map

| Area | Files |
|------|--------|
| Public card UI | `index.html`, `app.js`, `styles.css` |
| Settings core | `functions/_lib/card.js` |
| Public API | `functions/api/card.js`, `photo/`, `asset/`, `vcf`, wallet, resume-* |
| Admin UI | `admin/index.html`, `admin/admin.js`, `admin/admin.css` |
| Icons | `shared/icons.js` |
| Resume live view | `resume/view.html`, `resume/view.js`, `resume/view.css` |
| Routing | `_redirects` |
| Config | `wrangler.toml` |

---

## Admin → public data flow

```
Admin Save
  → PUT /api/admin/settings
  → normalizeSettings() + KV write
Public visit
  → GET /api/card
  → publicCardPayload()
  → app.js applyCard() + applyCardChrome()
```

Photo / asset uploads are separate multipart endpoints; framing metadata lives in `settings.photo`.

---

## Defaults worth knowing

- Default desktop layout: `card`
- Default mobile layout: `compact`
- Default theme: `sky`
- Default `cardChrome`: all `full`
- Unlock: triple-click QR (not a visible Admin link)

---

## Intentionally not in git

- `.dev.vars` (local password / secrets)
- `.wrangler/` cache
- `node_modules/`
- Any cookies / credential dumps

---

## Sensible next steps (if continuing)

1. Polish live preview to mirror every public layout quirk 1:1
2. Optional icon-only mode for **Save to Contacts**
3. Per-device theme (if ever needed)
4. Harden WalletWallet error states when API key missing
5. Smoke-test each layout × theme × chrome mode on real phone + laptop
6. Keep deploying with Wrangler after meaningful admin/public changes

---

## Session checkpoint (2026-09-15)

Shipped and documented in this push:

- Mix-and-match layouts + dual live previews
- Lossless dual-device photo crop with visible drag
- Asset upload with consistent Upload/Remove UI
- Display chrome: icon/hide for facts, share, resume
- Night theme, wallet marks, resume-without-PDF path

Pull `master`, restore `.dev.vars`, run `npx wrangler pages dev .`, continue from Appearance → Display / Photos / Layouts.
