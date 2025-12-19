import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Phone, ArrowRight } from "lucide-react";

interface LeadIntakeSuccessProps {
  facilityName?: string | null;
  firstName?: string;
}

export function LeadIntakeSuccess({ facilityName, firstName }: LeadIntakeSuccessProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12">
      <div className="max-w-md w-full text-center px-4">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
          Thank You{firstName ? `, ${firstName}` : ""}!
        </h1>
        
        <p className="text-lg text-muted-foreground mb-6">
          {facilityName ? (
            <>
              Your request has been sent to <span className="font-medium text-foreground">{facilityName}</span>. 
              A representative will reach out to you shortly.
            </>
          ) : (
            <>
              Your request has been received. A treatment specialist will contact you 
              using your preferred method within 24 hours.
            </>
          )}
        </p>

        {/* What to Expect */}
        <div className="bg-muted/50 rounded-xl p-6 mb-8 text-left">
          <h3 className="font-semibold text-foreground mb-3">What happens next?</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <span>A verified treatment specialist will review your information</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <span>They'll reach out using your preferred contact method</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <span>You'll discuss options and next steps together</span>
            </li>
          </ul>
        </div>

        {/* Emergency Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
          <div className="flex items-center justify-center gap-2 text-amber-800">
            <Phone className="w-4 h-4" />
            <span className="text-sm font-medium">
              If this is an emergency, please call 911 or the SAMHSA helpline: 1-800-662-4357
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link to="/rehab-centers">
            <Button variant="outline" className="w-full h-12">
              Browse Treatment Centers
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/">
            <Button variant="ghost" className="w-full">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
