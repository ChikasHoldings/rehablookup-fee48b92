// Advanced Lead Scoring - Combines base, quality, and facility match scoring
import type { 
  LeadScoringInput, 
  FacilityMatchInput, 
  AdvancedLeadScore, 
  ScoreFactor,
  ScoringWeights,
  DEFAULT_SCORING_WEIGHTS 
} from './types';
import { calculateBaseScore } from './baseScoring';
import { calculateQualityMetrics } from './qualityMetrics';
import { calculateFacilityMatch } from './facilityMatch';

const defaultWeights: typeof DEFAULT_SCORING_WEIGHTS = {
  base: { insurance: 30, urgency: 25, levelOfCare: 15, contactQuality: 15, engagement: 15 },
  quality: { freshness: 25, validation: 20, completeness: 25, engagement: 15, source: 15 },
  match: { location: 35, services: 25, insurance: 25, demographics: 15 },
  categoryWeights: { base: 0.5, quality: 0.25, match: 0.25 },
};

export function calculateAdvancedLeadScore(
  lead: LeadScoringInput,
  facility?: FacilityMatchInput,
  weights: ScoringWeights = defaultWeights
): AdvancedLeadScore {
  // Calculate component scores
  const baseScore = calculateBaseScore(lead, weights);
  const qualityMetrics = calculateQualityMetrics(lead, weights);
  const facilityMatch = facility ? calculateFacilityMatch(lead, facility, weights) : undefined;

  // Normalize scores to 0-100 range
  const normalizedBase = baseScore.total; // Already 0-100
  const normalizedQuality = (qualityMetrics.qualityFactors.reduce((sum, f) => sum + f.points, 0) / 
    qualityMetrics.qualityFactors.reduce((sum, f) => sum + f.maxPoints, 0)) * 100;
  const normalizedMatch = facilityMatch ? facilityMatch.matchPercentage : 75; // Default 75% if no facility

  // Calculate weighted overall score
  let overallScore: number;
  if (facilityMatch) {
    overallScore = (
      normalizedBase * weights.categoryWeights.base +
      normalizedQuality * weights.categoryWeights.quality +
      normalizedMatch * weights.categoryWeights.match
    );
  } else {
    // Without facility match, redistribute weights
    const adjustedBaseWeight = weights.categoryWeights.base + (weights.categoryWeights.match / 2);
    const adjustedQualityWeight = weights.categoryWeights.quality + (weights.categoryWeights.match / 2);
    overallScore = (
      normalizedBase * adjustedBaseWeight +
      normalizedQuality * adjustedQualityWeight
    );
  }

  // Apply quality multiplier for final adjustment
  overallScore = Math.round(overallScore * qualityMetrics.qualityMultiplier);
  overallScore = Math.min(100, Math.max(0, overallScore));

  // Determine grade
  let overallGrade: 'A' | 'B' | 'C' | 'D';
  if (overallScore >= 80) {
    overallGrade = 'A';
  } else if (overallScore >= 60) {
    overallGrade = 'B';
  } else if (overallScore >= 40) {
    overallGrade = 'C';
  } else {
    overallGrade = 'D';
  }

  // Determine priority rank
  let priorityRank: 'hot' | 'warm' | 'cool' | 'cold';
  if (overallScore >= 85 && lead.urgency === 'immediate') {
    priorityRank = 'hot';
  } else if (overallScore >= 70) {
    priorityRank = 'warm';
  } else if (overallScore >= 45) {
    priorityRank = 'cool';
  } else {
    priorityRank = 'cold';
  }

  // Generate recommended action
  const recommendedAction = getRecommendedAction(overallScore, lead, qualityMetrics, facilityMatch);

  // Combine all factors
  const allFactors: ScoreFactor[] = [
    ...baseScore.factors,
    ...qualityMetrics.qualityFactors,
    ...(facilityMatch?.matchFactors || []),
  ];

  return {
    overallScore,
    overallGrade,
    baseScore,
    qualityMetrics,
    facilityMatch,
    priorityRank,
    recommendedAction,
    allFactors,
  };
}

function getRecommendedAction(
  score: number,
  lead: LeadScoringInput,
  quality: ReturnType<typeof calculateQualityMetrics>,
  match?: ReturnType<typeof calculateFacilityMatch>
): string {
  // Hot leads - immediate action
  if (score >= 85 && lead.urgency === 'immediate') {
    return 'Call immediately - high-value urgent lead';
  }

  // High score but not urgent
  if (score >= 80) {
    if (lead.preferred_contact === 'call') {
      return 'Call within 1 hour - high conversion potential';
    }
    return 'Reach out today - strong lead';
  }

  // Good leads with issues
  if (score >= 60) {
    if (quality.validationScore < 10) {
      return 'Verify contact info before outreach';
    }
    if (match && match.matchPercentage < 50) {
      return 'Moderate match - qualify fit before committing';
    }
    return 'Follow up within 24 hours';
  }

  // Medium leads
  if (score >= 40) {
    if (quality.completenessScore < 10) {
      return 'Request more information to qualify';
    }
    return 'Add to nurture sequence - needs development';
  }

  // Low score leads
  if (quality.validationScore === 0) {
    return 'Verify legitimacy before investing time';
  }
  
  return 'Low priority - minimal follow-up recommended';
}

// Quick score calculation for lists/sorting (less detailed)
export function getQuickScore(lead: LeadScoringInput): number {
  const base = calculateBaseScore(lead, defaultWeights);
  const quality = calculateQualityMetrics(lead, defaultWeights);
  
  const normalizedQuality = (quality.qualityFactors.reduce((sum, f) => sum + f.points, 0) / 
    quality.qualityFactors.reduce((sum, f) => sum + f.maxPoints, 0)) * 100;

  const score = (base.total * 0.65 + normalizedQuality * 0.35) * quality.qualityMultiplier;
  return Math.round(Math.min(100, Math.max(0, score)));
}

// Get priority rank without full calculation
export function getLeadPriority(lead: LeadScoringInput): 'hot' | 'warm' | 'cool' | 'cold' {
  const score = getQuickScore(lead);
  
  if (score >= 85 && lead.urgency === 'immediate') return 'hot';
  if (score >= 70) return 'warm';
  if (score >= 45) return 'cool';
  return 'cold';
}
