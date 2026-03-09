/**
 * Platform fee schedule by plan tier.
 * Collected via Stripe application_fee_amount on connected-account payments.
 */
export const PLATFORM_FEE_PCT: Record<string, number> = {
  free: 1.5,
  starter: 0.5,
  pro: 0,
  enterprise: 0,
};

export function getPlatformFeePct(plan: string): number {
  return PLATFORM_FEE_PCT[plan] ?? PLATFORM_FEE_PCT.free;
}

export function getPlatformFeeLabel(plan: string): string {
  const pct = getPlatformFeePct(plan);
  return pct > 0 ? `${pct}%` : "None";
}
