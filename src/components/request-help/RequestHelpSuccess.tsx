import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface RequestHelpSuccessProps {
  facilityName: string | null;
}

export function RequestHelpSuccess({ facilityName }: RequestHelpSuccessProps) {
  return (
    <div className="min-h-[calc(100vh-200px)] bg-background flex items-center justify-center py-12">
      <div className="container max-w-lg mx-auto px-4 text-center">
        <div className="bg-card rounded-xl border border-border p-8 md:p-12 shadow-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Request Received
          </h1>
          
          <p className="text-muted-foreground mb-8">
            {facilityName ? (
              <>
                Your request has been sent to <span className="font-medium text-foreground">{facilityName}</span>. 
                They will contact you shortly using your preferred method.
              </>
            ) : (
              <>
                We've received your request and will connect you with treatment centers 
                that match your needs. Expect a call or email soon.
              </>
            )}
          </p>

          <div className="space-y-3">
            <Button asChild className="w-full" size="lg">
              <Link to="/rehab-centers">Browse More Centers</Link>
            </Button>
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link to="/">Return Home</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-8">
            If you're in crisis, please call the National Helpline at{" "}
            <a href="tel:1-800-662-4357" className="text-primary hover:underline font-medium">
              1-800-662-4357
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
