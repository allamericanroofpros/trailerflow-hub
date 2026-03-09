import { useOrg } from "@/contexts/OrgContext";
import { getEntitlements, suggestedUpgrade, type PlanEntitlements, type PlanKey } from "@/config/entitlements";
import { useTrailers } from "@/hooks/useTrailers";
import { useStaffMembers } from "@/hooks/useStaffMembers";

export interface EntitlementState extends PlanEntitlements {
  currentPlan: PlanKey;
  trailerCount: number;
  staffCount: number;
  canAddTrailer: boolean;
  canAddStaff: boolean;
  suggestedUpgrade: PlanKey | null;
}

export function useEntitlements(): EntitlementState {
  const { currentOrg } = useOrg();
  const { data: trailers } = useTrailers();
  const { data: staff } = useStaffMembers();

  const plan = (currentOrg?.plan || "pro") as PlanKey;
  const ent = getEntitlements(plan);
  const trailerCount = trailers?.length ?? 0;
  const staffCount = staff?.length ?? 0;

  return {
    ...ent,
    currentPlan: plan,
    trailerCount,
    staffCount,
    canAddTrailer: trailerCount < ent.maxTrailers,
    canAddStaff: staffCount < ent.maxStaff,
    suggestedUpgrade: suggestedUpgrade(plan),
  };
}
