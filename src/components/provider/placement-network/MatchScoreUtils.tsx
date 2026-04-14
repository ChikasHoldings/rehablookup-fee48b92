import { useMemo } from "react";
import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FacilityInfo {
  state: string;
  facility_type: string;
  city?: string;
}

interface InquiryInfo {
  preferred_state?: string | null;
  preferred_city?: string | null;
  level_of_care?: string | null;
  payment_type?: string | null;
  insurance_carrier?: string | null;
  timeline_urgency?: string | null;
}

/** Map facility_type to care-level keywords for fuzzy matching */
const CARE_TYPE_MATCH: Record<string, string[]> = {
  "Residential Treatment Center": ["residential", "inpatient"],
  "Outpatient Program": ["outpatient", "iop", "intensive_outpatient"],
  "Detox Center": ["detox", "medical_detox"],
  "Intensive Outpatient (IOP)": ["iop", "intensive_outpatient", "outpatient"],
  "Partial Hospitalization (PHP)": ["php", "partial_hospitalization", "partial"],
  "Sober Living": ["sober_living", "transitional"],
  "Dual Diagnosis": ["dual_diagnosis", "residential", "inpatient"],
  "Luxury Rehab": ["residential", "inpatient", "luxury"],
  "Telehealth/Virtual": ["telehealth", "virtual", "outpatient"],
};

/** Calculate a match percentage between a facility and an inquiry */
export function calculateMatchScore(facility: FacilityInfo, inquiry: InquiryInfo): number {
  let totalWeight = 0;
  let matchedWeight = 0;

  // 1. Location match (40% weight)
  if (inquiry.preferred_state) {
    totalWeight += 40;
    if (facility.state?.toLowerCase() === inquiry.preferred_state?.toLowerCase()) {
      matchedWeight += 40;
      // Bonus for city match
      if (inquiry.preferred_city && facility.city &&
          facility.city.toLowerCase() === inquiry.preferred_city.toLowerCase()) {
        matchedWeight += 5; // bonus
      }
    }
  }

  // 2. Care type match (35% weight)
  if (inquiry.level_of_care) {
    totalWeight += 35;
    const facilityKeywords = CARE_TYPE_MATCH[facility.facility_type] || [];
    const inquiryLoc = inquiry.level_of_care.toLowerCase().replace(/\s+/g, "_");
    if (facilityKeywords.some(kw => inquiryLoc.includes(kw) || kw.includes(inquiryLoc))) {
      matchedWeight += 35;
    }
  }

  // 3. Insurance/payment (15% weight) — if they have insurance, it's likely a match
  if (inquiry.payment_type) {
    totalWeight += 15;
    // Most facilities accept insurance — give partial credit
    if (inquiry.payment_type === "insurance" && inquiry.insurance_carrier) {
      matchedWeight += 12; // High likelihood
    } else {
      matchedWeight += 15; // Self-pay or other always matches
    }
  }

  // 4. Urgency bonus (10% weight) — urgent cases get matched to facilities that received the intro
  totalWeight += 10;
  matchedWeight += 10; // If they received the intro, they're a relevant match

  if (totalWeight === 0) return 85; // No data = default high match (they were selected by the system)
  
  const raw = Math.round((matchedWeight / totalWeight) * 100);
  // Floor at 60% (system wouldn't send bad matches) and cap at 99%
  return Math.min(99, Math.max(60, raw));
}

/** Hook to get match score */
export function useMatchScore(facility: FacilityInfo | null | undefined, inquiry: InquiryInfo | null | undefined): number {
  return useMemo(() => {
    if (!facility || !inquiry) return 85;
    return calculateMatchScore(facility, inquiry);
  }, [facility, inquiry]);
}

/** Match score badge component */
export function MatchScoreBadge({ 
  score, 
  size = "default" 
}: { 
  score: number; 
  size?: "default" | "compact" | "large";
}) {
  const color = score >= 85 
    ? "bg-success/10 text-success border-success/30" 
    : score >= 70 
    ? "bg-primary/10 text-primary border-primary/30"
    : "bg-warning/10 text-warning border-warning/30";

  if (size === "compact") {
    return (
      <Badge variant="outline" className={cn("text-[9px] px-1 py-0 h-4 gap-0.5 font-bold", color)}>
        <Target className="h-2.5 w-2.5" />
        {score}%
      </Badge>
    );
  }

  if (size === "large") {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold", color)}>
        <Target className="h-4 w-4" />
        <span>🎯 {score}% match for your facility</span>
      </div>
    );
  }

  return (
    <Badge variant="outline" className={cn("text-xs gap-1 font-bold", color)}>
      <Target className="h-3 w-3" />
      🎯 {score}% match
    </Badge>
  );
}
