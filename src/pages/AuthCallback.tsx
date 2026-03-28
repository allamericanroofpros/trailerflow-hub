import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Supabase JS v2 automatically parses the auth tokens from the URL
    // (both hash-based implicit flow and PKCE code flow).
    // We listen for SIGNED_IN, then redirect based on pending plan.
    const redirect = (session: boolean) => {
      if (!session) {
        navigate("/login?error=confirmation_failed", { replace: true });
        return;
      }
      const pendingPlan = localStorage.getItem("vf_pending_plan");
      navigate(pendingPlan ? "/settings" : "/dashboard", { replace: true });
    };

    // First check if a session is already available (handles PKCE code exchange)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setErrorMsg(error.message);
        setTimeout(() => navigate("/login", { replace: true }), 2500);
        return;
      }
      if (session) {
        redirect(true);
        return;
      }

      // Not yet resolved — wait for the auth state change event
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (event === "SIGNED_IN" && session) {
            subscription.unsubscribe();
            redirect(true);
          } else if (event === "TOKEN_REFRESHED") {
            // ignore
          } else if (!session) {
            subscription.unsubscribe();
            redirect(false);
          }
        }
      );

      // Safety timeout: if nothing fires in 10s, send to login
      const timeout = setTimeout(() => {
        subscription.unsubscribe();
        navigate("/login", { replace: true });
      }, 10000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeout);
      };
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      {errorMsg ? (
        <p className="text-sm text-destructive max-w-xs text-center">
          {errorMsg} — redirecting to login…
        </p>
      ) : (
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      )}
    </div>
  );
}
