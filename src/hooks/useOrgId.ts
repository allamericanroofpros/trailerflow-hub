import { useOrg } from "@/contexts/OrgContext";

/**
 * Returns the current organization ID.
 * All data hooks should use this to scope queries to the active org.
 */
export function useOrgId(): string | null {
  const { currentOrg } = useOrg();
  return currentOrg?.id ?? null;
}
