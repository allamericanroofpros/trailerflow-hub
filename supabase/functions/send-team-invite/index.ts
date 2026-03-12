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

    const { invitee_email, org_name, inviter_name, role, invite_id } = await req.json();

    if (!invitee_email || !invitee_email.includes("@")) {
      throw new Error("Valid invitee_email is required");
    }
    if (!invite_id) throw new Error("invite_id is required");

    const orgName = org_name || "VendorFlow";
    const inviterDisplay = inviter_name || "A team member";
    const roleDisplay = (role || "staff").charAt(0).toUpperCase() + (role || "staff").slice(1);
    const acceptUrl = `https://getvendorflow.app/accept-invite?token=${encodeURIComponent(invite_id)}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr><td style="background-color:#2563eb;padding:32px 24px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:#ffffff;">You're Invited!</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:6px;">Join ${escapeHtml(orgName)} on VendorFlow</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 24px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px;">
            <strong>${escapeHtml(inviterDisplay)}</strong> has invited you to join
            <strong>${escapeHtml(orgName)}</strong> as a <strong>${escapeHtml(roleDisplay)}</strong>.
          </p>

          <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 28px;">
            VendorFlow is an all-in-one platform for food trucks and mobile vendors.
            Accept the invitation below to get started with your team.
          </p>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${escapeHtml(acceptUrl)}"
                 style="display:inline-block;background-color:#2563eb;color:#ffffff;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:700;text-decoration:none;letter-spacing:0.01em;">
                Accept Invitation
              </a>
            </td></tr>
          </table>

          <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:24px 0 0;text-align:center;">
            This invitation will expire in 7 days. If you didn't expect this email, you can safely ignore it.
          </p>
        </td></tr>

        <!-- Details box -->
        <tr><td style="padding:0 24px 24px;">
          <div style="background-color:#f3f4f6;border-radius:8px;padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#6b7280;font-size:13px;padding:4px 0;">Organization</td>
                <td style="color:#374151;font-size:13px;font-weight:600;text-align:right;padding:4px 0;">${escapeHtml(orgName)}</td>
              </tr>
              <tr>
                <td style="color:#6b7280;font-size:13px;padding:4px 0;">Your Role</td>
                <td style="color:#374151;font-size:13px;font-weight:600;text-align:right;padding:4px 0;">${escapeHtml(roleDisplay)}</td>
              </tr>
              <tr>
                <td style="color:#6b7280;font-size:13px;padding:4px 0;">Invited By</td>
                <td style="color:#374151;font-size:13px;font-weight:600;text-align:right;padding:4px 0;">${escapeHtml(inviterDisplay)}</td>
              </tr>
            </table>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 24px;border-top:1px solid #f0f0f0;text-align:center;">
          <p style="color:#9ca3af;font-size:11px;margin:0;">Powered by VendorFlow &mdash; getvendorflow.app</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${orgName} <noreply@getvendorflow.app>`,
        to: [invitee_email],
        subject: `${inviterDisplay} invited you to join ${orgName} on VendorFlow`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errBody = await resendResponse.text();
      console.error("[SEND-TEAM-INVITE] Resend error:", errBody);
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
    console.error("[SEND-TEAM-INVITE] Error:", msg);
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
