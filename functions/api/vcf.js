/**
 * GET /api/vcf — dynamic vCard from current settings.
 */
import { readSettings, buildVCard } from "../_lib/card.js";

export async function onRequestGet(context) {
  const settings = await readSettings(context.env);
  const body = buildVCard(settings);
  const name = (settings.identity?.name || "Contact").replace(/\s+/g, "_");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.vcf"`,
      "Cache-Control": "no-store",
    },
  });
}
