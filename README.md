# chrisdelacruz.com

Digital calling card for **Christian Dela Cruz**.

Visitors can:

- **Save to Contacts** (dynamic `.vcf`) on iPhone and Android
- **Scan a QR code** that adds your contact
- **Add to Apple Wallet / Google Wallet** (optional API key — see below)

## Admin (triple-click photo)

Click the portrait **3 times quickly** → enter password → `/admin/`.

From admin you can:

- Change **theme** (sky, ocean, slate, ember, forest)
- Replace / reset **photo**, adjust fit, position, min/max height, radius
- Edit **identity** (name, role, place, LinkedIn, etc.)
- **Add / edit / delete** phones & emails with custom tags (Smart, Globe, Etisalat, Personal Email, Company Email, …)
- Open the **resume builder** (`/resume/`)

### Password

Local (`.dev.vars`):

```
UNLOCK_PASSWORD=change-me
```

Production:

```bash
npx wrangler pages secret put UNLOCK_PASSWORD --project-name=chrisdelacruz
```

### Persist settings (recommended)

Without KV, admin saves work in-memory for the running worker only. For durable settings:

```bash
npx wrangler kv namespace create CARD
```

Uncomment the `[[kv_namespaces]]` block in `wrangler.toml` and paste the id. Bind the same namespace in the Cloudflare Pages project settings.

## Local preview

```bash
npx wrangler pages dev .
```

## Wallet passes (Apple + Google)

Uses free [WalletWallet](https://www.walletwallet.dev/) (optional):

```bash
npx wrangler pages secret put WALLETWALLET_API_KEY --project-name=chrisdelacruz
```

## Deploy

```bash
npx wrangler pages deploy . --project-name=chrisdelacruz
```

Then attach **chrisdelacruz.com** in Pages domain settings.
