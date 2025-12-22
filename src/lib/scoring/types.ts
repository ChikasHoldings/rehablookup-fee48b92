// Advanced Lead Scoring Types

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
  // Additional fields for advanced scoring
  created_at?: string;
  location_zip?: string | null;
  location_city_state?: string | null;
  validation_status?: string | null;
  quality_flag?: string | null;
  source?: string | null;
  special_needs?: string[] | null;
}

export interface FacilityMatchInput {
  facility_state: string;
  facility_city: string;
  facility_zip: string;
  facility_services: string[];
  facility_insurance: string[];
  facility_age_groups: string[];
  facility_gender_served: string | null;
  facility_type: string;
}

export interface ScoreFactor {
  label: string;
  points: number;
  maxPoints: number;
  category: 'base' | 'quality' | 'match';
  details?: string;
}

export interface LeadScore {
  total: number;
  grade: 'A' | 'B' | 'C' | 'D';
  factors: ScoreFactor[];
  baseScore: number;
  qualityMultiplier: number;
  matchBonus: number;
}

export interface FacilityMatchScore {
  total: number;
  locationScore: number;
  serviceScore: number;
  insuranceScore: number;
  demographicScore: number;
  matchPercentage: number;
  matchFactors: ScoreFactor[];
}

export interface LeadQualityMetrics {
  freshnessScore: number;
  validationScore: number;
  completenessScore: number;
  engagementScore: number;
  sourceScore: number;
  qualityMultiplier: number;
  qualityFactors: ScoreFactor[];
}

export interface AdvancedLeadScore {
  // Combined scores
  overallScore: number;
  overallGrade: 'A' | 'B' | 'C' | 'D';
  
  // Component scores
  baseScore: LeadScore;
  qualityMetrics: LeadQualityMetrics;
  facilityMatch?: FacilityMatchScore;
  
  // Summary
  priorityRank: 'hot' | 'warm' | 'cool' | 'cold';
  recommendedAction: string;
  allFactors: ScoreFactor[];
}

// Scoring weight configuration
export interface ScoringWeights {
  base: {
    insurance: number;
    urgency: number;
    levelOfCare: number;
    contactQuality: number;
    engagement: number;
  };
  quality: {
    freshness: number;
    validation: number;
    completeness: number;
    engagement: number;
    source: number;
  };
  match: {
    location: number;
    services: number;
    insurance: number;
    demographics: number;
  };
  categoryWeights: {
    base: number;
    quality: number;
    match: number;
  };
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  base: {
    insurance: 30,
    urgency: 25,
    levelOfCare: 15,
    contactQuality: 15,
    engagement: 15,
  },
  quality: {
    freshness: 25,
    validation: 20,
    completeness: 25,
    engagement: 15,
    source: 15,
  },
  match: {
    location: 35,
    services: 25,
    insurance: 25,
    demographics: 15,
  },
  categoryWeights: {
    base: 0.5,
    quality: 0.25,
    match: 0.25,
  },
};
