export const TIERS = {
  starter: {
    name: "Starter",
    price: 29,
    price_id: "price_1T8ntxEHIsr46VcJ3J4mPMEq",
    product_id: "prod_U71xlqwCNiq83e",
    features: [
      "1 trailer",
      "Full POS system",
      "Menu & inventory management",
      "Booking system",
      "Basic reports",
      "2 staff accounts",
    ],
    limits: { trailers: 1, staff: 2 },
  },
  pro: {
    name: "Pro",
    price: 79,
    price_id: "price_1T8nuWEHIsr46VcJxMizsKl7",
    product_id: "prod_U71yhcJZEwTQZv",
    features: [
      "Unlimited trailers",
      "Full analytics & reports",
      "AI forecasting",
      "Unlimited staff accounts",
      "Event discovery",
      "Time clock & labor tracking",
      "Priority support",
    ],
    limits: { trailers: Infinity, staff: Infinity },
  },
  enterprise: {
    name: "Enterprise",
    price: 199,
    price_id: "price_1T8nugEHIsr46VcJ6ugiRGFR",
    product_id: "prod_U71y5TWZAmWkws",
    features: [
      "Everything in Pro",
      "Multi-org management",
      "Custom integrations & API access",
      "White-label receipts",
      "Dedicated support",
    ],
    limits: { trailers: Infinity, staff: Infinity },
  },
} as const;

export type TierKey = keyof typeof TIERS;

export function getTierByProductId(productId: string): TierKey | null {
  for (const [key, tier] of Object.entries(TIERS)) {
    if (tier.product_id === productId) return key as TierKey;
  }
  return null;
}
