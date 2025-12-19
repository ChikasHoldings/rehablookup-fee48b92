import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone, Shield } from "lucide-react";

interface LeadSubmissionFormProps {
  facilityId: string;
  facilityName: string;
  facilityEmail?: string | null;
}

/**
 * LeadSubmissionForm - Redirects to unified lead intake form
 * 
 * This component has been deprecated in favor of the unified Lead Intake Engine.
 * It now displays a CTA that redirects users to /request-help with facility context.
 */
export function LeadSubmissionForm({ facilityId, facilityName }: LeadSubmissionFormProps) {
  const navigate = useNavigate();

  const handleGetHelp = () => {
    const params = new URLSearchParams({
      facility: facilityId,
      facilityName: encodeURIComponent(facilityName),
      source: "provider_profile",
    });
    navigate(`/request-help?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="font-semibold text-lg text-foreground mb-2">
          Request Information from {facilityName}
        </h3>
        <p className="text-sm text-muted-foreground">
          Complete our brief form to connect with this treatment center.
        </p>
      </div>

      <Button
        onClick={handleGetHelp}
        variant="success"
        size="lg"
        className="w-full gap-2"
      >
        <Phone className="h-4 w-4" />
        Request a Call Back
        <ArrowRight className="h-4 w-4" />
      </Button>

      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Confidential:</strong> Your information is protected and will only be used to connect you with treatment resources.
        </p>
      </div>
    </div>
  );
}
