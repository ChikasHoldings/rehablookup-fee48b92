// Lead Quality Metrics - Freshness, validation, completeness scoring
import type { LeadScoringInput, LeadQualityMetrics, ScoreFactor, ScoringWeights, DEFAULT_SCORING_WEIGHTS } from './types';

function calculateFreshnessScore(createdAt: string | undefined, maxPoints: number): ScoreFactor {
  if (!createdAt) {
    return {
      label: 'Freshness',
      points: Math.round(maxPoints * 0.5),
      maxPoints,
      category: 'quality',
      details: 'Creation date unknown',
    };
  }

  const now = new Date();
  const created = new Date(createdAt);
  const hoursOld = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

  let points: number;
  let details: string;

  if (hoursOld < 1) {
    points = maxPoints;
    details = 'Fresh lead (< 1 hour)';
  } else if (hoursOld < 6) {
    points = Math.round(maxPoints * 0.9);
    details = 'Very fresh (< 6 hours)';
  } else if (hoursOld < 24) {
    points = Math.round(maxPoints * 0.75);
    details = 'Fresh (< 24 hours)';
  } else if (hoursOld < 72) {
    points = Math.round(maxPoints * 0.5);
    details = 'Recent (1-3 days)';
  } else if (hoursOld < 168) {
    points = Math.round(maxPoints * 0.3);
    details = 'Aging (3-7 days)';
  } else {
    points = Math.round(maxPoints * 0.15);
    details = 'Stale (> 1 week)';
  }

  return {
    label: 'Freshness',
    points,
    maxPoints,
    category: 'quality',
    details,
  };
}

function calculateValidationScore(
  validationStatus: string | null | undefined,
  qualityFlag: string | null | undefined,
  maxPoints: number
): ScoreFactor {
  let points = Math.round(maxPoints * 0.5); // Default
  const factors: string[] = [];

  // Validation status scoring
  switch (validationStatus) {
    case 'valid':
      points = Math.round(maxPoints * 0.8);
      factors.push('Validated');
      break;
    case 'verified':
      points = maxPoints;
      factors.push('Fully verified');
      break;
    case 'pending':
      points = Math.round(maxPoints * 0.4);
      factors.push('Pending validation');
      break;
    case 'invalid':
      points = 0;
      factors.push('Invalid data');
      break;
    case 'suspicious':
      points = Math.round(maxPoints * 0.2);
      factors.push('Suspicious activity');
      break;
  }

  // Quality flag adjustments
  switch (qualityFlag) {
    case 'high-quality':
      points = Math.min(maxPoints, points + 5);
      factors.push('High quality');
      break;
    case 'duplicate':
      points = Math.max(0, points - 10);
      factors.push('Duplicate detected');
      break;
    case 'spam':
      points = 0;
      factors.push('Flagged as spam');
      break;
    case 'bot':
      points = 0;
      factors.push('Bot activity detected');
      break;
  }

  return {
    label: 'Validation',
    points: Math.max(0, Math.min(maxPoints, points)),
    maxPoints,
    category: 'quality',
    details: factors.length > 0 ? factors.join(', ') : 'Standard validation',
  };
}

function calculateCompletenessScore(lead: LeadScoringInput, maxPoints: number): ScoreFactor {
  const fields = [
    { name: 'insurance', value: lead.insurance_type, weight: 2 },
    { name: 'urgency', value: lead.urgency, weight: 2 },
    { name: 'levelOfCare', value: lead.level_of_care, weight: 2 },
    { name: 'whoSeeking', value: lead.who_seeking_help, weight: 1.5 },
    { name: 'dualDiagnosis', value: lead.dual_diagnosis, weight: 1 },
    { name: 'substances', value: lead.primary_substance?.length ? lead.primary_substance : null, weight: 1.5 },
    { name: 'location', value: lead.location_city_state || lead.location_zip, weight: 1.5 },
    { name: 'message', value: lead.message, weight: 1 },
    { name: 'specialNeeds', value: lead.special_needs?.length ? lead.special_needs : null, weight: 0.5 },
    { name: 'email', value: lead.email_verified, weight: 1 },
  ];

  let totalWeight = 0;
  let earnedWeight = 0;
  const filled: string[] = [];
  const missing: string[] = [];

  for (const field of fields) {
    totalWeight += field.weight;
    if (field.value && field.value !== 'not-sure') {
      earnedWeight += field.weight;
      filled.push(field.name);
    } else {
      missing.push(field.name);
    }
  }

  const completionRatio = earnedWeight / totalWeight;
  const points = Math.round(completionRatio * maxPoints);

  let details: string;
  if (completionRatio >= 0.9) {
    details = 'Excellent - nearly complete profile';
  } else if (completionRatio >= 0.7) {
    details = `Good - ${missing.length} fields incomplete`;
  } else if (completionRatio >= 0.5) {
    details = `Partial - missing ${missing.slice(0, 3).join(', ')}`;
  } else {
    details = 'Minimal information provided';
  }

  return {
    label: 'Completeness',
    points,
    maxPoints,
    category: 'quality',
    details,
  };
}

function calculateEngagementQualityScore(lead: LeadScoringInput, maxPoints: number): ScoreFactor {
  let points = 0;
  const factors: string[] = [];

  // Message quality
  if (lead.message) {
    const msgLength = lead.message.trim().length;
    if (msgLength > 200) {
      points += maxPoints * 0.4;
      factors.push('Detailed message');
    } else if (msgLength > 50) {
      points += maxPoints * 0.25;
      factors.push('Good message');
    } else if (msgLength > 0) {
      points += maxPoints * 0.1;
      factors.push('Brief message');
    }
  }

  // Preferred contact indicates engagement level
  if (lead.preferred_contact === 'call') {
    points += maxPoints * 0.3;
    factors.push('Phone contact preference');
  } else if (lead.preferred_contact === 'text') {
    points += maxPoints * 0.2;
    factors.push('Text preference');
  }

  // Email verification shows commitment
  if (lead.email_verified) {
    points += maxPoints * 0.3;
    factors.push('Email verified');
  }

  return {
    label: 'Engagement Quality',
    points: Math.min(maxPoints, Math.round(points)),
    maxPoints,
    category: 'quality',
    details: factors.length > 0 ? factors.join(', ') : 'Limited engagement signals',
  };
}

function calculateSourceScore(source: string | null | undefined, maxPoints: number): ScoreFactor {
  let points = Math.round(maxPoints * 0.5);
  let details = 'Unknown source';

  switch (source) {
    case 'featured':
      points = maxPoints;
      details = 'From featured listing';
      break;
    case 'search':
      points = Math.round(maxPoints * 0.9);
      details = 'From search results';
      break;
    case 'profile':
      points = Math.round(maxPoints * 0.85);
      details = 'From facility profile';
      break;
    case 'referral':
      points = maxPoints;
      details = 'Professional referral';
      break;
    case 'direct':
      points = Math.round(maxPoints * 0.7);
      details = 'Direct submission';
      break;
    case 'widget':
      points = Math.round(maxPoints * 0.6);
      details = 'From external widget';
      break;
    case 'partner':
      points = Math.round(maxPoints * 0.8);
      details = 'Partner referral';
      break;
    default:
      points = Math.round(maxPoints * 0.5);
  }

  return {
    label: 'Source Quality',
    points,
    maxPoints,
    category: 'quality',
    details,
  };
}

export function calculateQualityMetrics(
  lead: LeadScoringInput,
  weights: typeof DEFAULT_SCORING_WEIGHTS = {
    base: { insurance: 30, urgency: 25, levelOfCare: 15, contactQuality: 15, engagement: 15 },
    quality: { freshness: 25, validation: 20, completeness: 25, engagement: 15, source: 15 },
    match: { location: 35, services: 25, insurance: 25, demographics: 15 },
    categoryWeights: { base: 0.5, quality: 0.25, match: 0.25 },
  }
): LeadQualityMetrics {
  const freshness = calculateFreshnessScore(lead.created_at, weights.quality.freshness);
  const validation = calculateValidationScore(lead.validation_status, lead.quality_flag, weights.quality.validation);
  const completeness = calculateCompletenessScore(lead, weights.quality.completeness);
  const engagement = calculateEngagementQualityScore(lead, weights.quality.engagement);
  const source = calculateSourceScore(lead.source, weights.quality.source);

  const factors = [freshness, validation, completeness, engagement, source];
  const totalPoints = factors.reduce((sum, f) => sum + f.points, 0);
  const maxPoints = factors.reduce((sum, f) => sum + f.maxPoints, 0);

  // Quality multiplier: 0.7 to 1.3 based on quality score
  const qualityRatio = totalPoints / maxPoints;
  const qualityMultiplier = 0.7 + (qualityRatio * 0.6);

  return {
    freshnessScore: freshness.points,
    validationScore: validation.points,
    completenessScore: completeness.points,
    engagementScore: engagement.points,
    sourceScore: source.points,
    qualityMultiplier: Math.round(qualityMultiplier * 100) / 100,
    qualityFactors: factors,
  };
}
