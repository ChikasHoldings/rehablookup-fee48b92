import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Phone, Clock, UserPlus, ArrowRight } from "lucide-react";

interface PlacementSuccessScreenProps {
  caseId: string;
}

export function PlacementSuccessScreen({ caseId }: PlacementSuccessScreenProps) {
  const caseNumber = caseId.slice(0, 8).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 to-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center space-y-6">
        {/* Success Icon */}
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-emerald-100 mx-auto">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>

        {/* Main Message */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Your Request Has Been Submitted!
          </h1>
          <p className="text-muted-foreground">
            A placement specialist will contact you within 24 hours.
          </p>
        </div>

        {/* Case Number */}
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Your Case Number</p>
            <p className="text-xl font-mono font-bold text-foreground">#{caseNumber}</p>
          </CardContent>
        </Card>

        {/* What's Next */}
        <div className="space-y-4 text-left">
          <h2 className="font-semibold text-foreground text-center">What Happens Next?</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-card border">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Within 24 Hours</p>
                <p className="text-sm text-muted-foreground">
                  A specialist reviews your case and prepares personalized options
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-card border">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Personal Call</p>
                <p className="text-sm text-muted-foreground">
                  We'll call to discuss your situation and answer questions
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-card border">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ArrowRight className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Introductions</p>
                <p className="text-sm text-muted-foreground">
                  We connect you directly with facilities that match your needs
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Create an account to track your case status and receive updates.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link to={`/seeker/signup?redirect=${encodeURIComponent(`/account/placement?case=${caseId}`)}`}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Account
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">Return Home</Link>
            </Button>
          </div>
        </div>

        {/* Contact Info */}
        <p className="text-xs text-muted-foreground pt-4">
          Questions? Email us at{" "}
          <a href="mailto:placement@rehablookup.com" className="text-primary font-medium">
            placement@rehablookup.com
          </a>
        </p>
      </div>
    </div>
  );
}
