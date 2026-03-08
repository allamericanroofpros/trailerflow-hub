import { useOrg } from "@/contexts/OrgContext";
import { useMemo } from "react";

export interface SurchargeSettings {
  enabled: boolean;
  label: string;
  percent: number;
  flat: number | null;
  cap: number | null;
}

/**
 * Returns the current org's surcharge settings.
 * The org object is already loaded via OrgContext.
 */
export function useSurchargeSettings(): SurchargeSettings {
  const { currentOrg } = useOrg();

  return useMemo(() => {
    const org = currentOrg as any;
    return {
      enabled: org?.surcharge_enabled ?? false,
      label: org?.surcharge_label ?? "Non-Cash Adjustment",
      percent: org?.surcharge_percent ?? 3.0,
      flat: org?.surcharge_flat ?? null,
      cap: org?.surcharge_cap ?? null,
    };
  }, [currentOrg]);
}

/**
 * Calculate surcharge amount for a given subtotal.
 * Returns 0 if surcharge is disabled or payment is not card.
 */
export function calcSurcharge(
  settings: SurchargeSettings,
  subtotal: number,
  paymentMethod: "cash" | "card" | "digital"
): number {
  if (!settings.enabled || paymentMethod !== "card") return 0;

  let amount = subtotal * (settings.percent / 100);
  if (settings.flat) amount += settings.flat;
  if (settings.cap && amount > settings.cap) amount = settings.cap;

  return Math.round(amount * 100) / 100;
}
