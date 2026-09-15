/**
 * Creates a signed Apple Wallet + Google Wallet pass via WalletWallet.
 *
 * Set secret:
 *   npx wrangler pages secret put WALLETWALLET_API_KEY --project-name=chrisdelacruz
 */
import { readSettings, readPhoto, publicCardPayload } from "../_lib/card.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function onRequest(context) {
  const { env, request } = context;
  const key = env.WALLETWALLET_API_KEY;

  if (!key) {
    return json(
      {
        error: "wallet_not_configured",
        message:
          "Wallet passes need a free WalletWallet API key. Save Contact still works without it.",
      },
      503
    );
  }

  const url = new URL(request.url);
  const platform = (url.searchParams.get("platform") || "auto").toLowerCase();
  const settings = await readSettings(env);
  const customPhoto = await readPhoto(env);
  const card = publicCardPayload(settings, Boolean(customPhoto));
  const id = card.identity || {};
  const phones = (card.contacts || []).filter((c) => c.type === "phone");
  const emails = (card.contacts || []).filter((c) => c.type === "email");

  const backFields = [
    ...phones.map((c) => ({ label: c.label, value: c.value })),
    ...emails.map((c) => ({ label: c.label, value: c.value })),
    { label: "Website", value: "https://chrisdelacruz.com" },
    ...(id.linkedin ? [{ label: "LinkedIn", value: id.linkedin }] : []),
    { label: "Save contact", value: "https://chrisdelacruz.com/api/vcf" },
  ];

  const body = {
    organizationName: id.name || "Calling Card",
    logoText: id.brand || "chrisdelacruz.com",
    description: `${id.name || "Contact"} — digital calling card`,
    colorPreset: "blue",
    sharingProhibited: false,
    barcodeFormat: "QR",
    barcodeValue: "https://chrisdelacruz.com/api/vcf",
    primaryFields: [{ label: "Name", value: id.name || "Contact" }],
    secondaryFields: [
      { label: "Role", value: id.role || "" },
      { label: "Based in", value: id.place || "" },
    ].filter((f) => f.value),
    headerFields: [{ label: "Card", value: "Contact" }],
    backFields,
  };

  try {
    const res = await fetch("https://api.walletwallet.dev/api/passes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return json(
        {
          error: "wallet_api_error",
          message: data.error || data.message || "Could not create wallet pass",
          status: res.status,
        },
        502
      );
    }

    if (platform === "share" || platform === "auto") {
      if (data.shareUrl) {
        return json({
          ok: true,
          shareUrl: data.shareUrl,
          googleSaveUrl: data.googleSaveUrl || null,
          serialNumber: data.serialNumber || null,
        });
      }
    }

    if (platform === "google" && data.googleSaveUrl) {
      return json({
        ok: true,
        googleSaveUrl: data.googleSaveUrl,
        shareUrl: data.shareUrl || null,
        serialNumber: data.serialNumber || null,
      });
    }

    if ((platform === "apple" || platform === "pkpass") && data.applePass) {
      const bytes = Uint8Array.from(atob(data.applePass), (c) => c.charCodeAt(0));
      return new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.pkpass",
          "Content-Disposition":
            'attachment; filename="Christian_Dela_Cruz.pkpass"',
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return json({
      ok: true,
      shareUrl: data.shareUrl || null,
      googleSaveUrl: data.googleSaveUrl || null,
      serialNumber: data.serialNumber || null,
      hasApplePass: Boolean(data.applePass),
    });
  } catch (err) {
    return json(
      {
        error: "wallet_fetch_failed",
        message: err?.message || "Network error creating wallet pass",
      },
      502
    );
  }
}
