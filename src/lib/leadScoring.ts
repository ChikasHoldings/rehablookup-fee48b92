// Lead Scoring System - Re-export from modular scoring system
// This file is kept for backwards compatibility

export {
  calculateLeadScore,
  calculateBaseScore,
  calculateQualityMetrics,
  calculateFacilityMatch,
  calculateAdvancedLeadScore,
  getQuickScore,
  getLeadPriority,
  getScoreColor,
  getPriorityColor,
  DEFAULT_SCORING_WEIGHTS,
} from './scoring';

export type {
  LeadScoringInput,
  LeadScore,
  LeadQualityMetrics,
  FacilityMatchInput,
  FacilityMatchScore,
  AdvancedLeadScore,
  ScoreFactor,
  ScoringWeights,
} from './scoring';
