import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";

type Status = "loading" | "success" | "error" | "unauthenticated";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const token = searchParams.get("token");

  useEffect(() => {
    if (authLoading) return;

    if (!session) {
      // Preserve the token so we can resume after login
      const returnUrl = `/accept-invite?token=${token}`;
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (!token) {
      setStatus("error");
      setErrorMessage("Invalid invite link — no token found.");
      return;
    }

    acceptInvite();
  }, [session, authLoading, token]);

  const acceptInvite = async () => {
    setStatus("loading");
    try {
      // Look up the invite
      const { data: invite, error: fetchError } = await supabase
        .from("team_invites")
        .select("id, org_id, email, role, status, expires_at")
        .eq("id", token!)
        .single();

      if (fetchError || !invite) {
        throw new Error("Invite not found or has been revoked.");
      }

      if (invite.status !== "pending") {
        throw new Error(
          invite.status === "accepted"
            ? "This invite has already been accepted."
            : "This invite is no longer valid."
        );
      }

      if (new Date(invite.expires_at) < new Date()) {
        throw new Error("This invite has expired. Ask your team admin to send a new one.");
      }

      const userId = session!.user.id;

      // Add user to org with the invited role
      const { error: roleError } = await supabase.from("user_roles").upsert(
        { user_id: userId, org_id: invite.org_id, role: invite.role },
        { onConflict: "user_id,org_id" }
      );
      if (roleError) throw roleError;

      // Mark invite as accepted
      const { error: updateError } = await supabase
        .from("team_invites")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", token!);
      if (updateError) throw updateError;

      // Switch active org context so dashboard loads the right org
      localStorage.setItem("vendorflow_current_org", invite.org_id);

      setStatus("success");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to accept invite.");
      setStatus("error");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center space-y-5">
        <div className="flex justify-center">
          <BrandLogo size="lg" />
        </div>

        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Accepting your invite…</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="mx-auto h-10 w-10 text-green-500" />
            <h1 className="text-xl font-bold">You're in!</h1>
            <p className="text-sm text-muted-foreground">Redirecting to your dashboard…</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="text-xl font-bold">Invite Error</h1>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
