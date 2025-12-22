// Base Lead Scoring - Core intake data scoring
import type { LeadScoringInput, ScoreFactor, LeadScore, ScoringWeights, DEFAULT_SCORING_WEIGHTS } from './types';

function scoreInsurance(insuranceType: string | null, maxPoints: number): ScoreFactor {
  let points = 0;
  let details = 'No insurance info provided';
  
  switch (insuranceType) {
    case 'ppo':
      points = maxPoints;
      details = 'PPO/Private Insurance - highest reimbursement';
      break;
    case 'self-pay':
      points = Math.round(maxPoints * 0.93);
      details = 'Self-Pay - high intent, immediate payment';
      break;
    case 'hmo':
      points = Math.round(maxPoints * 0.83);
      details = 'HMO Insurance - good coverage with network';
      break;
    case 'medicaid':
    case 'medicare':
      points = Math.round(maxPoints * 0.67);
      details = 'Government insurance - lower reimbursement';
      break;
    case 'not-sure':
      points = Math.round(maxPoints * 0.33);
      details = 'Insurance type unknown - needs verification';
      break;
    default:
      points = Math.round(maxPoints * 0.17);
  }

  return {
    label: 'Insurance Type',
    points,
    maxPoints,
    category: 'base',
    details,
  };
}

function scoreUrgency(urgency: string | null, maxPoints: number): ScoreFactor {
  let points = 0;
  let details = 'No urgency specified';
  
  switch (urgency) {
    case 'immediate':
      points = maxPoints;
      details = 'Immediate need - highest priority';
      break;
    case 'within-week':
      points = Math.round(maxPoints * 0.72);
      details = 'Seeking help within a week';
      break;
    case 'flexible':
      points = Math.round(maxPoints * 0.4);
      details = 'Flexible timeline - lower urgency';
      break;
    default:
      points = Math.round(maxPoints * 0.2);
  }

  return {
    label: 'Urgency',
    points,
    maxPoints,
    category: 'base',
    details,
  };
}

function scoreLevelOfCare(levelOfCare: string | null, maxPoints: number): ScoreFactor {
  let points = 0;
  let details = 'Level of care not specified';
  
  switch (levelOfCare) {
    case 'residential':
    case 'inpatient':
      points = maxPoints;
      details = 'Residential/Inpatient - highest care level';
      break;
    case 'detox':
      points = maxPoints;
      details = 'Detox - immediate medical need';
      break;
    case 'php':
    case 'partial-hospitalization':
      points = Math.round(maxPoints * 0.8);
      details = 'Partial Hospitalization Program';
      break;
    case 'iop':
    case 'intensive-outpatient':
      points = Math.round(maxPoints * 0.67);
      details = 'Intensive Outpatient Program';
      break;
    case 'outpatient':
      points = Math.round(maxPoints * 0.53);
      details = 'Standard Outpatient';
      break;
    case 'not-sure':
      points = Math.round(maxPoints * 0.33);
      details = 'Needs assessment for level of care';
      break;
    default:
      points = Math.round(maxPoints * 0.2);
  }

  return {
    label: 'Level of Care',
    points,
    maxPoints,
    category: 'base',
    details,
  };
}

function scoreContactQuality(
  emailVerified: boolean | null,
  preferredContact: string,
  message: string | null,
  maxPoints: number
): ScoreFactor {
  let points = 3; // Base points for having contact info
  const factors: string[] = [];

  if (emailVerified) {
    points += 5;
    factors.push('Verified email');
  }

  if (preferredContact === 'call') {
    points += 3;
    factors.push('Prefers call');
  }

  if (message && message.trim().length > 50) {
    points += 4;
    factors.push('Detailed message');
  } else if (message && message.trim().length > 20) {
    points += 2;
    factors.push('Has message');
  }

  points = Math.min(points, maxPoints);

  return {
    label: 'Contact Quality',
    points,
    maxPoints,
    category: 'base',
    details: factors.length > 0 ? factors.join(', ') : 'Basic contact info only',
  };
}

function scoreEngagement(
  whoSeekingHelp: string | null,
  dualDiagnosis: string | null,
  primarySubstance: string[] | null,
  maxPoints: number
): ScoreFactor {
  let points = 0;
  const factors: string[] = [];

  if (whoSeekingHelp === 'self') {
    points += 6;
    factors.push('Self-referral');
  } else if (whoSeekingHelp === 'loved-one') {
    points += 4;
    factors.push('Family referral');
  }

  if (dualDiagnosis && dualDiagnosis !== 'not-sure') {
    points += 4;
    factors.push('Dual diagnosis disclosed');
  } else if (dualDiagnosis === 'not-sure') {
    points += 2;
    factors.push('Mental health uncertain');
  }

  if (primarySubstance && primarySubstance.length > 0) {
    points += 5;
    factors.push('Substance details provided');
  }

  points = Math.min(points, maxPoints);

  return {
    label: 'Engagement',
    points,
    maxPoints,
    category: 'base',
    details: factors.length > 0 ? factors.join(', ') : 'Limited engagement data',
  };
}

export function calculateBaseScore(
  lead: LeadScoringInput,
  weights: typeof DEFAULT_SCORING_WEIGHTS = {
    base: { insurance: 30, urgency: 25, levelOfCare: 15, contactQuality: 15, engagement: 15 },
    quality: { freshness: 25, validation: 20, completeness: 25, engagement: 15, source: 15 },
    match: { location: 35, services: 25, insurance: 25, demographics: 15 },
    categoryWeights: { base: 0.5, quality: 0.25, match: 0.25 },
  }
): LeadScore {
  const insurance = scoreInsurance(lead.insurance_type, weights.base.insurance);
  const urgency = scoreUrgency(lead.urgency, weights.base.urgency);
  const levelOfCare = scoreLevelOfCare(lead.level_of_care, weights.base.levelOfCare);
  const contactQuality = scoreContactQuality(
    lead.email_verified,
    lead.preferred_contact,
    lead.message,
    weights.base.contactQuality
  );
  const engagement = scoreEngagement(
    lead.who_seeking_help,
    lead.dual_diagnosis,
    lead.primary_substance,
    weights.base.engagement
  );

  const factors = [insurance, urgency, levelOfCare, contactQuality, engagement];
  const total = factors.reduce((sum, f) => sum + f.points, 0);
  const maxTotal = factors.reduce((sum, f) => sum + f.maxPoints, 0);

  let grade: 'A' | 'B' | 'C' | 'D';
  if (total >= 75) {
    grade = 'A';
  } else if (total >= 55) {
    grade = 'B';
  } else if (total >= 35) {
    grade = 'C';
  } else {
    grade = 'D';
  }

  return {
    total,
    grade,
    factors,
    baseScore: total,
    qualityMultiplier: 1,
    matchBonus: 0,
  };
}

// Backwards-compatible export
export { calculateBaseScore as calculateLeadScore };
