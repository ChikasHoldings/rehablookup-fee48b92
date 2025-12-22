// Facility Match Scoring - How well a lead matches a specific facility
import type { LeadScoringInput, FacilityMatchInput, FacilityMatchScore, ScoreFactor, ScoringWeights, DEFAULT_SCORING_WEIGHTS } from './types';
import { getNearbyStates, getStateAbbr } from '@/lib/proximitySearch';

function calculateLocationMatch(
  lead: LeadScoringInput,
  facility: FacilityMatchInput,
  maxPoints: number
): ScoreFactor {
  let points = 0;
  let details = 'No location data';

  const leadLocation = lead.location_city_state || '';
  const leadZip = lead.location_zip || '';

  // Extract state from lead location
  const stateMatch = leadLocation.match(/,\s*([A-Z]{2})$/i) || leadLocation.match(/([A-Z]{2})$/i);
  const leadState = stateMatch ? stateMatch[1].toUpperCase() : getStateAbbr(leadLocation.split(',').pop()?.trim() || '');
  const leadCity = leadLocation.split(',')[0]?.trim().toLowerCase();

  const facilityState = facility.facility_state.toUpperCase();
  const facilityCity = facility.facility_city.toLowerCase();
  const facilityZip = facility.facility_zip;

  // Exact ZIP match
  if (leadZip && leadZip === facilityZip) {
    points = maxPoints;
    details = 'Same ZIP code';
  }
  // Same city and state
  else if (leadCity && leadCity === facilityCity && leadState === facilityState) {
    points = Math.round(maxPoints * 0.95);
    details = 'Same city';
  }
  // Same state
  else if (leadState === facilityState) {
    points = Math.round(maxPoints * 0.75);
    details = 'Same state';
  }
  // Adjacent state
  else if (leadState) {
    const nearbyStates = getNearbyStates(leadState);
    if (nearbyStates.includes(facilityState)) {
      points = Math.round(maxPoints * 0.5);
      details = 'Nearby state';
    } else {
      points = Math.round(maxPoints * 0.2);
      details = 'Different region';
    }
  }
  // No location match possible
  else {
    points = Math.round(maxPoints * 0.3);
    details = 'Location unknown - nationwide match';
  }

  return {
    label: 'Location Match',
    points,
    maxPoints,
    category: 'match',
    details,
  };
}

function calculateServiceMatch(
  lead: LeadScoringInput,
  facility: FacilityMatchInput,
  maxPoints: number
): ScoreFactor {
  const facilityServices = facility.facility_services.map(s => s.toLowerCase());
  let matchCount = 0;
  let totalNeeds = 0;
  const matched: string[] = [];

  // Match level of care
  if (lead.level_of_care) {
    totalNeeds++;
    const levelOfCareMap: Record<string, string[]> = {
      'residential': ['residential', 'inpatient', 'residential treatment'],
      'inpatient': ['inpatient', 'residential', 'hospital'],
      'php': ['php', 'partial hospitalization', 'day program'],
      'partial-hospitalization': ['php', 'partial hospitalization', 'day program'],
      'iop': ['iop', 'intensive outpatient', 'outpatient'],
      'intensive-outpatient': ['iop', 'intensive outpatient', 'outpatient'],
      'outpatient': ['outpatient', 'counseling', 'therapy'],
      'detox': ['detox', 'detoxification', 'medical detox', 'withdrawal'],
    };

    const matchTerms = levelOfCareMap[lead.level_of_care] || [lead.level_of_care];
    const hasMatch = matchTerms.some(term => 
      facilityServices.some(s => s.includes(term))
    );
    
    if (hasMatch) {
      matchCount++;
      matched.push('Level of care');
    }
  }

  // Match substances
  if (lead.primary_substance && lead.primary_substance.length > 0) {
    totalNeeds++;
    const substanceServices = ['substance abuse', 'addiction', 'drug', 'alcohol', 'opioid', 'cocaine', 'meth'];
    const hasSubstanceService = substanceServices.some(term =>
      facilityServices.some(s => s.includes(term))
    );
    
    if (hasSubstanceService) {
      matchCount++;
      matched.push('Substance treatment');
    }
  }

  // Match dual diagnosis
  if (lead.dual_diagnosis === 'yes') {
    totalNeeds++;
    const dualDiagnosisTerms = ['dual diagnosis', 'co-occurring', 'mental health'];
    const hasDualDiagnosis = dualDiagnosisTerms.some(term =>
      facilityServices.some(s => s.includes(term))
    );
    
    if (hasDualDiagnosis) {
      matchCount++;
      matched.push('Dual diagnosis');
    }
  }

  // Match special needs
  if (lead.special_needs && lead.special_needs.length > 0) {
    for (const need of lead.special_needs) {
      totalNeeds++;
      const needLower = need.toLowerCase();
      if (facilityServices.some(s => s.includes(needLower))) {
        matchCount++;
        matched.push(need);
      }
    }
  }

  // Calculate points
  let points: number;
  let details: string;

  if (totalNeeds === 0) {
    points = Math.round(maxPoints * 0.6);
    details = 'No specific service needs identified';
  } else {
    const matchRatio = matchCount / totalNeeds;
    points = Math.round(matchRatio * maxPoints);
    
    if (matchRatio >= 0.9) {
      details = `Excellent match - ${matched.join(', ')}`;
    } else if (matchRatio >= 0.7) {
      details = `Good match - ${matched.slice(0, 2).join(', ')}`;
    } else if (matchRatio >= 0.5) {
      details = `Partial match - ${matchCount}/${totalNeeds} services`;
    } else {
      details = `Limited match - ${matchCount}/${totalNeeds} services`;
    }
  }

  return {
    label: 'Service Match',
    points,
    maxPoints,
    category: 'match',
    details,
  };
}

function calculateInsuranceMatch(
  lead: LeadScoringInput,
  facility: FacilityMatchInput,
  maxPoints: number
): ScoreFactor {
  const facilityInsurance = facility.facility_insurance.map(i => i.toLowerCase());
  
  if (!lead.insurance_type) {
    return {
      label: 'Insurance Match',
      points: Math.round(maxPoints * 0.4),
      maxPoints,
      category: 'match',
      details: 'Insurance type unknown',
    };
  }

  // Self-pay is always accepted
  if (lead.insurance_type === 'self-pay') {
    return {
      label: 'Insurance Match',
      points: maxPoints,
      maxPoints,
      category: 'match',
      details: 'Self-pay accepted',
    };
  }

  // Check for insurance type acceptance
  const insuranceTypeMap: Record<string, string[]> = {
    'ppo': ['ppo', 'private', 'commercial', 'most insurance'],
    'hmo': ['hmo', 'managed care', 'most insurance'],
    'medicaid': ['medicaid', 'state insurance', 'government'],
    'medicare': ['medicare', 'government', 'senior'],
  };

  const matchTerms = insuranceTypeMap[lead.insurance_type] || [lead.insurance_type];
  const hasMatch = matchTerms.some(term =>
    facilityInsurance.some(i => i.includes(term))
  );

  if (hasMatch) {
    return {
      label: 'Insurance Match',
      points: maxPoints,
      maxPoints,
      category: 'match',
      details: `${lead.insurance_type.toUpperCase()} accepted`,
    };
  }

  // Check if facility accepts "most insurance"
  if (facilityInsurance.some(i => i.includes('most') || i.includes('major'))) {
    return {
      label: 'Insurance Match',
      points: Math.round(maxPoints * 0.7),
      maxPoints,
      category: 'match',
      details: 'Likely accepted - verify coverage',
    };
  }

  return {
    label: 'Insurance Match',
    points: Math.round(maxPoints * 0.2),
    maxPoints,
    category: 'match',
    details: 'Insurance may not be accepted',
  };
}

function calculateDemographicMatch(
  lead: LeadScoringInput,
  facility: FacilityMatchInput,
  maxPoints: number
): ScoreFactor {
  let points = maxPoints; // Start with full points
  const issues: string[] = [];
  const matches: string[] = [];

  // Gender matching
  if (facility.facility_gender_served && facility.facility_gender_served !== 'all') {
    // We don't collect gender from leads, so assume potential match
    points -= 2;
    issues.push('Gender verification needed');
  } else {
    matches.push('All genders');
  }

  // Age group matching - we don't collect age, assume adult
  if (facility.facility_age_groups.length > 0) {
    const acceptsAdults = facility.facility_age_groups.some(ag => 
      ['adult', 'adults', '18+', 'all ages'].includes(ag.toLowerCase())
    );
    
    if (!acceptsAdults) {
      points = Math.round(points * 0.6);
      issues.push('May be age-restricted');
    } else {
      matches.push('Adults accepted');
    }
  }

  // Facility type matching
  const facilityType = facility.facility_type.toLowerCase();
  if (lead.level_of_care) {
    const levelMap: Record<string, string[]> = {
      'residential': ['residential', 'treatment center', 'rehab'],
      'outpatient': ['outpatient', 'clinic', 'counseling'],
      'detox': ['detox', 'hospital', 'medical'],
    };
    
    const expectedTypes = levelMap[lead.level_of_care] || [];
    if (expectedTypes.length > 0 && !expectedTypes.some(t => facilityType.includes(t))) {
      points = Math.round(points * 0.8);
      issues.push('Facility type may differ');
    }
  }

  return {
    label: 'Demographic Match',
    points: Math.max(0, Math.min(maxPoints, points)),
    maxPoints,
    category: 'match',
    details: matches.length > 0 
      ? matches.join(', ') 
      : issues.length > 0 
        ? issues.join(', ') 
        : 'Demographics compatible',
  };
}

export function calculateFacilityMatch(
  lead: LeadScoringInput,
  facility: FacilityMatchInput,
  weights: typeof DEFAULT_SCORING_WEIGHTS = {
    base: { insurance: 30, urgency: 25, levelOfCare: 15, contactQuality: 15, engagement: 15 },
    quality: { freshness: 25, validation: 20, completeness: 25, engagement: 15, source: 15 },
    match: { location: 35, services: 25, insurance: 25, demographics: 15 },
    categoryWeights: { base: 0.5, quality: 0.25, match: 0.25 },
  }
): FacilityMatchScore {
  const location = calculateLocationMatch(lead, facility, weights.match.location);
  const services = calculateServiceMatch(lead, facility, weights.match.services);
  const insurance = calculateInsuranceMatch(lead, facility, weights.match.insurance);
  const demographics = calculateDemographicMatch(lead, facility, weights.match.demographics);

  const factors = [location, services, insurance, demographics];
  const totalPoints = factors.reduce((sum, f) => sum + f.points, 0);
  const maxPoints = factors.reduce((sum, f) => sum + f.maxPoints, 0);
  const matchPercentage = Math.round((totalPoints / maxPoints) * 100);

  return {
    total: totalPoints,
    locationScore: location.points,
    serviceScore: services.points,
    insuranceScore: insurance.points,
    demographicScore: demographics.points,
    matchPercentage,
    matchFactors: factors,
  };
}
