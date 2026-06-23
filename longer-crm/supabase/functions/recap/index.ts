// POST /recap  { call_id, recipient_name?, recipient_email? }
// Generates a branded, customer-facing recap for a call: Claude writes the prose,
// the dollar figures are frozen from the call's line_items (never regenerated, so
// nothing can be hallucinated into something the rep sends a customer). Returns a
// share URL to a hosted, branded page (the viral loop — see /recap-view).
//
// Auth: user JWT.  Env: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { preflight, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

const MODEL = "claude-opus-4-8";

// Prose only — no numbers. The quote table is rendered from the DB snapshot.
const RECAP_TOOL = {
  name: "write_recap",
  description: "Write the prose for a warm, professional recap message from a sales rep to their customer after a conversation.",
  input_schema: {
    type: "object",
    properties: {
      subject: { type: "string", description: "Email-style subject line." },
      intro: {
        type: "string",
        description:
          "1-2 short paragraphs thanking them and recapping what was discussed. " +
          "Warm, concise, professional. DO NOT state any dollar figures or quantities " +
          "— a clean quote table is added separately.",
      },
      closing: {
        type: "string",
        description:
          "Short closing: the next step and a sign-off. No dollar figures.",
      },
    },
    required: ["subject", "intro", "closing"],
  },
} as const;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const body = await req.json();
    const { call_id } = body;
    if (!call_id) return json({ error: "call_id required" }, 400);

    const db = adminClient();

    // Resolve the owner from the user's JWT.
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const { data: u } = await db.auth.getUser(auth.slice(7));
    if (!u.user) return json({ error: "unauthorized" }, 401);
    const owner_id = u.user.id;

    // Load the call + its extracted insight + line items (owner-scoped).
    const { data: call } = await db
      .from("calls")
      .select("id, type, owner_id, contact_id, transcript")
      .eq("id", call_id).eq("owner_id", owner_id).single();
    if (!call) return json({ error: "call not found" }, 404);

    const { data: insight } = await db
      .from("call_insights").select("summary, next_action").eq("call_id", call_id).single();
    const { data: items } = await db
      .from("line_items")
      .select("description, quantity, unit, amount, amount_basis, figure_type")
      .eq("call_id", call_id);

    // Rep's brand for the recap (fallback to product name).
    const brand_name = (body.brand_name as string) ?? "Longer CRM";

    // Ask Claude for the prose only.
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        tools: [RECAP_TOOL],
        tool_choice: { type: "tool", name: "write_recap" },
        messages: [{
          role: "user",
          content:
            `Write a recap message to ${body.recipient_name ?? "the customer"} after a ` +
            `${call.type} conversation. Keep it warm and brief. Do NOT include any ` +
            `dollar amounts or quantities (a quote table is attached separately).\n\n` +
            `What was discussed (summary): ${insight?.summary ?? "n/a"}\n` +
            `Agreed next step: ${insight?.next_action ?? "n/a"}`,
        }],
      }),
    });
    if (!resp.ok) return json({ error: "claude failed", detail: await resp.text() }, 502);
    const data = await resp.json();
    const out = data.content?.find((b: any) => b.type === "tool_use")?.input;
    if (!out) return json({ error: "no recap output" }, 502);

    const { data: recap, error } = await db
      .from("recaps")
      .insert({
        call_id,
        owner_id,
        subject: out.subject,
        intro: out.intro,
        closing: out.closing,
        line_items: items ?? [],
        recipient_name: body.recipient_name ?? null,
        recipient_email: body.recipient_email ?? null,
        brand_name,
        status: "sent",
      })
      .select("id, share_token")
      .single();
    if (error) return json({ error: error.message }, 500);

    const share_url =
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/recap-view?token=${recap.share_token}`;

    // NOTE: emailing the recap (recipient_email) needs an email provider (e.g.
    // Resend). For now the frontend shares the share_url; wire Resend here later.
    return json({ recap_id: recap.id, share_token: recap.share_token, share_url, subject: out.subject });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
