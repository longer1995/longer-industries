// HubSpot adapter — creates/updates a Deal + Contact via the CRM v3 API.
// Auth: private-app access token in HUBSPOT_TOKEN. Simplest CRM to start with.
import { CrmAdapter, NormalizedDeal, AdapterResult } from "./types.ts";

const BASE = "https://api.hubapi.com";

export const hubspot: CrmAdapter = {
  name: "hubspot",
  async push(deal: NormalizedDeal): Promise<AdapterResult> {
    const token = Deno.env.get("HUBSPOT_TOKEN");
    if (!token) return { ok: false, error: "HUBSPOT_TOKEN not set" };
    const h = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    try {
      // Total value = sum of firm line items only (ballparks don't inflate the pipeline).
      const amount = deal.lineItems
        .filter((li) => li.figureType === "firm_quote" && li.amount)
        .reduce((s, li) => s + (li.amount ?? 0), 0);

      const notes = [
        deal.summary,
        deal.nextAction ? `Next: ${deal.nextAction}` : null,
        ...deal.lineItems.map((li) =>
          `• ${li.quantity ?? ""} ${li.unit ?? ""} ${li.description}` +
          (li.amount ? ` — $${li.amount} (${li.figureType ?? "n/a"})` : "")
        ),
      ].filter(Boolean).join("\n");

      const res = await fetch(`${BASE}/crm/v3/objects/deals`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({
          properties: {
            dealname: `${deal.contact.company ?? deal.contact.name ?? "Call"} — ${deal.intent}`,
            amount: amount || undefined,
            dealstage: "appointmentscheduled",
            description: notes,
          },
        }),
      });
      if (!res.ok) return { ok: false, error: `hubspot ${res.status}: ${await res.text()}` };
      const { id } = await res.json();
      return { ok: true, externalId: id };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
};
