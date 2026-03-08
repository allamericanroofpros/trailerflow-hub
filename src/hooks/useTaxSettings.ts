import { useOrg } from "@/contexts/OrgContext";
import { useMemo } from "react";

export interface TaxSettings {
  enabled: boolean;
  label: string;
  percent: number;
  inclusive: boolean;
}

/**
 * Returns the current org's tax settings.
 */
export function useTaxSettings(): TaxSettings {
  const { currentOrg } = useOrg();

  return useMemo(() => {
    const org = currentOrg as any;
    return {
      enabled: org?.tax_enabled ?? true,
      label: org?.tax_label ?? "Sales Tax",
      percent: org?.tax_percent ?? 0,
      inclusive: org?.tax_inclusive ?? false,
    };
  }, [currentOrg]);
}

/**
 * Calculate tax amount for a given subtotal.
 * Returns 0 if tax is disabled or percent is 0.
 *
 * Inclusive: tax is extracted from the subtotal (prices already include tax).
 *   tax = subtotal × (rate / (100 + rate))
 *
 * Exclusive: tax is added on top.
 *   tax = subtotal × (rate / 100)
 */
export function calcTax(settings: TaxSettings, subtotal: number): number {
  if (!settings.enabled || settings.percent <= 0) return 0;

  const rate = settings.percent;
  const raw = settings.inclusive
    ? subtotal * (rate / (100 + rate))
    : subtotal * (rate / 100);

  return Math.round(raw * 100) / 100;
}

/**
 * Calculate the total after tax.
 * Inclusive: total = subtotal (tax already inside).
 * Exclusive: total = subtotal + tax.
 */
export function calcTotalWithTax(settings: TaxSettings, subtotal: number): number {
  if (!settings.enabled || settings.percent <= 0) return subtotal;
  return settings.inclusive ? subtotal : subtotal + calcTax(settings, subtotal);
}
