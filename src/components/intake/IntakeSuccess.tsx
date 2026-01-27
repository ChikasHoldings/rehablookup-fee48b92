import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Phone, Building2, ArrowRight, HeartHandshake, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface IntakeSuccessProps {
  firstName: string;
  facilityName?: string | null;
}

export function IntakeSuccess({ firstName, facilityName }: IntakeSuccessProps) {
  const navigate = useNavigate();

  useEffect(() => {
    // Celebration confetti
    const colors = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B"];
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors,
    });
  }, []);

  return (
    <div className="text-center py-8 px-4 animate-in fade-in duration-500">
      {/* Success Icon */}
      <div className="relative mx-auto w-20 h-20 mb-6">
        <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>
      </div>

      {/* Heading */}
      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
        Thank You, {firstName}!
      </h2>
      
      <p className="text-lg text-muted-foreground max-w-md mx-auto mb-6">
        {facilityName ? (
          <>Your request has been sent to <span className="font-semibold text-foreground">{facilityName}</span>.</>
        ) : (
          "Your request has been received and is being matched with treatment providers."
        )}
      </p>

      {/* What Happens Next */}
      <div className="bg-muted/50 rounded-xl p-6 text-left max-w-md mx-auto mb-8">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          What Happens Next
        </h3>
        <ol className="space-y-4">
          <li className="flex gap-3">
            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">1</span>
            <div>
              <p className="font-medium text-foreground">Review Your Request</p>
              <p className="text-sm text-muted-foreground">A treatment specialist will review your information</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">2</span>
            <div>
              <p className="font-medium text-foreground">Personalized Outreach</p>
              <p className="text-sm text-muted-foreground">You'll receive a call or text within 24 hours</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">3</span>
            <div>
              <p className="font-medium text-foreground">Start Your Journey</p>
              <p className="text-sm text-muted-foreground">Get connected with the right treatment program</p>
            </div>
          </li>
        </ol>
      </div>

      {/* Urgent Help Notice */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 max-w-md mx-auto mb-6">
        <div className="flex items-start gap-3">
          <Phone className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="text-left">
            <p className="font-medium text-amber-900 dark:text-amber-200">Need Immediate Help?</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Call SAMHSA's National Helpline: <a href="tel:1-800-662-4357" className="font-semibold underline">1-800-662-4357</a>
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
        <Button
          size="lg"
          className="flex-1 gap-2"
          onClick={() => navigate("/account/concierge")}
        >
          <HeartHandshake className="h-4 w-4" />
          Try Concierge Service
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="flex-1 gap-2"
          onClick={() => navigate("/search")}
        >
          <Building2 className="h-4 w-4" />
          Browse Treatment Centers
        </Button>
      </div>
    </div>
  );
}
