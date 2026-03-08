/**
 * Centralized plan entitlements — single source of truth for limits & feature flags.
 * All gating logic reads from here.
 */

export type PlanKey = "free" | "starter" | "pro" | "enterprise";

export interface PlanEntitlements {
  label: string;
  maxTrailers: number;
  maxStaff: number;
  aiDiscovery: boolean;
  aiForecasting: boolean;
  fleetOverview: boolean;
  advancedAnalytics: boolean;
  /** Reserved for future enterprise-only features */
  multiOrgManagement: boolean;
  customIntegrations: boolean;
  whiteLabelReceipts: boolean;
}

export const PLAN_ENTITLEMENTS: Record<PlanKey, PlanEntitlements> = {
  free: {
    label: "Free",
    maxTrailers: 1,
    maxStaff: 2,
    aiDiscovery: false,
    aiForecasting: false,
    fleetOverview: false,
    advancedAnalytics: false,
    multiOrgManagement: false,
    customIntegrations: false,
    whiteLabelReceipts: false,
  },
  starter: {
    label: "Starter",
    maxTrailers: 1,
    maxStaff: 2,
    aiDiscovery: false,
    aiForecasting: false,
    fleetOverview: false,
    advancedAnalytics: false,
    multiOrgManagement: false,
    customIntegrations: false,
    whiteLabelReceipts: false,
  },
  pro: {
    label: "Pro",
    maxTrailers: Infinity,
    maxStaff: Infinity,
    aiDiscovery: true,
    aiForecasting: true,
    fleetOverview: true,
    advancedAnalytics: true,
    multiOrgManagement: false,
    customIntegrations: false,
    whiteLabelReceipts: false,
  },
  enterprise: {
    label: "Enterprise",
    maxTrailers: Infinity,
    maxStaff: Infinity,
    aiDiscovery: true,
    aiForecasting: true,
    fleetOverview: true,
    advancedAnalytics: true,
    multiOrgManagement: true,
    customIntegrations: true,
    whiteLabelReceipts: true,
  },
};

/** Safely resolve a plan string to entitlements, defaulting to free */
export function getEntitlements(plan: string | null | undefined): PlanEntitlements {
  const key = (plan || "free") as PlanKey;
  return PLAN_ENTITLEMENTS[key] ?? PLAN_ENTITLEMENTS.free;
}

/** Suggested upgrade plan for a given plan */
export function suggestedUpgrade(plan: string | null | undefined): PlanKey | null {
  switch (plan) {
    case "free":
    case "starter":
      return "pro";
    case "pro":
      return "enterprise";
    default:
      return "pro";
  }
}
