// Lead scoring system based on insurance, urgency, and intake data
// Scores range from 0-100, with higher scores indicating higher priority leads

export interface LeadScoringInput {
  insurance_type: string | null;
  urgency: string | null;
  email_verified: boolean | null;
  level_of_care: string | null;
  dual_diagnosis: string | null;
  primary_substance: string[] | null;
  who_seeking_help: string | null;
  preferred_contact: string;
  message: string | null;
}

export interface LeadScore {
  total: number;
  grade: 'A' | 'B' | 'C' | 'D';
  factors: {
    label: string;
    points: number;
    maxPoints: number;
  }[];
}

// Insurance type scoring (max 30 points)
function scoreInsurance(insuranceType: string | null): { points: number; label: string } {
  switch (insuranceType) {
    case 'ppo':
      return { points: 30, label: 'PPO/Private Insurance' };
    case 'hmo':
      return { points: 25, label: 'HMO Insurance' };
    case 'self-pay':
      return { points: 28, label: 'Self-Pay' };
    case 'medicaid':
    case 'medicare':
      return { points: 20, label: 'Medicaid/Medicare' };
    case 'not-sure':
      return { points: 10, label: 'Insurance Unknown' };
    default:
      return { points: 5, label: 'No Insurance Info' };
  }
}

// Urgency scoring (max 25 points)
function scoreUrgency(urgency: string | null): { points: number; label: string } {
  switch (urgency) {
    case 'immediate':
      return { points: 25, label: 'Immediate Need' };
    case 'within-week':
      return { points: 18, label: 'Within a Week' };
    case 'flexible':
      return { points: 10, label: 'Flexible Timeline' };
    default:
      return { points: 5, label: 'No Urgency Info' };
  }
}

// Level of care scoring (max 15 points)
function scoreLevelOfCare(levelOfCare: string | null): { points: number; label: string } {
  switch (levelOfCare) {
    case 'residential':
    case 'inpatient':
      return { points: 15, label: 'Residential/Inpatient' };
    case 'php':
    case 'partial-hospitalization':
      return { points: 12, label: 'Partial Hospitalization' };
    case 'iop':
    case 'intensive-outpatient':
      return { points: 10, label: 'Intensive Outpatient' };
    case 'outpatient':
      return { points: 8, label: 'Outpatient' };
    case 'detox':
      return { points: 15, label: 'Detox' };
    case 'not-sure':
      return { points: 5, label: 'Level Unknown' };
    default:
      return { points: 3, label: 'No Level Info' };
  }
}

// Contact quality scoring (max 15 points)
function scoreContactQuality(
  emailVerified: boolean | null,
  preferredContact: string,
  message: string | null
): { points: number; label: string } {
  let points = 0;
  const factors: string[] = [];

  // Email verified (+5)
  if (emailVerified) {
    points += 5;
    factors.push('Verified Email');
  }

  // Prefers call (+3) - often indicates higher intent
  if (preferredContact === 'call') {
    points += 3;
    factors.push('Prefers Call');
  }

  // Has a message (+4)
  if (message && message.trim().length > 20) {
    points += 4;
    factors.push('Detailed Message');
  } else if (message && message.trim().length > 0) {
    points += 2;
    factors.push('Has Message');
  }

  // Base points if any contact info
  points += 3;

  return { 
    points: Math.min(points, 15), 
    label: factors.length > 0 ? factors.join(', ') : 'Basic Contact' 
  };
}

// Engagement indicators (max 15 points)
function scoreEngagement(
  whoSeekingHelp: string | null,
  dualDiagnosis: string | null,
  primarySubstance: string[] | null
): { points: number; label: string } {
  let points = 0;
  const factors: string[] = [];

  // Who is seeking help
  if (whoSeekingHelp === 'self') {
    points += 6;
    factors.push('Self-Referral');
  } else if (whoSeekingHelp === 'loved-one') {
    points += 4;
    factors.push('Family Referral');
  }

  // Dual diagnosis provided
  if (dualDiagnosis && dualDiagnosis !== 'not-sure') {
    points += 4;
    factors.push('Dual Diagnosis Info');
  } else if (dualDiagnosis === 'not-sure') {
    points += 2;
    factors.push('MH Unknown');
  }

  // Primary substance provided
  if (primarySubstance && primarySubstance.length > 0) {
    points += 5;
    factors.push('Substance Details');
  }

  return { 
    points: Math.min(points, 15), 
    label: factors.length > 0 ? factors.join(', ') : 'Limited Engagement Info' 
  };
}

export function calculateLeadScore(lead: LeadScoringInput): LeadScore {
  const insurance = scoreInsurance(lead.insurance_type);
  const urgency = scoreUrgency(lead.urgency);
  const levelOfCare = scoreLevelOfCare(lead.level_of_care);
  const contactQuality = scoreContactQuality(
    lead.email_verified,
    lead.preferred_contact,
    lead.message
  );
  const engagement = scoreEngagement(
    lead.who_seeking_help,
    lead.dual_diagnosis,
    lead.primary_substance
  );

  const total = insurance.points + urgency.points + levelOfCare.points + 
                contactQuality.points + engagement.points;

  // Grade based on total score
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
    factors: [
      { label: 'Insurance', points: insurance.points, maxPoints: 30 },
      { label: 'Urgency', points: urgency.points, maxPoints: 25 },
      { label: 'Level of Care', points: levelOfCare.points, maxPoints: 15 },
      { label: 'Contact Quality', points: contactQuality.points, maxPoints: 15 },
      { label: 'Engagement', points: engagement.points, maxPoints: 15 },
    ],
  };
}

export function getScoreColor(grade: 'A' | 'B' | 'C' | 'D'): {
  bg: string;
  text: string;
  border: string;
} {
  switch (grade) {
    case 'A':
      return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
    case 'B':
      return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
    case 'C':
      return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' };
    case 'D':
      return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };
  }
}
