/**
 * Computes the public-facing Rehab Score for a treatment center.
 *
 * Mirrors the weighted methodology disclosed at /rehab-score:
 *   - Verification & Licensing       30%
 *   - Clinical Quality Signals       25%
 *   - Verified Outcomes & Reviews    20%
 *   - Profile Completeness           10%
 *   - (Proximity is contextual, computed at search time — not on profiles.)
 *
 * On profile pages, proximity is not a per-facility property, so we
 * redistribute its 15% weight across the four intrinsic factors
 * proportionally. The displayed total is normalised to a 0–100 scale.
 *
 * Inputs are intentionally tolerant: missing fields score 0 for that
 * sub-factor rather than throwing, so partially-onboarded facilities
 * still render a meaningful score.
 */

export interface RehabScoreInput {
  verified: boolean | null | undefined;
  yearEstablished: number | null | undefined;
  description: string | null | undefined;
  galleryUrls: string[] | null | undefined;
  facilityServices: { service_name: string }[] | null | undefined;
  facilityInsurance: { insurance_name: string }[] | null | undefined;
  facilityAgeGroups: { age_group: string }[] | null | undefined;
  facilityAccreditations:
    | { accreditation_type: string; verified: boolean }[]
    | null
    | undefined;
  facilityCredentials:
    | { accreditations: string | null; licensing_info: string | null }[]
    | null
    | undefined;
  googleRating: number | null | undefined;
  googleReviewCount: number | null | undefined;
}

export interface RehabScoreFactor {
  /** Stable id used for per-factor display ordering. */
  key: "verification" | "clinical" | "outcomes" | "completeness";
  /** Public methodology weight as shown on /rehab-score (0-100, sums to 85; proximity 15% is excluded on profiles). */
  weight: number;
  /** Display label. */
  label: string;
  /** Score earned for this factor, 0-100. */
  score: number;
  /**
   * One-line evidence summary explaining what was counted.
   * Always honest — empty inputs produce "Not yet provided".
   */
  evidence: string;
}

export interface RehabScoreResult {
  /** Total score 0-100, rounded to integer. */
  total: number;
  /** Per-factor breakdown for display. */
  factors: RehabScoreFactor[];
  /**
   * Rough qualitative tier for color coding & accessibility.
   * Thresholds aligned with internal review benchmarks.
   */
  tier: "excellent" | "strong" | "fair" | "developing";
}

// Profile-page weights (proximity 15% removed; remaining 85% redistributed proportionally → /100).
// Original: verification 30, clinical 25, outcomes 20, completeness 10  → sum 85
// Renormalised: 30/85, 25/85, 20/85, 10/85
const WEIGHTS = {
  verification: 30 / 85,
  clinical: 25 / 85,
  outcomes: 20 / 85,
  completeness: 10 / 85,
} as const;

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function scoreVerification(input: RehabScoreInput): { score: number; evidence: string } {
  let earned = 0;
  const reasons: string[] = [];

  // Platform-verified flag (40 pts of 100)
  if (input.verified) {
    earned += 40;
    reasons.push("RehabLookup-verified");
  }

  // Verified accreditations (Joint Commission, CARF, LegitScript, SAMHSA, etc.)
  // Each verified accreditation worth 15 pts, capped at 45 (3 accreditations).
  const verifiedAccs = (input.facilityAccreditations ?? []).filter((a) => a?.verified);
  if (verifiedAccs.length > 0) {
    earned += Math.min(45, verifiedAccs.length * 15);
    reasons.push(
      `${verifiedAccs.length} verified accreditation${verifiedAccs.length === 1 ? "" : "s"}`,
    );
  }

  // Licensing/credential text on file (15 pts)
  const hasLicensingText = (input.facilityCredentials ?? []).some(
    (c) => (c?.licensing_info?.trim().length ?? 0) > 0,
  );
  if (hasLicensingText) {
    earned += 15;
    reasons.push("licensing on file");
  }

  return {
    score: Math.min(100, earned),
    evidence: reasons.length > 0 ? reasons.join(" • ") : "Not yet provided",
  };
}

function scoreClinical(input: RehabScoreInput): { score: number; evidence: string } {
  let earned = 0;
  const reasons: string[] = [];

  // Number of services / levels of care offered.
  // 1 service = 25, 2-3 = 50, 4-6 = 75, 7+ = 100.
  const serviceCount = (input.facilityServices ?? []).length;
  if (serviceCount >= 7) earned = 100;
  else if (serviceCount >= 4) earned = 75;
  else if (serviceCount >= 2) earned = 50;
  else if (serviceCount === 1) earned = 25;

  if (serviceCount > 0) {
    reasons.push(
      `${serviceCount} treatment service${serviceCount === 1 ? "" : "s"} offered`,
    );
  }

  // Bonus: serves multiple age groups (up to +10, cap at 100)
  const ageGroups = (input.facilityAgeGroups ?? []).length;
  if (ageGroups > 1) {
    earned = Math.min(100, earned + 10);
    reasons.push(`${ageGroups} age groups served`);
  }

  return {
    score: earned,
    evidence: reasons.length > 0 ? reasons.join(" • ") : "Not yet provided",
  };
}

function scoreOutcomes(input: RehabScoreInput): { score: number; evidence: string } {
  const rating = input.googleRating ?? 0;
  const count = input.googleReviewCount ?? 0;

  if (count === 0) {
    return { score: 0, evidence: "No verified reviews yet" };
  }

  // Base from rating (0-5 → 0-80)
  const ratingComponent = clamp01(rating / 5) * 80;
  // Volume confidence (cap at 50 reviews → +20)
  const volumeComponent = clamp01(count / 50) * 20;
  const score = Math.round(ratingComponent + volumeComponent);

  return {
    score: Math.min(100, score),
    evidence: `${rating.toFixed(1)}★ from ${count} verified review${count === 1 ? "" : "s"}`,
  };
}

function scoreCompleteness(input: RehabScoreInput): { score: number; evidence: string } {
  const checks: { label: string; pass: boolean; pts: number }[] = [
    { label: "description", pass: (input.description?.trim().length ?? 0) >= 100, pts: 20 },
    { label: "photos", pass: (input.galleryUrls?.length ?? 0) >= 1, pts: 15 },
    { label: "year established", pass: !!input.yearEstablished, pts: 10 },
    { label: "insurance", pass: (input.facilityInsurance ?? []).length > 0, pts: 25 },
    { label: "services", pass: (input.facilityServices ?? []).length > 0, pts: 20 },
    { label: "age groups", pass: (input.facilityAgeGroups ?? []).length > 0, pts: 10 },
  ];
  const earned = checks.filter((c) => c.pass).reduce((sum, c) => sum + c.pts, 0);
  const passedLabels = checks.filter((c) => c.pass).map((c) => c.label);
  const passedCount = passedLabels.length;
  const totalCount = checks.length;

  return {
    score: Math.min(100, earned),
    evidence:
      passedCount === 0
        ? "Profile incomplete"
        : `${passedCount}/${totalCount} profile sections complete`,
  };
}

export function computeRehabScore(input: RehabScoreInput): RehabScoreResult {
  const verification = scoreVerification(input);
  const clinical = scoreClinical(input);
  const outcomes = scoreOutcomes(input);
  const completeness = scoreCompleteness(input);

  const total = Math.round(
    verification.score * WEIGHTS.verification +
      clinical.score * WEIGHTS.clinical +
      outcomes.score * WEIGHTS.outcomes +
      completeness.score * WEIGHTS.completeness,
  );

  const tier: RehabScoreResult["tier"] =
    total >= 85 ? "excellent" : total >= 70 ? "strong" : total >= 50 ? "fair" : "developing";

  const factors: RehabScoreFactor[] = [
    {
      key: "verification",
      weight: 30,
      label: "Verification & Licensing",
      score: verification.score,
      evidence: verification.evidence,
    },
    {
      key: "clinical",
      weight: 25,
      label: "Clinical Quality Signals",
      score: clinical.score,
      evidence: clinical.evidence,
    },
    {
      key: "outcomes",
      weight: 20,
      label: "Verified Outcomes & Reviews",
      score: outcomes.score,
      evidence: outcomes.evidence,
    },
    {
      key: "completeness",
      weight: 10,
      label: "Profile Completeness",
      score: completeness.score,
      evidence: completeness.evidence,
    },
  ];

  return { total, factors, tier };
}
