// Gamified Badge System - Types & Unlock Logic

export type BadgeTier = "locked" | "bronze" | "silver" | "gold" | "platinum";
export type BadgeStyle = "seal" | "metallic" | "gradient" | "flat";

export interface BadgeUnlockCriteria {
  minRating?: number;
  minReviews?: number;
  minYearsVerified?: number;
  requiresPro?: boolean;
  requiresFeatured?: boolean;
  minProfileCompletion?: number;
  minInquiries?: number;
}

export interface BadgeTierConfig {
  tier: BadgeTier;
  label: string;
  criteria: BadgeUnlockCriteria;
  description: string;
}

export interface BadgeType {
  id: string;
  name: string;
  description: string;
  category: "achievement" | "status" | "performance" | "premium";
  icon: string;
  tiers: BadgeTierConfig[];
  availableStyles: BadgeStyle[];
}

// Badge Types Configuration with Progressive Unlocks
export const BADGE_TYPES: BadgeType[] = [
  {
    id: "verified",
    name: "Verified Provider",
    description: "Officially verified on RehabLookup",
    category: "status",
    icon: "shield-check",
    availableStyles: ["seal", "metallic", "gradient", "flat"],
    tiers: [
      {
        tier: "gold",
        label: "Verified",
        criteria: {},
        description: "Your facility is verified on RehabLookup",
      },
    ],
  },
  {
    id: "highly-rated",
    name: "Highly Rated",
    description: "Recognition for exceptional ratings",
    category: "performance",
    icon: "star",
    availableStyles: ["seal", "metallic", "gradient", "flat"],
    tiers: [
      {
        tier: "bronze",
        label: "Well Rated",
        criteria: { minRating: 3.5, minReviews: 3 },
        description: "Maintain 3.5+ star rating with 3+ reviews",
      },
      {
        tier: "silver",
        label: "Highly Rated",
        criteria: { minRating: 4.0, minReviews: 5 },
        description: "Maintain 4.0+ star rating with 5+ reviews",
      },
      {
        tier: "gold",
        label: "Top Rated",
        criteria: { minRating: 4.5, minReviews: 10 },
        description: "Maintain 4.5+ star rating with 10+ reviews",
      },
      {
        tier: "platinum",
        label: "Exceptional",
        criteria: { minRating: 4.8, minReviews: 25 },
        description: "Maintain 4.8+ star rating with 25+ reviews",
      },
    ],
  },
  {
    id: "top-reviewed",
    name: "Top Reviewed",
    description: "Recognition for review volume",
    category: "achievement",
    icon: "message-square",
    availableStyles: ["seal", "metallic", "gradient", "flat"],
    tiers: [
      {
        tier: "bronze",
        label: "Getting Noticed",
        criteria: { minReviews: 5 },
        description: "Receive 5+ approved reviews",
      },
      {
        tier: "silver",
        label: "Popular Choice",
        criteria: { minReviews: 15 },
        description: "Receive 15+ approved reviews",
      },
      {
        tier: "gold",
        label: "Community Favorite",
        criteria: { minReviews: 30 },
        description: "Receive 30+ approved reviews",
      },
      {
        tier: "platinum",
        label: "Most Reviewed",
        criteria: { minReviews: 50 },
        description: "Receive 50+ approved reviews",
      },
    ],
  },
  {
    id: "best-rehab-2026",
    name: "Best Rehab 2026",
    description: "Annual excellence award for top performers",
    category: "premium",
    icon: "award",
    availableStyles: ["seal", "metallic"],
    tiers: [
      {
        tier: "gold",
        label: "Best Rehab 2026",
        criteria: { minRating: 4.5, minReviews: 20, requiresPro: true },
        description: "Pro member with 4.5+ rating and 20+ reviews",
      },
    ],
  },
  {
    id: "excellence-award",
    name: "Excellence Award",
    description: "Premium recognition for outstanding facilities",
    category: "premium",
    icon: "trophy",
    availableStyles: ["seal", "metallic", "gradient"],
    tiers: [
      {
        tier: "silver",
        label: "Quality Care",
        criteria: { minRating: 4.0, minReviews: 10, minProfileCompletion: 80 },
        description: "4.0+ rating, 10+ reviews, 80%+ profile completion",
      },
      {
        tier: "gold",
        label: "Excellence Award",
        criteria: { minRating: 4.3, minReviews: 15, requiresPro: true, minProfileCompletion: 90 },
        description: "Pro member with excellent metrics and complete profile",
      },
      {
        tier: "platinum",
        label: "Platinum Excellence",
        criteria: { minRating: 4.7, minReviews: 25, requiresPro: true, minProfileCompletion: 95 },
        description: "Top-tier Pro member with exceptional performance",
      },
    ],
  },
  {
    id: "premium-partner",
    name: "Premium Partner",
    description: "Exclusive badge for Pro subscribers",
    category: "premium",
    icon: "gem",
    availableStyles: ["metallic", "gradient"],
    tiers: [
      {
        tier: "gold",
        label: "Pro Member",
        criteria: { requiresPro: true },
        description: "Active Pro subscription",
      },
    ],
  },
  {
    id: "trusted-choice",
    name: "Trusted Choice",
    description: "Long-standing verified facility with proven track record",
    category: "status",
    icon: "heart-handshake",
    availableStyles: ["seal", "metallic", "flat"],
    tiers: [
      {
        tier: "bronze",
        label: "Trusted",
        criteria: { minYearsVerified: 1, minRating: 3.5 },
        description: "1+ year verified with 3.5+ rating",
      },
      {
        tier: "silver",
        label: "Trusted Choice",
        criteria: { minYearsVerified: 2, minRating: 4.0 },
        description: "2+ years verified with 4.0+ rating",
      },
      {
        tier: "gold",
        label: "Community Trusted",
        criteria: { minYearsVerified: 3, minRating: 4.3, minReviews: 15 },
        description: "3+ years verified with strong reviews",
      },
    ],
  },
  {
    id: "rising-star",
    name: "Rising Star",
    description: "New facility making waves with early performance",
    category: "achievement",
    icon: "trending-up",
    availableStyles: ["gradient", "flat"],
    tiers: [
      {
        tier: "gold",
        label: "Rising Star",
        criteria: { minRating: 4.5, minReviews: 5 },
        description: "New facility with 4.5+ rating and 5+ reviews within first year",
      },
    ],
  },
];

// Badge style configurations
export const BADGE_STYLES: Record<BadgeStyle, { name: string; description: string }> = {
  seal: { name: "Classic Seal", description: "Traditional award seal with ribbon" },
  metallic: { name: "Premium Metallic", description: "Gold/silver foil effect" },
  gradient: { name: "Modern Shield", description: "Sleek gradient with glass effect" },
  flat: { name: "Minimalist", description: "Clean, simple design" },
};

// Tier colors for progressive unlocks
export const TIER_COLORS: Record<BadgeTier, { primary: string; secondary: string; glow: string }> = {
  locked: { primary: "#6b7280", secondary: "#9ca3af", glow: "#374151" },
  bronze: { primary: "#cd7f32", secondary: "#daa06d", glow: "#b87333" },
  silver: { primary: "#c0c0c0", secondary: "#e8e8e8", glow: "#a8a8a8" },
  gold: { primary: "#ffd700", secondary: "#ffec8b", glow: "#daa520" },
  platinum: { primary: "#e5e4e2", secondary: "#ffffff", glow: "#b8b8b8" },
};

// Helper to determine current tier based on facility metrics
export interface FacilityMetrics {
  avgRating: number;
  reviewCount: number;
  yearsVerified: number;
  isPro: boolean;
  isFeatured: boolean;
  profileCompletion: number;
  totalInquiries: number;
}

export function getUnlockedTier(
  badgeType: BadgeType,
  metrics: FacilityMetrics
): { tier: BadgeTier; config: BadgeTierConfig | null; nextTier: BadgeTierConfig | null; progress: number } {
  let unlockedTier: BadgeTier = "locked";
  let unlockedConfig: BadgeTierConfig | null = null;
  let nextTierConfig: BadgeTierConfig | null = null;
  let progress = 0;

  // Check tiers from highest to lowest to find the best unlocked tier
  const sortedTiers = [...badgeType.tiers].reverse();

  for (let i = 0; i < sortedTiers.length; i++) {
    const tierConfig = sortedTiers[i];
    const criteria = tierConfig.criteria;
    
    const meetsRating = !criteria.minRating || metrics.avgRating >= criteria.minRating;
    const meetsReviews = !criteria.minReviews || metrics.reviewCount >= criteria.minReviews;
    const meetsYears = !criteria.minYearsVerified || metrics.yearsVerified >= criteria.minYearsVerified;
    const meetsPro = !criteria.requiresPro || metrics.isPro;
    const meetsFeatured = !criteria.requiresFeatured || metrics.isFeatured;
    const meetsProfile = !criteria.minProfileCompletion || metrics.profileCompletion >= criteria.minProfileCompletion;
    const meetsInquiries = !criteria.minInquiries || metrics.totalInquiries >= criteria.minInquiries;

    if (meetsRating && meetsReviews && meetsYears && meetsPro && meetsFeatured && meetsProfile && meetsInquiries) {
      unlockedTier = tierConfig.tier;
      unlockedConfig = tierConfig;
      nextTierConfig = i > 0 ? sortedTiers[i - 1] : null;
      break;
    }
  }

  // Calculate progress to next tier
  if (nextTierConfig && unlockedConfig) {
    progress = calculateProgress(metrics, unlockedConfig.criteria, nextTierConfig.criteria);
  } else if (unlockedTier === "locked" && badgeType.tiers.length > 0) {
    nextTierConfig = badgeType.tiers[0];
    progress = calculateProgressToFirst(metrics, badgeType.tiers[0].criteria);
  }

  return { tier: unlockedTier, config: unlockedConfig, nextTier: nextTierConfig, progress };
}

function calculateProgress(
  metrics: FacilityMetrics,
  currentCriteria: BadgeUnlockCriteria,
  nextCriteria: BadgeUnlockCriteria
): number {
  const progressFactors: number[] = [];

  if (nextCriteria.minRating && currentCriteria.minRating) {
    const range = nextCriteria.minRating - currentCriteria.minRating;
    const current = metrics.avgRating - currentCriteria.minRating;
    progressFactors.push(Math.min(1, current / range));
  }

  if (nextCriteria.minReviews && currentCriteria.minReviews) {
    const range = nextCriteria.minReviews - currentCriteria.minReviews;
    const current = metrics.reviewCount - currentCriteria.minReviews;
    progressFactors.push(Math.min(1, current / range));
  }

  if (progressFactors.length === 0) return 0;
  return progressFactors.reduce((a, b) => a + b, 0) / progressFactors.length;
}

function calculateProgressToFirst(metrics: FacilityMetrics, criteria: BadgeUnlockCriteria): number {
  const progressFactors: number[] = [];

  if (criteria.minRating) {
    progressFactors.push(Math.min(1, metrics.avgRating / criteria.minRating));
  }
  if (criteria.minReviews) {
    progressFactors.push(Math.min(1, metrics.reviewCount / criteria.minReviews));
  }
  if (criteria.minProfileCompletion) {
    progressFactors.push(Math.min(1, metrics.profileCompletion / criteria.minProfileCompletion));
  }

  if (progressFactors.length === 0) return 0;
  return progressFactors.reduce((a, b) => a + b, 0) / progressFactors.length;
}

// Get all available badges for a facility
export function getAvailableBadges(metrics: FacilityMetrics): Array<{
  badge: BadgeType;
  tier: BadgeTier;
  config: BadgeTierConfig | null;
  nextTier: BadgeTierConfig | null;
  progress: number;
}> {
  return BADGE_TYPES.map((badge) => {
    const unlock = getUnlockedTier(badge, metrics);
    return {
      badge,
      ...unlock,
    };
  });
}
