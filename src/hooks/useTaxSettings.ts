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
 * Returns 0 if tax is disabled.
 */
export function calcTax(settings: TaxSettings, subtotal: number): number {
  if (!settings.enabled || settings.percent <= 0) return 0;
  // For now, only exclusive tax is calculated. Inclusive stored for future use.
  return Math.round(subtotal * (settings.percent / 100) * 100) / 100;
}
