import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY is not configured");

    const {
      to,
      orderNumber,
      items,
      subtotal,
      tax,
      taxLabel,
      tip,
      total,
      paymentMethod,
      cardLast4,
      surchargeAmount,
      surchargeLabel,
      businessName,
      receiptUrl,
    } = await req.json();

    if (!to || !to.includes("@")) throw new Error("Valid email address required");
    if (!orderNumber) throw new Error("orderNumber is required");

    const date = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const time = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    const orgName = businessName || "VendorFlow Merchant";

    // Build item rows
    const itemRows = (items || [])
      .map(
        (item: { name: string; quantity: number; price: number }) =>
          `<tr>
            <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#374151;font-size:14px;">
              ${item.quantity}&times; ${escapeHtml(item.name)}
            </td>
            <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#374151;font-size:14px;text-align:right;">
              $${(item.price * item.quantity).toFixed(2)}
            </td>
          </tr>`
      )
      .join("");

    // Build summary rows
    let summaryRows = `
      <tr>
        <td style="padding:6px 0;color:#6b7280;font-size:14px;">Subtotal</td>
        <td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;font-weight:600;">$${(subtotal ?? 0).toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#6b7280;font-size:14px;">${escapeHtml(taxLabel || "Tax")}</td>
        <td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;font-weight:600;">$${(tax ?? 0).toFixed(2)}</td>
      </tr>`;

    if (tip && tip > 0) {
      summaryRows += `
      <tr>
        <td style="padding:6px 0;color:#6b7280;font-size:14px;">Tip</td>
        <td style="padding:6px 0;color:#16a34a;font-size:14px;text-align:right;font-weight:600;">$${tip.toFixed(2)}</td>
      </tr>`;
    }

    if (surchargeAmount && surchargeAmount > 0) {
      summaryRows += `
      <tr>
        <td style="padding:6px 0;color:#6b7280;font-size:14px;">${escapeHtml(surchargeLabel || "Non-Cash Adjustment")}</td>
        <td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;font-weight:600;">$${surchargeAmount.toFixed(2)}</td>
      </tr>`;
    }

    // Payment method display
    let paymentDisplay = paymentMethod || "Card";
    if (paymentMethod === "card" && cardLast4) {
      paymentDisplay = `Card ending in ${cardLast4}`;
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr><td style="background-color:#16a34a;padding:24px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:#ffffff;">Receipt</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:4px;">${escapeHtml(orgName)}</div>
        </td></tr>

        <!-- Order info -->
        <tr><td style="padding:24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#6b7280;font-size:13px;">Order #${orderNumber}</td>
              <td style="color:#6b7280;font-size:13px;text-align:right;">${date}<br>${time}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Items -->
        <tr><td style="padding:0 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${itemRows}
          </table>
        </td></tr>

        <!-- Summary -->
        <tr><td style="padding:16px 24px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${summaryRows}
            <tr>
              <td style="padding:12px 0 0;border-top:2px solid #e5e7eb;color:#111827;font-size:18px;font-weight:800;">Total</td>
              <td style="padding:12px 0 0;border-top:2px solid #e5e7eb;color:#111827;font-size:18px;font-weight:800;text-align:right;">$${(total ?? 0).toFixed(2)}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Payment method -->
        <tr><td style="padding:16px 24px;">
          <div style="background-color:#f3f4f6;border-radius:8px;padding:12px 16px;font-size:13px;color:#6b7280;">
            Paid with <strong style="color:#374151;">${escapeHtml(paymentDisplay)}</strong>
          </div>
        </td></tr>

        <!-- Thank you -->
        <tr><td style="padding:8px 24px 24px;text-align:center;">
          <p style="color:#6b7280;font-size:14px;margin:0 0 12px;">Thank you for your purchase!</p>
          ${receiptUrl ? `<a href="${escapeHtml(receiptUrl)}" style="display:inline-block;background-color:#2563eb;color:#ffffff;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">View Full Receipt</a>` : ""}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 24px;border-top:1px solid #f0f0f0;text-align:center;">
          <p style="color:#9ca3af;font-size:11px;margin:0;">Powered by VendorFlow</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // Send via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${orgName} <receipts@getvendorflow.app>`,
        to: [to],
        subject: `Receipt from ${orgName} — Order #${orderNumber}`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errBody = await resendResponse.text();
      console.error("[SEND-RECEIPT-EMAIL] Resend error:", errBody);
      throw new Error(`Email delivery failed: ${resendResponse.status}`);
    }

    const resendData = await resendResponse.json();

    return new Response(
      JSON.stringify({ success: true, emailId: resendData.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[SEND-RECEIPT-EMAIL] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
