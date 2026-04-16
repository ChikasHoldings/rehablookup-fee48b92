import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, ArrowRight, Shield, CheckCircle } from "lucide-react";

interface ConversionSectionProps {
  location?: string;
}

export function ConversionSection({ location }: ConversionSectionProps) {
  return (
    <section className="py-12 bg-background">
      <div className="container max-w-4xl">
        <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-8 md:p-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 mb-4">
            <Phone className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Free & Confidential</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Not Sure Which Rehab Is Right{location ? ` in ${location}` : ""}?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Our placement advisors will match you with the best program for your needs — insurance, budget, treatment type, and location. No spam, no pressure.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <Button asChild size="lg" className="gap-2">
              <Link to="/concierge">
                Get Personalized Help
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link to="/insurance">
                <Shield className="h-4 w-4" />
                Verify Insurance
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-accent" /> No obligation</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-accent" /> 100% confidential</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-accent" /> Available 24/7</span>
          </div>
        </div>
      </div>
    </section>
  );
}
