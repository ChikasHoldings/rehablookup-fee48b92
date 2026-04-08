// Centralized source label mapping for inquiry/lead sources
const SOURCE_LABELS: Record<string, string> = {
  // Direct inquiry sources
  direct: "Direct Inquiry",
  direct_profile: "Provider Profile",
  profile: "Provider Profile",
  
  // Form and modal sources
  request_help: "Request Help Form",
  "Request Help Page": "Qualified Lead Form",
  request_info: "Request Info",
  request_info_modal: "Request Info Modal",
  header: "Header Form",
  header_cta: "Header CTA",
  
  // Landing page sources
  marketing_landing: "Marketing Landing",
  social_landing: "Social Ads",
  ads_landing: "Google Ads",
  rehab_cta: "Rehab CTA",
  
  // Other sources
  organic: "Organic Search",
  referral: "Referral",
  concierge: "Concierge",
  widget: "Embedded Widget",
  exit_intent: "Exit Intent",
};

/**
 * Formats a source string into a human-readable label
 * Falls back to title-casing the source if no mapping exists
 */
export function formatSourceLabel(source: string | null | undefined): string {
  if (!source) return "Direct Inquiry";
  
  // Check for exact match first
  if (SOURCE_LABELS[source]) {
    return SOURCE_LABELS[source];
  }
  
  // Check for case-insensitive match
  const lowerSource = source.toLowerCase();
  if (SOURCE_LABELS[lowerSource]) {
    return SOURCE_LABELS[lowerSource];
  }
  
  // Fallback: convert snake_case to Title Case
  return source
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export { SOURCE_LABELS };
