import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is an owner
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Use anon client to check caller's role
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    // Check owner role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();
    
    if (callerRole?.role !== "owner") {
      throw new Error("Only owners can create team accounts");
    }

    const { email, password, full_name, role, organization_id } = await req.json();
    if (!organization_id) {
      throw new Error("Missing required field: organization_id");
    }

    // Verify caller is a member (owner) of this org
    const { data: callerMembership } = await adminClient
      .from("organization_members")
      .select("role")
      .eq("user_id", caller.id)
      .eq("org_id", organization_id)
      .single();
    
    if (!callerMembership || callerMembership.role !== "owner") {
      throw new Error("You must be an owner of this organization");
    }
    if (!email || !password || !full_name || !role) {
      throw new Error("Missing required fields: email, password, full_name, role");
    }
    if (!["owner", "manager", "staff"].includes(role)) {
      throw new Error("Invalid role");
    }
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Create the auth user (auto-confirms)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createError) throw createError;

    const userId = newUser.user.id;

    // The handle_new_user trigger will create profile + default staff role.
    // Now update the role to the specified one.
    if (role !== "staff") {
      await adminClient
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);
    }

    // Auto-link: if a staff_members entry has matching email, set user_id
    await adminClient
      .from("staff_members")
      .update({ user_id: userId })
      .eq("email", email)
      .is("user_id", null);

    return new Response(
      JSON.stringify({ success: true, user_id: userId, email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
