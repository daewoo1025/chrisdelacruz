# chrisdelacruz.com

Digital calling card for **Christian Dela Cruz**.

**Continuing the build?** Read **[BUILD_NOTES.md](./BUILD_NOTES.md)** — blow-by-blow of features, file map, deploy, and next steps. Pull `master` and keep going from there.

## Visitors get

- Save to Contacts (dynamic `.vcf`)
- QR code · Share · optional Apple / Google Wallet
- Messaging + social icon chips
- Resume download or live resume page
- Responsive layouts (desktop + phone can differ)

## Admin (triple-click QR)

Click the QR **3 times quickly** → password → `/admin/`.

Appearance subtabs: **Layouts · Theme · Display · Photos · Assets**

- Mix & match laptop vs phone layouts with live preview (no Save needed to preview)
- Theme + night mode
- Display: icon-only or hide contacts / Share / Resume
- Dual-device photo framing (drag to pan; lossless CSS crop)
- Hero background + company logo (hidden when empty)

Also: Details, Contacts, Messaging, Socials, Resume, Security.

### Password

Local (`.dev.vars` — not committed):

```
UNLOCK_PASSWORD=change-me
```

Production:

```bash
npx wrangler pages secret put UNLOCK_PASSWORD --project-name=chrisdelacruz
```

### Persist settings

KV binding `CARD` in `wrangler.toml`. Same namespace must be bound on the Cloudflare Pages project.

## Local preview

```bash
npx wrangler pages dev .
```

## Wallet (optional)

```bash
npx wrangler pages secret put WALLETWALLET_API_KEY --project-name=chrisdelacruz
```

## Deploy

```bash
npx wrangler pages deploy . --project-name=chrisdelacruz
```

Then attach **chrisdelacruz.com** in Pages domain settings.

## Repo

https://github.com/daewoo1025/chrisdelacruz
