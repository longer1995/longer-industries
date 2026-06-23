// POST /sync  { call_id, crm: "zoho" | "hubspot" }
// The review/privacy gate + CRM push. Enforces per-contact privacy mode so
// private relationships never leak: 'never_sync' is blocked, 'line_items_only'
// strips summary/notes and pushes only the commodities/quantities/figures.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, + adapter creds.
import { preflight, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { NormalizedDeal, CrmAdapter } from "./adapters/types.ts";
import { hubspot } from "./adapters/hubspot.ts";
import { zoho } from "./adapters/zoho.ts";

const ADAPTERS: Record<string, CrmAdapter> = { hubspot, zoho };

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const { call_id, crm } = await req.json();
    if (!call_id || !crm) return json({ error: "call_id and crm required" }, 400);
    const adapter = ADAPTERS[crm];
    if (!adapter) return json({ error: `unknown crm: ${crm}` }, 400);

    const db = adminClient();

    const { data: call } = await db
      .from("calls")
      .select("id, contact_id, contacts(*), call_insights(*), line_items(*)")
      .eq("id", call_id).single();
    if (!call) return json({ error: "call not found" }, 404);

    const insight = (call as any).call_insights;
    if (!insight) return json({ error: "call not yet extracted" }, 409);

    // ── Review gate ──
    // Only 'approved'/'redacted' calls may sync. 'pending' must be reviewed first.
    if (!["approved", "redacted"].includes(insight.sync_status)) {
      return json(
        { error: "call requires review before sync", sync_status: insight.sync_status },
        409,
      );
    }

    // ── Privacy gate ──
    const contact = (call as any).contacts;
    const privacy = contact?.privacy_mode ?? "full";
    if (privacy === "never_sync") {
      await db.from("call_insights").update({ sync_status: "skipped" }).eq("call_id", call_id);
      return json({ skipped: true, reason: "contact privacy_mode = never_sync" });
    }

    const lineItems = ((call as any).line_items ?? []).map((li: any) => ({
      description: li.description,
      quantity: li.quantity,
      unit: li.unit,
      amount: li.amount,
      amountBasis: li.amount_basis,
      figureType: li.figure_type,
    }));

    // line_items_only strips the conversational/relationship content.
    const stripNotes = privacy === "line_items_only";

    const deal: NormalizedDeal = {
      contact: {
        name: contact?.name,
        company: contact?.company,
        phone: contact?.phone,
        email: contact?.email,
        externalId: contact?.crm_links?.[crm] ?? null,
      },
      signal: insight.signal,
      intent: insight.intent,
      summary: stripNotes ? null : insight.summary,
      nextAction: stripNotes ? null : insight.next_action,
      suggestedDoc: insight.suggested_doc,
      lineItems,
    };

    const result = await adapter.push(deal);

    await db.from("sync_log").insert({
      call_id,
      crm,
      external_id: result.externalId ?? null,
      payload: deal,
      ok: result.ok,
      error: result.error ?? null,
    });

    if (result.ok) {
      await db.from("call_insights").update({ sync_status: "synced" }).eq("call_id", call_id);
      // Remember the external id so future syncs update instead of duplicate.
      if (result.externalId && contact) {
        await db.from("contacts")
          .update({ crm_links: { ...(contact.crm_links ?? {}), [crm]: result.externalId } })
          .eq("id", contact.id);
      }
    }

    return json(result, result.ok ? 200 : 502);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
