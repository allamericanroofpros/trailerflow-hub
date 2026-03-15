import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function verifySuperAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Not authenticated");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

  return { caller, adminClient };
}

// deno-lint-ignore no-explicit-any
async function logAudit(
  adminClient: any,
  actorId: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  details: Record<string, unknown> = {}
) {
  await adminClient.from("admin_audit_log").insert({
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caller, adminClient } = await verifySuperAdmin(req);
    const body = await req.json();
    const { action, user_id, role, email, password, full_name, phone, org_id, org_role, data: updateData } = body;

    const ok = (result: unknown) =>
      new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    switch (action) {
      // ─── USER LISTING ───
      case "list_auth_users": {
        const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        if (error) throw error;
        return ok({
          success: true,
          users: data.users.map((u) => ({
            id: u.id,
            email: u.email,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            banned_until: u.banned_until,
            phone: u.phone,
            email_confirmed_at: u.email_confirmed_at,
            user_metadata: u.user_metadata,
          })),
        });
      }

      case "get_user_details": {
        if (!user_id) throw new Error("user_id required");
        const { data: authUser, error } = await adminClient.auth.admin.getUserById(user_id);
        if (error) throw error;
        // Also fetch staff linkage
        const { data: staffLink } = await adminClient
          .from("staff_members")
          .select("id, name, status, email, phone, hourly_rate, org_id")
          .eq("user_id", user_id);
        return ok({
          success: true,
          user: {
            id: authUser.user.id,
            email: authUser.user.email,
            phone: authUser.user.phone,
            created_at: authUser.user.created_at,
            last_sign_in_at: authUser.user.last_sign_in_at,
            banned_until: authUser.user.banned_until,
            confirmed_at: authUser.user.confirmed_at,
            email_confirmed_at: authUser.user.email_confirmed_at,
            user_metadata: authUser.user.user_metadata,
          },
          staff_links: staffLink || [],
        });
      }

      // ─── ROLE MANAGEMENT ───
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
        await logAudit(adminClient, caller.id, "change_global_role", "user", user_id, { new_role: role });
        return ok({ success: true, message: `Role changed to ${role}` });
      }

      // ─── BAN/UNBAN ───
      case "disable_user": {
        if (!user_id) throw new Error("user_id required");
        const { error } = await adminClient.auth.admin.updateUserById(user_id, {
          ban_duration: "876000h",
        });
        if (error) throw error;
        await logAudit(adminClient, caller.id, "disable_user", "user", user_id);
        return ok({ success: true, message: "User disabled" });
      }

      case "enable_user": {
        if (!user_id) throw new Error("user_id required");
        const { error } = await adminClient.auth.admin.updateUserById(user_id, {
          ban_duration: "none",
        });
        if (error) throw error;
        await logAudit(adminClient, caller.id, "enable_user", "user", user_id);
        return ok({ success: true, message: "User enabled" });
      }

      case "delete_user": {
        if (!user_id) throw new Error("user_id required");
        const { data: authU } = await adminClient.auth.admin.getUserById(user_id);
        await logAudit(adminClient, caller.id, "delete_user", "user", user_id, { email: authU?.user?.email });
        const { error } = await adminClient.auth.admin.deleteUser(user_id);
        if (error) throw error;
        return ok({ success: true, message: "User deleted" });
      }

      // ─── USER CREATION ───
      case "create_user": {
        if (!email || !password) throw new Error("email and password required");
        // Create auth user
        const { data: newAuth, error: authErr } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          phone: phone || undefined,
          user_metadata: { full_name: full_name || "" },
        });
        if (authErr) throw authErr;
        const newUserId = newAuth.user.id;

        // Profile should be created by trigger, but ensure it exists
        await new Promise((r) => setTimeout(r, 500));
        const { data: existingProfile } = await adminClient
          .from("profiles")
          .select("id")
          .eq("user_id", newUserId)
          .maybeSingle();
        if (!existingProfile) {
          await adminClient.from("profiles").insert({
            user_id: newUserId,
            full_name: full_name || null,
            phone: phone || null,
          });
        } else if (full_name || phone) {
          await adminClient.from("profiles").update({
            full_name: full_name || undefined,
            phone: phone || undefined,
          }).eq("user_id", newUserId);
        }

        // Ensure user_roles exists
        const { data: existingRole } = await adminClient
          .from("user_roles")
          .select("id")
          .eq("user_id", newUserId)
          .maybeSingle();
        if (!existingRole) {
          await adminClient.from("user_roles").insert({ user_id: newUserId, role: "staff" });
        }

        // Add org membership if specified
        if (org_id) {
          const memberRole = org_role || "staff";
          const { data: existingMem } = await adminClient
            .from("organization_members")
            .select("id")
            .eq("user_id", newUserId)
            .eq("org_id", org_id)
            .maybeSingle();
          if (!existingMem) {
            await adminClient.from("organization_members").insert({
              user_id: newUserId,
              org_id,
              role: memberRole,
            });
          }
        }

        // Try to link staff_members if email matches
        await adminClient
          .from("staff_members")
          .update({ user_id: newUserId })
          .eq("email", email)
          .is("user_id", null);

        await logAudit(adminClient, caller.id, "create_user", "user", newUserId, { email, org_id, org_role });
        return ok({ success: true, user_id: newUserId, message: "User created successfully" });
      }

      // ─── UPDATE PROFILE ───
      case "update_profile": {
        if (!user_id) throw new Error("user_id required");
        const updates: Record<string, unknown> = {};
        if (updateData?.full_name !== undefined) updates.full_name = updateData.full_name;
        if (updateData?.phone !== undefined) updates.phone = updateData.phone;
        if (Object.keys(updates).length > 0) {
          const { error } = await adminClient.from("profiles").update(updates).eq("user_id", user_id);
          if (error) throw error;
        }
        // Update auth email if changed
        if (updateData?.email) {
          const { error } = await adminClient.auth.admin.updateUserById(user_id, { email: updateData.email });
          if (error) throw error;
        }
        await logAudit(adminClient, caller.id, "update_profile", "user", user_id, { changes: updateData });
        return ok({ success: true, message: "Profile updated" });
      }

      // ─── MEMBERSHIP MANAGEMENT ───
      case "add_membership": {
        if (!user_id || !org_id) throw new Error("user_id and org_id required");
        const memberRole = org_role || "staff";
        const { data: existing } = await adminClient
          .from("organization_members")
          .select("id")
          .eq("user_id", user_id)
          .eq("org_id", org_id)
          .maybeSingle();
        if (existing) throw new Error("User is already a member of this org");
        const { error } = await adminClient.from("organization_members").insert({
          user_id,
          org_id,
          role: memberRole,
        });
        if (error) throw error;
        await logAudit(adminClient, caller.id, "add_membership", "membership", `${user_id}:${org_id}`, { role: memberRole });
        return ok({ success: true, message: "Membership added" });
      }

      case "remove_membership": {
        if (!user_id || !org_id) throw new Error("user_id and org_id required");
        const { error } = await adminClient
          .from("organization_members")
          .delete()
          .eq("user_id", user_id)
          .eq("org_id", org_id);
        if (error) throw error;
        await logAudit(adminClient, caller.id, "remove_membership", "membership", `${user_id}:${org_id}`);
        return ok({ success: true, message: "Membership removed" });
      }

      case "change_org_role": {
        if (!user_id || !org_id || !org_role) throw new Error("user_id, org_id, and org_role required");
        const { error } = await adminClient
          .from("organization_members")
          .update({ role: org_role })
          .eq("user_id", user_id)
          .eq("org_id", org_id);
        if (error) throw error;
        await logAudit(adminClient, caller.id, "change_org_role", "membership", `${user_id}:${org_id}`, { new_role: org_role });
        return ok({ success: true, message: `Org role changed to ${org_role}` });
      }

      // ─── ORG MANAGEMENT ───
      case "update_org": {
        if (!org_id || !updateData) throw new Error("org_id and data required");
        const { error } = await adminClient.from("organizations").update(updateData).eq("id", org_id);
        if (error) throw error;
        await logAudit(adminClient, caller.id, "update_org", "organization", org_id, { changes: updateData });
        return ok({ success: true, message: "Organization updated" });
      }

      // ─── REPAIR TOOLS ───
      case "repair_user": {
        if (!user_id) throw new Error("user_id required");
        const repairs: string[] = [];

        // 1. Ensure profile exists
        const { data: profile } = await adminClient
          .from("profiles")
          .select("id")
          .eq("user_id", user_id)
          .maybeSingle();
        if (!profile) {
          const { data: authUser } = await adminClient.auth.admin.getUserById(user_id);
          await adminClient.from("profiles").insert({
            user_id,
            full_name: authUser?.user?.user_metadata?.full_name || authUser?.user?.user_metadata?.name || null,
          });
          repairs.push("Created missing profile");
        }

        // 2. Ensure user_roles exists
        const { data: userRole } = await adminClient
          .from("user_roles")
          .select("id")
          .eq("user_id", user_id)
          .maybeSingle();
        if (!userRole) {
          await adminClient.from("user_roles").insert({ user_id, role: "staff" });
          repairs.push("Created missing user_roles entry (staff)");
        }

        // 3. Try to link staff by email
        const { data: authUser } = await adminClient.auth.admin.getUserById(user_id);
        if (authUser?.user?.email) {
          const { data: linked } = await adminClient
            .from("staff_members")
            .update({ user_id })
            .eq("email", authUser.user.email)
            .is("user_id", null)
            .select("id");
          if (linked && linked.length > 0) {
            repairs.push(`Linked ${linked.length} staff record(s) by email`);
          }
        }

        await logAudit(adminClient, caller.id, "repair_user", "user", user_id, { repairs });
        return ok({ success: true, repairs, message: repairs.length > 0 ? `Repaired: ${repairs.join(", ")}` : "No repairs needed" });
      }

      case "repair_org_membership": {
        // Ensure the org owner has a membership
        if (!org_id) throw new Error("org_id required");
        const { data: org } = await adminClient.from("organizations").select("owner_user_id").eq("id", org_id).single();
        if (!org) throw new Error("Organization not found");
        const repairs: string[] = [];
        const { data: ownerMem } = await adminClient
          .from("organization_members")
          .select("id")
          .eq("user_id", org.owner_user_id)
          .eq("org_id", org_id)
          .maybeSingle();
        if (!ownerMem) {
          await adminClient.from("organization_members").insert({
            user_id: org.owner_user_id,
            org_id,
            role: "owner",
          });
          repairs.push("Created missing owner membership");
        }
        await logAudit(adminClient, caller.id, "repair_org_membership", "organization", org_id, { repairs });
        return ok({ success: true, repairs, message: repairs.length > 0 ? `Repaired: ${repairs.join(", ")}` : "No repairs needed" });
      }

      // ─── IMPERSONATION ───
      case "impersonate": {
        if (!user_id) throw new Error("user_id required");
        const { data: authUser } = await adminClient.auth.admin.getUserById(user_id);
        if (!authUser?.user?.email) throw new Error("User has no email");

        const { data, error } = await adminClient.auth.admin.generateLink({
          type: "magiclink",
          email: authUser.user.email,
          options: {
            redirectTo: `${req.headers.get("origin") || Deno.env.get("SUPABASE_URL")}`,
          },
        });
        if (error) throw error;

        await logAudit(adminClient, caller.id, "impersonate_start", "user", user_id, {
          target_email: authUser.user.email,
        });

        return ok({
          success: true,
          token_hash: data.properties?.hashed_token,
          verification_type: data.properties?.verification_type,
          target_email: authUser.user.email,
          target_name: authUser.user.user_metadata?.full_name || authUser.user.email,
        });
      }

      // ─── DIAGNOSTICS ───
      case "diagnose_users": {
        // Find orphaned users (no org membership) and users missing profiles
        const { data: allProfiles } = await adminClient.from("profiles").select("user_id, full_name");
        const { data: allMembers } = await adminClient.from("organization_members").select("user_id").then(r => ({ data: [...new Set(r.data?.map(m => m.user_id) || [])] }));
        const { data: allAuth } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        const { data: allRoles } = await adminClient.from("user_roles").select("user_id");

        const profileUserIds = new Set(allProfiles?.map(p => p.user_id) || []);
        const memberUserIds = new Set(allMembers?.data || []);
        const roleUserIds = new Set(allRoles?.map(r => r.user_id) || []);
        const authUserIds = allAuth?.users?.map(u => u.id) || [];

        const orphanedUsers = allProfiles?.filter(p => !memberUserIds.has(p.user_id)) || [];
        const noProfile = authUserIds.filter(id => !profileUserIds.has(id));
        const noRole = authUserIds.filter(id => !roleUserIds.has(id));

        return ok({
          success: true,
          total_auth_users: authUserIds.length,
          total_profiles: allProfiles?.length || 0,
          orphaned_no_org: orphanedUsers.map(p => ({ user_id: p.user_id, name: p.full_name })),
          auth_no_profile: noProfile,
          auth_no_role: noRole,
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
