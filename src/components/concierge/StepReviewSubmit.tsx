import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User, Heart, MapPin, CreditCard, Phone, Edit2, 
  CheckCircle, AlertCircle, Lock, Loader2, Shield 
} from "lucide-react";
import { ConciergeIntakeData } from "@/pages/concierge/ConciergeIntake";
import { useSearchParams } from "react-router-dom";

interface PaymentState {
  sessionId: string | null;
  paid: boolean;
  verifiedAt: string | null;
}

interface StepReviewSubmitProps {
  data: ConciergeIntakeData;
  paymentState: PaymentState;
  onEdit: (step: number) => void;
  onPay: () => void;
  isSubmitting: boolean;
  isProcessingPayment: boolean;
}

const SectionCard = ({ 
  title, 
  icon: Icon, 
  step, 
  onEdit, 
  children 
}: { 
  title: string; 
  icon: React.ElementType; 
  step: number; 
  onEdit: (step: number) => void; 
  children: React.ReactNode;
}) => (
  <Card className="border border-border/50">
    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => onEdit(step)}
        className="h-8 px-2 text-xs"
      >
        <Edit2 className="h-3 w-3 mr-1" />
        Edit
      </Button>
    </CardHeader>
    <CardContent className="px-4 pb-4 pt-0">
      <div className="text-sm text-muted-foreground space-y-1">
        {children}
      </div>
    </CardContent>
  </Card>
);

const InfoRow = ({ label, value }: { label: string; value: string | boolean | null | undefined }) => {
  if (value === null || value === undefined || value === "") return null;
  const displayValue = typeof value === "boolean" ? (value ? "Yes" : "No") : value;
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground font-medium">{displayValue}</span>
    </div>
  );
};

export function StepReviewSubmit({
  data,
  paymentState,
  onEdit,
  onPay,
  isSubmitting,
  isProcessingPayment,
}: StepReviewSubmitProps) {
  const [searchParams] = useSearchParams();
  const wasCanceled = searchParams.get("canceled") === "true";

  // Compute full name from firstName and lastName
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ") || data.decisionMakerName;

  return (
    <div className="space-y-6">
      {/* Legacy cancel param (from old paid flow) — safe to ignore but show a friendly note */}
      {wasCanceled && !paymentState.paid && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your information is saved. Click "Submit My Request" when you're ready.
          </AlertDescription>
        </Alert>
      )}

      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-foreground">Review Your Information</h3>
        <p className="text-sm text-muted-foreground">
          Please verify all details before submitting
        </p>
      </div>

      <div className="space-y-4">
        {/* Step 1: Who Needs Help */}
        <SectionCard title="Who Needs Help" icon={User} step={1} onEdit={onEdit}>
          <InfoRow label="Age Range" value={data.ageRange} />
          <InfoRow label="Gender" value={data.gender} />
          <InfoRow label="Location" value={`${data.city}, ${data.state}`} />
          <InfoRow label="Relationship" value={data.relationship} />
          <InfoRow label="Living Situation" value={data.currentLivingSituation} />
          <InfoRow label="Language" value={data.preferredLanguage} />
          <InfoRow label="Mobility Needs" value={data.mobilityNeeds} />
        </SectionCard>

        {/* Step 2: Care Needs */}
        <SectionCard title="Care Needs" icon={Heart} step={2} onEdit={onEdit}>
          <InfoRow label="Primary Concern" value={data.primaryConcern} />
          <InfoRow label="Use Frequency" value={data.substanceUseFrequency} />
          <InfoRow label="Duration" value={data.substanceUseDuration} />
          <InfoRow label="Detox Needed" value={data.detoxNeeded} />
          <InfoRow label="Level of Care" value={data.levelOfCare} />
          <InfoRow label="Prior Treatment" value={data.priorTreatment} />
          {data.priorTreatmentNotes && (
            <InfoRow label="Treatment Notes" value={data.priorTreatmentNotes} />
          )}
          {data.coOccurringConcerns.length > 0 && (
            <InfoRow label="Co-Occurring" value={data.coOccurringConcerns.join(", ")} />
          )}
          <InfoRow label="Current Medications" value={data.currentMedications} />
        </SectionCard>

        {/* Step 3: Location & Preferences */}
        <SectionCard title="Location & Preferences" icon={MapPin} step={3} onEdit={onEdit}>
          <InfoRow label="Desired Location" value={data.desiredCity ? `${data.desiredCity}, ${data.desiredState}` : data.desiredState} />
          <InfoRow label="Radius" value={`${data.radiusMiles} miles`} />
          <InfoRow label="Environment" value={data.preferredEnvironment} />
          <InfoRow label="Timeline" value={data.timeline} />
          <InfoRow label="Faith-Based" value={data.faithBasedPreference} />
          <InfoRow label="Holistic Interest" value={data.holisticInterest} />
          {data.amenityPreferences.length > 0 && (
            <InfoRow label="Amenities" value={data.amenityPreferences.join(", ")} />
          )}
          <InfoRow label="Transport Help" value={data.needsTransport} />
          <InfoRow label="Assessment Pref." value={data.assessmentPreference} />
        </SectionCard>

        {/* Step 4: Payment & Insurance */}
        <SectionCard title="Payment & Insurance" icon={CreditCard} step={4} onEdit={onEdit}>
          <InfoRow label="Payment Type" value={data.paymentType} />
          {data.insuranceCarrier && (
            <>
              <InfoRow label="Insurance Carrier" value={data.insuranceCarrier} />
              <InfoRow label="Member ID" value={data.insuranceMemberId} />
              <InfoRow label="Group Number" value={data.insuranceGroupNumber} />
              <InfoRow label="Employer" value={data.employerName} />
              <InfoRow label="Benefits Verified" value={data.benefitsVerified} />
            </>
          )}
          {data.budgetRange && <InfoRow label="Budget Range" value={data.budgetRange} />}
          <InfoRow label="Scholarship Interest" value={data.scholarshipInterest} />
          <InfoRow label="Willing to Travel" value={data.willingToTravel} />
        </SectionCard>

        {/* Step 5: Contact Information */}
        <SectionCard title="Contact Information" icon={Phone} step={5} onEdit={onEdit}>
          <InfoRow label="Name" value={fullName} />
          <InfoRow label="Phone" value={data.phone} />
          <InfoRow label="Email" value={data.email} />
          <InfoRow label="Best Time to Call" value={data.bestTimeToCall} />
          {data.alternativeContactName && (
            <InfoRow label="Alt Contact" value={`${data.alternativeContactName} - ${data.alternativeContactPhone}`} />
          )}
          {data.emergencyContactName && (
            <InfoRow label="Emergency Contact" value={`${data.emergencyContactName} - ${data.emergencyContactPhone}`} />
          )}
          <InfoRow label="Referral Source" value={data.referralSource} />
          <InfoRow label="HIPAA Consent" value={data.hipaaConsent} />
        </SectionCard>

        {/* Notes */}
        {data.notes && (
          <Card className="border border-border/50">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <p className="text-sm text-muted-foreground">{data.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Submit Section */}
      <div className="pt-6 border-t">
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground mb-4">
            Your placement request is <strong>free</strong>. After you submit, our team will begin
            reviewing your intake and reach out within 24–48 hours.
          </p>
          <Button
            onClick={onPay}
            disabled={isProcessingPayment}
            size="lg"
            className="w-full sm:w-auto min-w-[280px] h-12 text-base bg-gradient-to-r from-primary to-primary/80"
          >
            {isProcessingPayment ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                Submit My Request
              </>
            )}
          </Button>
        </div>

        {/* Trust Indicators */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-green-600" />
            SSL Encrypted
          </span>
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-green-600" />
            HIPAA Compliant
          </span>
        </div>
      </div>
    </div>
  );
}
