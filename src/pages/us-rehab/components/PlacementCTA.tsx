import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Sparkles } from "lucide-react";

interface PlacementCTAProps {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
}

export const PlacementCTA = ({
  title = "Ready to Start Your Recovery Journey?",
  description = "Our dedicated international placement team is available 24/7 to help you find the perfect treatment program in the United States.",
  buttonText = "Start Your Placement",
  buttonLink = "/international/apply"
}: PlacementCTAProps) => {
  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-8 md:p-12 shadow-lg">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

            <div className="relative text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                <span>Personalized Placement Service</span>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                {title}
              </h2>
              <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                {description}
              </p>

              {/* Benefits */}
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-8">
                {["Confidential Consultation", "Visa Support", "Travel Coordination"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <Button
                asChild
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-base px-8 py-6 shadow-md"
              >
                <Link to={buttonLink} className="flex items-center gap-2">
                  {buttonText}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>

              {/* Trust */}
              <p className="mt-6 text-muted-foreground/70 text-xs">
                Trusted by over 2,500 international families since 2020
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
