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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is super_admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (callerRole?.role !== "super_admin") {
      throw new Error("Super admin access required");
    }

    const { action, user_id, role, email } = await req.json();

    switch (action) {
      case "change_role": {
        if (!user_id || !role) throw new Error("user_id and role required");
        if (!["owner", "manager", "staff", "super_admin"].includes(role)) {
          throw new Error("Invalid role");
        }
        const { error } = await adminClient
          .from("user_roles")
          .update({ role })
          .eq("user_id", user_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, message: `Role changed to ${role}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "disable_user": {
        if (!user_id) throw new Error("user_id required");
        // Ban the user in auth
        const { error } = await adminClient.auth.admin.updateUserById(user_id, {
          ban_duration: "876000h", // ~100 years
        });
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, message: "User disabled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "enable_user": {
        if (!user_id) throw new Error("user_id required");
        const { error } = await adminClient.auth.admin.updateUserById(user_id, {
          ban_duration: "none",
        });
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, message: "User enabled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_user": {
        if (!user_id) throw new Error("user_id required");
        const { error } = await adminClient.auth.admin.deleteUser(user_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, message: "User deleted" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_user_details": {
        if (!user_id) throw new Error("user_id required");
        const { data: authUser, error } = await adminClient.auth.admin.getUserById(user_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({
            success: true,
            user: {
              id: authUser.user.id,
              email: authUser.user.email,
              created_at: authUser.user.created_at,
              last_sign_in_at: authUser.user.last_sign_in_at,
              banned_until: authUser.user.banned_until,
              confirmed_at: authUser.user.confirmed_at,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list_auth_users": {
        const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        if (error) throw error;
        return new Response(
          JSON.stringify({
            success: true,
            users: data.users.map(u => ({
              id: u.id,
              email: u.email,
              created_at: u.created_at,
              last_sign_in_at: u.last_sign_in_at,
              banned_until: u.banned_until,
            })),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "impersonate": {
        if (!user_id) throw new Error("user_id required");
        // Generate a magic link for the target user
        const { data: authUser } = await adminClient.auth.admin.getUserById(user_id);
        if (!authUser?.user?.email) throw new Error("User has no email");
        
        const { data, error } = await adminClient.auth.admin.generateLink({
          type: "magiclink",
          email: authUser.user.email,
          options: {
            redirectTo: `${req.headers.get("origin") || supabaseUrl}`,
          },
        });
        if (error) throw error;
        
        return new Response(
          JSON.stringify({
            success: true,
            // Return the hashed token properties for client-side session verification
            token_hash: data.properties?.hashed_token,
            verification_type: data.properties?.verification_type,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
