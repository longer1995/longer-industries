// Zoho CRM adapter — creates a Deal (Potential) via the v6 API.
// Auth: OAuth refresh-token flow. Set ZOHO_REFRESH_TOKEN, ZOHO_CLIENT_ID,
// ZOHO_CLIENT_SECRET, and ZOHO_DC (e.g. "com", "eu", "in").
import { CrmAdapter, NormalizedDeal, AdapterResult } from "./types.ts";

async function accessToken(): Promise<string> {
  const dc = Deno.env.get("ZOHO_DC") ?? "com";
  const params = new URLSearchParams({
    refresh_token: Deno.env.get("ZOHO_REFRESH_TOKEN")!,
    client_id: Deno.env.get("ZOHO_CLIENT_ID")!,
    client_secret: Deno.env.get("ZOHO_CLIENT_SECRET")!,
    grant_type: "refresh_token",
  });
  const res = await fetch(
    `https://accounts.zoho.${dc}/oauth/v2/token?${params}`,
    { method: "POST" },
  );
  const data = await res.json();
  if (!data.access_token) throw new Error(`zoho token: ${JSON.stringify(data)}`);
  return data.access_token;
}

export const zoho: CrmAdapter = {
  name: "zoho",
  async push(deal: NormalizedDeal): Promise<AdapterResult> {
    try {
      if (!Deno.env.get("ZOHO_REFRESH_TOKEN")) {
        return { ok: false, error: "ZOHO_* env not set" };
      }
      const dc = Deno.env.get("ZOHO_DC") ?? "com";
      const token = await accessToken();

      const amount = deal.lineItems
        .filter((li) => li.figureType === "firm_quote" && li.amount)
        .reduce((s, li) => s + (li.amount ?? 0), 0);

      const stageMap: Record<string, string> = {
        ready_to_buy: "Closed Won",
        needs_follow_up: "Qualification",
        interested: "Qualification",
        not_interested: "Closed Lost",
      };

      const description = [
        deal.summary,
        deal.nextAction ? `Next: ${deal.nextAction}` : null,
        ...deal.lineItems.map((li) =>
          `- ${li.quantity ?? ""} ${li.unit ?? ""} ${li.description}` +
          (li.amount ? ` — $${li.amount} (${li.figureType ?? "n/a"})` : "")
        ),
      ].filter(Boolean).join("\n");

      const res = await fetch(`https://www.zohoapis.${dc}/crm/v6/Deals`, {
        method: "POST",
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: [{
            Deal_Name: `${deal.contact.company ?? deal.contact.name ?? "Call"} — ${deal.intent}`,
            Amount: amount || null,
            Stage: stageMap[deal.signal] ?? "Qualification",
            Description: description,
          }],
        }),
      });
      if (!res.ok) return { ok: false, error: `zoho ${res.status}: ${await res.text()}` };
      const data = await res.json();
      const id = data?.data?.[0]?.details?.id;
      return { ok: true, externalId: id };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
};
