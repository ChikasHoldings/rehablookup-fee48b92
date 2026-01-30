import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, Shield } from "lucide-react";
import { analytics } from "@/lib/analytics";

interface ContactRequestFormProps {
  centerName?: string;
}

/**
 * ContactRequestForm - Redirects to Concierge service
 * 
 * For general help requests, users are directed to the Concierge placement service.
 * Facility-specific inquiries should use the LeadSubmissionForm on facility pages.
 */
export function ContactRequestForm({ centerName }: ContactRequestFormProps) {
  const navigate = useNavigate();

  const handleGetHelp = () => {
    analytics.ctaClick("Get Matched", "contact_form");
    navigate("/account/concierge");
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="font-semibold text-lg text-foreground mb-2">
          Get Matched With Treatment
        </h3>
        <p className="text-sm text-muted-foreground">
          Our concierge service will match you with verified treatment centers based on your needs.
        </p>
      </div>

      <Button
        onClick={handleGetHelp}
        variant="success"
        size="lg"
        className="w-full gap-2"
      >
        <Heart className="h-4 w-4" />
        Get Matched
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
