/**
 * Centralized plan entitlements — single source of truth for limits & feature flags.
 *
 * PLAN MATRIX (Beta):
 * ┌──────────────┬──────────┬─────┬────────────┐
 * │ Feature      │ Founders │ Pro │ Enterprise │
 * ├──────────────┼──────────┼─────┼────────────┤
 * │ Trailers     │    ∞     │ ∞   │     ∞      │
 * │ Staff        │    ∞     │ ∞   │     ∞      │
 * │ AI Discovery │    ✓     │ ✓   │     ✓      │
 * │ AI Forecast  │    ✓     │ ✓   │     ✓      │
 * │ AI Chat      │    ✓     │ ✓   │     ✓      │
 * │ Fleet View   │    ✓     │ ✓   │     ✓      │
 * │ Adv.Analytics│    ✓     │ ✓   │     ✓      │
 * │ Multi-Org    │    ✓     │ ✗   │     ✓      │
 * │ Integrations │    ✓     │ ✗   │     ✓      │
 * │ White-Label  │    ✓     │ ✗   │     ✓      │
 * └──────────────┴──────────┴─────┴────────────┘
 *
 * Free / Starter are hidden during beta.
 * Founders = Enterprise features at $29/mo (first 100 orgs, locked for life).
 */

export type PlanKey = "free" | "starter" | "pro" | "enterprise" | "founders";

export interface PlanEntitlements {
  label: string;
  maxTrailers: number;
  maxStaff: number;
  aiChat: boolean;
  aiDiscovery: boolean;
  aiForecasting: boolean;
  fleetOverview: boolean;
  advancedAnalytics: boolean;
  multiOrgManagement: boolean;
  customIntegrations: boolean;
  whiteLabelReceipts: boolean;
}

export const PLAN_ENTITLEMENTS: Record<PlanKey, PlanEntitlements> = {
  free: {
    label: "Free",
    maxTrailers: 1,
    maxStaff: 2,
    aiChat: false,
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
    maxStaff: 5,
    aiChat: true,
    aiDiscovery: false,
    aiForecasting: false,
    fleetOverview: false,
    advancedAnalytics: false,
    multiOrgManagement: false,
    customIntegrations: false,
    whiteLabelReceipts: false,
  },
  founders: {
    label: "Founders",
    maxTrailers: Infinity,
    maxStaff: Infinity,
    aiChat: true,
    aiDiscovery: true,
    aiForecasting: true,
    fleetOverview: true,
    advancedAnalytics: true,
    multiOrgManagement: true,
    customIntegrations: true,
    whiteLabelReceipts: true,
  },
  pro: {
    label: "Pro",
    maxTrailers: Infinity,
    maxStaff: Infinity,
    aiChat: true,
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
    aiChat: true,
    aiDiscovery: true,
    aiForecasting: true,
    fleetOverview: true,
    advancedAnalytics: true,
    multiOrgManagement: true,
    customIntegrations: true,
    whiteLabelReceipts: true,
  },
};

/** Safely resolve a plan string to entitlements, defaulting to pro (no free during beta) */
export function getEntitlements(plan: string | null | undefined): PlanEntitlements {
  const key = (plan || "pro") as PlanKey;
  return PLAN_ENTITLEMENTS[key] ?? PLAN_ENTITLEMENTS.pro;
}

/** Suggested upgrade plan for a given plan */
export function suggestedUpgrade(plan: string | null | undefined): PlanKey | null {
  switch (plan) {
    case "founders":
      return null; // locked for life
    case "pro":
      return "enterprise";
    case "enterprise":
      return null;
    default:
      return "pro";
  }
}
