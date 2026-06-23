// POST /extract  { call_id }
// Reads the transcript, asks Claude to extract structured CRM fields using a
// tool schema (forces clean JSON), then writes call_insights + line_items.
// This is the brain — signal, intent, line items, $ amounts, firm vs ballpark.
//
// Env: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { preflight, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

const MODEL = "claude-opus-4-8";

// The tool schema IS the contract for what we pull out of every call.
const EXTRACTION_TOOL = {
  name: "record_call",
  description: "Record the structured CRM data extracted from a sales/meeting call transcript.",
  input_schema: {
    type: "object",
    properties: {
      signal: {
        type: "string",
        enum: ["interested", "not_interested", "needs_follow_up", "ready_to_buy", "unknown"],
        description: "Buying signal / disposition of the other party.",
      },
      intent: {
        type: "string",
        enum: ["inquiry", "firm_order", "support_request", "relationship", "unknown"],
        description: "What the call is fundamentally about.",
      },
      summary: { type: "string", description: "2-4 sentence summary of the call." },
      next_action: { type: "string", description: "Concrete next step the rep should take." },
      suggested_doc: {
        type: "string",
        enum: ["quote", "sales_order", "purchase_order", "invoice", "project_scope", "none"],
        description: "Which document this call should flow into next, if any.",
      },
      confidence: {
        type: "number",
        description: "0-1 confidence in this extraction. Low confidence = route to manual review.",
      },
      line_items: {
        type: "array",
        description: "Commodities/services discussed, with quantities and dollar figures.",
        items: {
          type: "object",
          properties: {
            description: { type: "string" },
            quantity: { type: "number" },
            unit: { type: "string", description: "e.g. units, rounds, valves, hours, tons" },
            amount: { type: "number", description: "Dollar figure mentioned for this item." },
            amount_basis: { type: "string", enum: ["per_unit", "total"] },
            figure_type: {
              type: "string",
              enum: ["firm_quote", "ballpark"],
              description: "firm_quote = a committed/quoted price; ballpark = a rough/estimated figure.",
            },
          },
          required: ["description"],
        },
      },
    },
    required: ["signal", "intent", "summary", "confidence", "line_items"],
  },
} as const;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const { call_id } = await req.json();
    if (!call_id) return json({ error: "call_id required" }, 400);

    const db = adminClient();
    const { data: call } = await db
      .from("calls").select("id, type, transcript").eq("id", call_id).single();
    if (!call?.transcript) return json({ error: "no transcript for call" }, 400);

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        tools: [EXTRACTION_TOOL],
        tool_choice: { type: "tool", name: "record_call" },
        messages: [{
          role: "user",
          content:
            `Call type tagged by rep: ${call.type}\n\n` +
            `Extract CRM data from this transcript. Be precise about dollar ` +
            `figures and whether each is a firm quote or a ballpark estimate. ` +
            `If something is unclear, lower the confidence.\n\n` +
            `TRANSCRIPT:\n${call.transcript}`,
        }],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return json({ error: "claude failed", detail: t }, 502);
    }

    const data = await resp.json();
    const toolUse = data.content?.find((b: any) => b.type === "tool_use");
    if (!toolUse) return json({ error: "no structured output" }, 502);
    const out = toolUse.input;

    // Auto-sync threshold: high confidence + a clear buying signal can skip review.
    const autoEligible =
      out.confidence >= 0.8 &&
      (out.signal === "ready_to_buy" || out.intent === "firm_order");

    await db.from("call_insights").upsert({
      call_id,
      signal: out.signal ?? "unknown",
      intent: out.intent ?? "unknown",
      summary: out.summary ?? null,
      next_action: out.next_action ?? null,
      suggested_doc: out.suggested_doc === "none" ? null : out.suggested_doc,
      confidence: out.confidence ?? null,
      sync_status: autoEligible ? "approved" : "pending",
      raw: out,
    });

    // Replace any prior line items for idempotency.
    await db.from("line_items").delete().eq("call_id", call_id);
    if (Array.isArray(out.line_items) && out.line_items.length) {
      await db.from("line_items").insert(
        out.line_items.map((li: any) => ({
          call_id,
          description: li.description,
          quantity: li.quantity ?? null,
          unit: li.unit ?? null,
          amount: li.amount ?? null,
          amount_basis: li.amount_basis ?? null,
          figure_type: li.figure_type ?? null,
        })),
      );
    }

    return json({ call_id, insights: out, auto_approved: autoEligible });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
