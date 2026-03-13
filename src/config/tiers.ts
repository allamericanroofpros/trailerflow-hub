export const TIERS = {
  pro: {
    name: "Pro",
    price: 79,
    annualPrice: 790, // 10 months
    price_id: "price_1TAEtmCXvW6EawHaqDM6Na37",
    annual_price_id: "price_1TAH44CXvW6EawHamaG7QXUW",
    product_id: "prod_U71yhcJZEwTQZv",
    features: [
      "Unlimited trailers & staff",
      "Full analytics & reports",
      "AI forecasting & discovery",
      "Time clock & labor tracking",
      "Fleet overview",
      "Priority support",
    ],
    limits: { trailers: Infinity, staff: Infinity },
  },
  enterprise: {
    name: "Enterprise",
    price: 199,
    annualPrice: 1990, // 10 months
    price_id: "price_1TAEtmCXvW6EawHaPozbgWQC",
    annual_price_id: "price_1TAH30CXvW6EawHaj30zHdk3",
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

/** Founders tier info (not in TIERS because it's a limited-time offer) */
export const FOUNDERS_TIER = {
  name: "Founders",
  price: 29,
  annualPrice: 290, // 10 months
  product_id: "prod_U8YBZTWW1GV2Vi",
  price_id: "price_1TAH5CCXvW6EawHaUJyQHJIu",
  features: [
    "Everything in Enterprise",
    "Unlimited trailers & staff",
    "AI forecasting & discovery",
    "Multi-org management",
    "Custom integrations & API",
    "White-label receipts",
    "Priority support",
    "Price locked for life",
  ],
} as const;

export function getTierByProductId(productId: string): TierKey | null {
  for (const [key, tier] of Object.entries(TIERS)) {
    if (tier.product_id === productId) return key as TierKey;
  }
  return null;
}
