import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  status: string;
  plan: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

interface OrgMembership {
  org_id: string;
  role: string;
  organization: Organization;
}

interface OrgContextType {
  currentOrg: Organization | null;
  memberships: OrgMembership[];
  orgRole: string | null;
  loading: boolean;
  switchOrg: (orgId: string) => void;
  refreshOrg: () => void;
}

const OrgContext = createContext<OrgContextType>({
  currentOrg: null,
  memberships: [],
  orgRole: null,
  loading: true,
  switchOrg: () => {},
  refreshOrg: () => {},
});

export const useOrg = () => useContext(OrgContext);

const ORG_KEY = "traileros_current_org";

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user, role: globalRole } = useAuth();
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(
    () => localStorage.getItem(ORG_KEY)
  );
  const [loading, setLoading] = useState(true);

  const queryClient = useQueryClient();

  const fetchMemberships = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("organization_members")
      .select("org_id, role, organization:organizations(*)")
      .eq("user_id", user.id);

    if (error || !data) {
      setMemberships([]);
      setLoading(false);
      return;
    }

    const mapped = data.map((m: any) => ({
      org_id: m.org_id,
      role: m.role,
      organization: m.organization,
    }));

    setMemberships(mapped);

    // Auto-select org
    if (mapped.length > 0) {
      const savedId = localStorage.getItem(ORG_KEY);
      const valid = mapped.find((m) => m.org_id === savedId);
      if (valid) {
        setCurrentOrgId(valid.org_id);
      } else {
        setCurrentOrgId(mapped[0].org_id);
        localStorage.setItem(ORG_KEY, mapped[0].org_id);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!user) {
      setMemberships([]);
      setCurrentOrgId(null);
      setLoading(false);
      return;
    }

    fetchMemberships();
  }, [user]);

  const switchOrg = (orgId: string) => {
    setCurrentOrgId(orgId);
    localStorage.setItem(ORG_KEY, orgId);
    // Invalidate ALL data caches so queries re-fetch with new org scope
    queryClient?.invalidateQueries();
  };

  const currentMembership = memberships.find((m) => m.org_id === currentOrgId);
  const currentOrg = currentMembership?.organization ?? null;
  const orgRole = currentMembership?.role ?? null;

  return (
    <OrgContext.Provider value={{ currentOrg, memberships, orgRole, loading, switchOrg }}>
      {children}
    </OrgContext.Provider>
  );
}
