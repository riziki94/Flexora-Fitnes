import { createServerFn } from "@tanstack/react-start";
import { getServerClient } from "./supabase";

export interface BillingOption {
  label: string;
  priceNok: number;
  priceLabel: string;
  paymentLink: string;
  consultantLabel: string;
}

export interface TierDefinition {
  name: string;
  description: string;
  features: string[];
  color: string;
  icon: string;
  billingOptions: {
    oneTime?: BillingOption;
    monthly: BillingOption;
    annual?: BillingOption;
  };
}

export const SUBSCRIPTION_TIERS: Record<string, TierDefinition> = {
  kitoslight: {
    name: "Kitoslight",
    description: "Real-time environmental data from connected devices. Map visualization, energy tracking, and air quality monitoring.",
    features: [
      "Map-based visualization",
      "CO₂ & gas monitoring",
      "Energy production data",
      "Device IP integration",
    ],
    color: "blue",
    icon: "",
    billingOptions: {
      oneTime: {
        label: "Engangsbetaling",
        priceNok: 4449,
        priceLabel: "4 449 kr",
        paymentLink: "https://buy.stripe.com/00w8wP3gk34sez6dQS1Fe0a",
        consultantLabel: "Konsulent kobles på etter bestilling",
      },
      monthly: {
        label: "Månedlig",
        priceNok: 1499,
        priceLabel: "1 499 kr/md",
        paymentLink: "https://buy.stripe.com/cNiaEX4ko34sdv2fZ01Fe0b",
        consultantLabel: "Konsulent følger deg hele veien",
      },
      annual: {
        label: "Årlig (spar 15%)",
        priceNok: 15290,
        priceLabel: "15 290 kr/år",
        paymentLink: "https://buy.stripe.com/eVq7sL9EIfRe0IgdQS1Fe0c",
        consultantLabel: "Konsulent følger deg hele veien",
      },
    },
  },
  zongosol: {
    name: "Zongosol",
    description: "Full access to the container home design tool. Customize interiors, exteriors, and order your design.",
    features: [
      "3D design tool",
      "Custom room layouts",
      "Material selection",
      "Solar panel planning",
    ],
    color: "emerald",
    icon: "",
    billingOptions: {
      oneTime: {
        label: "Engangsbetaling",
        priceNok: 7449,
        priceLabel: "7 449 kr",
        paymentLink: "https://buy.stripe.com/fZucN5eZ2cF23Us5km1Fe0d",
        consultantLabel: "Konsulent kobles på etter bestilling",
      },
      monthly: {
        label: "Månedlig",
        priceNok: 2499,
        priceLabel: "2 499 kr/md",
        paymentLink: "https://buy.stripe.com/5kQcN57wA0WkfDaeUW1Fe0e",
        consultantLabel: "Konsulent følger deg hele veien",
      },
      annual: {
        label: "Årlig (spar 15%)",
        priceNok: 25490,
        priceLabel: "25 490 kr/år",
        paymentLink: "https://buy.stripe.com/9B6dR94ko8oM2Qo5km1Fe0f",
        consultantLabel: "Konsulent følger deg hele veien",
      },
    },
  },
  dashboard: {
    name: "Dashboard",
    description: "Admin dashboard with full IP device integration. Real-time data, ESG report generation, and team access.",
    features: [
      "Admin control panel",
      "ESG report generation",
      "All devices in one view",
      "Team management",
    ],
    color: "purple",
    icon: "",
    billingOptions: {
      monthly: {
        label: "Månedlig",
        priceNok: 4999,
        priceLabel: "4 999 kr/md",
        paymentLink: "https://buy.stripe.com/fZu8wPeZ25cA1Mk9AC1Fe0g",
        consultantLabel: "Konsulent følger deg hele veien",
      },
    },
  },
} as const;

export type TierKey = keyof typeof SUBSCRIPTION_TIERS;

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  address: string | null;
  country: string | null;
  phone: string | null;
  subscription_tier: string;
  created_at?: string;
}

/**
 * Upgrade a user's subscription tier using admin API.
 */
export const upgradeSubscription = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { userId: string; tier: TierKey })
  .handler(async ({ data }) => {
    const client = getServerClient();
    const { error } = await client.auth.admin.updateUserById(data.userId, {
      user_metadata: { subscription_tier: data.tier },
    });
    return { ok: !error, error: error?.message };
  });

/**
 * Fetch a user's profile from auth metadata.
 */
export const getProfile = createServerFn({ method: "GET" })
  .validator((d: unknown) => d as { userId: string })
  .handler(async ({ data }) => {
    const client = getServerClient();
    const { data: result, error } = await client.auth.admin.getUserById(data.userId);
    if (error || !result.user) return null;
    const u = result.user;
    const meta = (u.user_metadata || {}) as Record<string, unknown>;
    return {
      id: u.id,
      email: u.email,
      full_name: (meta.full_name as string) || null,
      company: (meta.company as string) || null,
      address: (meta.address as string) || null,
      country: (meta.country as string) || null,
      phone: (meta.phone as string) || null,
      subscription_tier: (meta.subscription_tier as string) || "kitoslight",
      created_at: u.created_at,
    } as Profile;
  });

/**
 * Save customer profile fields to auth user_metadata.
 */
export const saveProfile = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as {
    userId: string;
    full_name: string;
    company?: string;
    address: string;
    country: string;
    phone: string;
  })
  .handler(async ({ data }) => {
    const client = getServerClient();
    const { error } = await client.auth.admin.updateUserById(data.userId, {
      user_metadata: {
        full_name: data.full_name,
        company: data.company || null,
        address: data.address,
        country: data.country,
        phone: data.phone,
      },
    });
    return { ok: !error, error: error?.message };
  });
