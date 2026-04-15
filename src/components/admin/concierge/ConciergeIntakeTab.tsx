import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface ConciergeIntakeTabProps {
  caseData: ConciergeInquiry;
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

export function ConciergeIntakeTab({ caseData }: ConciergeIntakeTabProps) {
  return (
    <div className="space-y-4">
      {/* Contact Information */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="py-2 text-sm">
          <InfoRow label="Name" value={caseData.user_name} />
          <InfoRow label="Email" value={caseData.user_email} />
          <InfoRow label="Phone" value={caseData.user_phone} />
          <InfoRow label="Best Time to Call" value={caseData.best_time_to_call} />
          <InfoRow label="Alternative Contact" value={caseData.alternative_contact_name} />
          <InfoRow label="Alt. Phone" value={caseData.alternative_contact_phone} />
          <InfoRow label="Decision Maker" value={caseData.decision_maker_name} />
          <InfoRow label="Relationship" value={caseData.relationship_to_seeker} />
        </CardContent>
      </Card>

      {/* Care Needs */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Care Needs</CardTitle>
        </CardHeader>
        <CardContent className="py-2 text-sm">
          <InfoRow label="Level of Care" value={caseData.level_of_care} />
          <InfoRow label="Primary Concern" value={caseData.primary_concern} />
          <InfoRow label="Detox Needed" value={caseData.detox_needed} />
          <InfoRow label="Timeline/Urgency" value={caseData.timeline_urgency} />
          <InfoRow label="Substance Use Duration" value={caseData.substance_use_duration} />
          <InfoRow label="Substance Use Frequency" value={caseData.substance_use_frequency} />
          <InfoRow label="Prior Treatment" value={caseData.prior_treatment_history ? "Yes" : "No"} />
          {caseData.prior_treatment_notes && (
            <InfoRow label="Prior Treatment Notes" value={caseData.prior_treatment_notes} />
          )}
          {caseData.co_occurring_concerns && (
            <div className="py-1">
              <span className="text-muted-foreground">Co-occurring Concerns:</span>
              <p className="font-medium mt-1">
                {Array.isArray(caseData.co_occurring_concerns)
                  ? (caseData.co_occurring_concerns as string[]).join(", ")
                  : String(caseData.co_occurring_concerns)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Demographics */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Demographics</CardTitle>
        </CardHeader>
        <CardContent className="py-2 text-sm">
          <InfoRow label="Gender" value={caseData.gender} />
          <InfoRow label="Age Range" value={caseData.age_range} />
          <InfoRow label="Preferred Language" value={caseData.preferred_language} />
          <InfoRow label="Mobility Needs" value={caseData.mobility_needs} />
          <InfoRow label="Current Living" value={caseData.current_living_situation} />
        </CardContent>
      </Card>

      {/* Location Preferences */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Location Preferences</CardTitle>
        </CardHeader>
        <CardContent className="py-2 text-sm">
          <InfoRow label="Desired State" value={caseData.desired_location_state || caseData.preferred_state} />
          <InfoRow label="Desired City" value={caseData.desired_location_city || caseData.preferred_city} />
          <InfoRow label="Radius (miles)" value={caseData.desired_radius_miles?.toString()} />
          <InfoRow label="Willing to Travel" value={caseData.willing_to_travel ? "Yes" : "No"} />
          <InfoRow label="Needs Transport Help" value={caseData.needs_transport_help ? "Yes" : "No"} />
          <InfoRow label="Environment Preference" value={caseData.preferred_environment} />
        </CardContent>
      </Card>

      {/* Payment & Insurance */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Payment & Insurance</CardTitle>
        </CardHeader>
        <CardContent className="py-2 text-sm">
          <InfoRow label="Payment Type" value={
            caseData.payment_type === "both" ? "Insurance + Self-Pay" :
            caseData.payment_type === "insurance" ? "Insurance" :
            caseData.payment_type === "self-pay" ? "Self-Pay / Private Pay" :
            caseData.payment_type === "unsure" ? "Not sure yet" :
            caseData.payment_type
          } />
          <InfoRow label="Insurance Carrier" value={caseData.insurance_carrier} />
          <InfoRow label="Member ID" value={caseData.insurance_member_id} />
          <InfoRow label="Group Number" value={caseData.insurance_group_number} />
          <InfoRow label="Benefits Verified" value={caseData.benefits_verified ? "Yes" : "No"} />
          <InfoRow label="Budget Range" value={caseData.budget_range} />
          <InfoRow label="Scholarship Interest" value={caseData.scholarship_interest ? "Yes" : "No"} />
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="py-2 text-sm">
          <InfoRow label="Faith-Based" value={caseData.faith_based_preference} />
          <InfoRow label="Holistic Interest" value={caseData.holistic_interest ? "Yes" : "No"} />
          {caseData.amenity_preferences && (
            <div className="py-1">
              <span className="text-muted-foreground">Amenity Preferences:</span>
              <p className="font-medium mt-1">
                {Array.isArray(caseData.amenity_preferences)
                  ? (caseData.amenity_preferences as string[]).join(", ")
                  : String(caseData.amenity_preferences)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Case Metadata</CardTitle>
        </CardHeader>
        <CardContent className="py-2 text-sm">
          <InfoRow label="Case ID" value={caseData.id.slice(0, 8) + "..."} />
          <InfoRow label="Created" value={format(new Date(caseData.created_at), "MMM d, yyyy h:mm a")} />
          <InfoRow label="Payment Status" value={caseData.payment_status} />
          <InfoRow label="Referral Source" value={caseData.referral_source} />
          <InfoRow label="HIPAA Consent" value={caseData.hipaa_consent ? "Yes" : "No"} />
        </CardContent>
      </Card>
    </div>
  );
}
