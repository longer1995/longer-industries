// GET /recap-view?token=...   (public — no auth)
// Renders the hosted, branded recap page the customer opens. Figures come from the
// frozen line_items snapshot. Counts the view (the viral-loop signal) and footers a
// subtle "Captured with {brand} — by Atlas Agentics" CTA back to new signups.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SIGNUP_URL (optional)
import { adminClient } from "../_shared/supabase.ts";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

function html(recap: any): string {
  const items: any[] = Array.isArray(recap.line_items) ? recap.line_items : [];
  const rows = items.map((li) => {
    const qty = li.quantity ? `${li.quantity}${li.unit ? " " + esc(li.unit) : ""}` : "—";
    const amt = typeof li.amount === "number" ? usd(li.amount) : "—";
    const badge = li.figure_type === "firm_quote"
      ? `<span class="badge firm">Firm quote</span>`
      : li.figure_type === "ballpark"
      ? `<span class="badge est">Ballpark</span>`
      : "";
    return `<tr><td>${esc(li.description)} ${badge}</td><td class="num">${qty}</td><td class="num">${amt}</td></tr>`;
  }).join("");

  const greeting = recap.recipient_name ? `Hi ${esc(recap.recipient_name)},` : "Hi,";
  const intro = esc(recap.intro).replace(/\n/g, "<br>");
  const closing = esc(recap.closing).replace(/\n/g, "<br>");
  const signupUrl = Deno.env.get("SIGNUP_URL") ?? "https://longercrm.app";

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(recap.subject ?? "Your recap")}</title>
<style>
  :root { color-scheme: light; }
  body { margin:0; background:#f4f5f7; color:#1a1c1f; font:16px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; }
  .wrap { max-width:640px; margin:40px auto; background:#fff; border-radius:18px; overflow:hidden; box-shadow:0 8px 40px rgba(0,0,0,.08); }
  .head { padding:28px 32px; border-bottom:1px solid #eef0f2; }
  .brand { font-weight:700; font-size:18px; letter-spacing:-.2px; }
  .subject { margin:6px 0 0; color:#6b7075; font-size:14px; }
  .body { padding:28px 32px; }
  .greeting { font-weight:600; margin:0 0 12px; }
  table { width:100%; border-collapse:collapse; margin:22px 0 8px; font-size:15px; }
  th { text-align:left; color:#6b7075; font-weight:600; font-size:12px; text-transform:uppercase; letter-spacing:.4px; padding:0 0 8px; border-bottom:1px solid #eef0f2; }
  td { padding:12px 0; border-bottom:1px solid #f3f4f6; vertical-align:top; }
  td.num { text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; }
  .badge { display:inline-block; font-size:11px; padding:2px 8px; border-radius:999px; margin-left:6px; vertical-align:middle; }
  .badge.firm { background:#e7f6ec; color:#1a7f43; }
  .badge.est  { background:#fdf2e2; color:#9a6700; }
  .foot { padding:18px 32px 26px; border-top:1px solid #eef0f2; color:#9aa0a6; font-size:13px; text-align:center; }
  .foot a { color:#6b7075; }
</style></head>
<body><div class="wrap">
  <div class="head">
    <div class="brand">${esc(recap.brand_name)}</div>
    <p class="subject">${esc(recap.subject ?? "")}</p>
  </div>
  <div class="body">
    <p class="greeting">${greeting}</p>
    <p>${intro}</p>
    ${rows ? `<table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead><tbody>${rows}</tbody></table>` : ""}
    <p>${closing}</p>
  </div>
  <div class="foot">
    Captured with <strong>${esc(recap.brand_name)}</strong> — by Atlas Agentics ·
    <a href="${esc(signupUrl)}">Try it free</a>
  </div>
</div></body></html>`;
}

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return new Response("Not found", { status: 404 });

  const db = adminClient();
  const { data: recap } = await db
    .from("recaps")
    .select("subject, intro, closing, line_items, recipient_name, brand_name, view_count")
    .eq("share_token", token).single();
  if (!recap) return new Response("Not found", { status: 404 });

  // Count the open — the viral-loop signal — and mark it viewed.
  await db.from("recaps")
    .update({ view_count: (recap.view_count ?? 0) + 1, last_viewed_at: new Date().toISOString(), status: "viewed" })
    .eq("share_token", token);

  return new Response(html(recap), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
});
