import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, ArrowRight, CheckCircle } from "lucide-react";

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
    <section className="py-16 md:py-20 bg-gradient-to-br from-primary to-primary/80">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            {title}
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            {description}
          </p>

          {/* Benefits */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-10">
            <div className="flex items-center gap-2 text-primary-foreground/90">
              <CheckCircle className="h-5 w-5" />
              <span>Free Consultation</span>
            </div>
            <div className="flex items-center gap-2 text-primary-foreground/90">
              <CheckCircle className="h-5 w-5" />
              <span>Visa Support</span>
            </div>
            <div className="flex items-center gap-2 text-primary-foreground/90">
              <CheckCircle className="h-5 w-5" />
              <span>Travel Coordination</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              asChild 
              size="lg" 
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-6"
            >
              <Link to={buttonLink} className="flex items-center gap-2">
                {buttonText}
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              size="lg" 
              className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-lg px-8 py-6"
            >
              <a href="tel:+1-888-555-0123" className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Call Now
              </a>
            </Button>
          </div>

          {/* Trust */}
          <p className="mt-8 text-primary-foreground/70 text-sm">
            Trusted by over 2,500 international families since 2020
          </p>
        </div>
      </div>
    </section>
  );
};
