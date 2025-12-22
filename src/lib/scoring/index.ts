// Advanced Lead Scoring System - Unified exports
export * from './types';
export { calculateBaseScore, calculateLeadScore } from './baseScoring';
export { calculateQualityMetrics } from './qualityMetrics';
export { calculateFacilityMatch } from './facilityMatch';
export { 
  calculateAdvancedLeadScore, 
  getQuickScore, 
  getLeadPriority 
} from './advancedScoring';

// Re-export legacy function for backwards compatibility
import { calculateBaseScore } from './baseScoring';
import type { LeadScoringInput, LeadScore } from './types';

export function calculateLeadScoreLegacy(lead: LeadScoringInput): LeadScore {
  return calculateBaseScore(lead);
}

// Score color utilities
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

export function getPriorityColor(priority: 'hot' | 'warm' | 'cool' | 'cold'): {
  bg: string;
  text: string;
  border: string;
  icon: string;
} {
  switch (priority) {
    case 'hot':
      return { 
        bg: 'bg-red-100', 
        text: 'text-red-700', 
        border: 'border-red-200',
        icon: '🔥'
      };
    case 'warm':
      return { 
        bg: 'bg-orange-100', 
        text: 'text-orange-700', 
        border: 'border-orange-200',
        icon: '☀️'
      };
    case 'cool':
      return { 
        bg: 'bg-sky-100', 
        text: 'text-sky-700', 
        border: 'border-sky-200',
        icon: '❄️'
      };
    case 'cold':
      return { 
        bg: 'bg-slate-100', 
        text: 'text-slate-600', 
        border: 'border-slate-200',
        icon: '🧊'
      };
  }
}
