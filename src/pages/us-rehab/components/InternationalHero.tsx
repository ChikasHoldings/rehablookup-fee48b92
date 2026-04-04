import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Globe, Clock, Shield, CheckCircle } from "lucide-react";

interface InternationalHeroProps {
  title: string;
  subtitle: string;
  description: string;
  ctaText?: string;
  ctaLink?: string;
  keywords?: string[];
}

export const InternationalHero = ({
  title,
  subtitle,
  description,
  ctaText = "Start Your Placement",
  ctaLink = "/international/apply",
  keywords = [],
}: InternationalHeroProps) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/[0.03] via-background to-background py-16 md:py-24 lg:py-28">
      {/* Subtle background accents */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/[0.04] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/[0.04] rounded-full blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Globe className="h-4 w-4" />
            <span>Serving International Clients from 50+ Countries</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 leading-tight tracking-tight">
            {title}
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-primary font-semibold mb-3">
            {subtitle}
          </p>

          {/* Description */}
          <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>

          {/* Trust Signals */}
          <div className="flex flex-wrap justify-center gap-5 md:gap-8 mb-10">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">200+ Vetted Facilities</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">24-Hour Response</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">100% Confidential</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-base px-8 py-6"
            >
              <Link to={ctaLink}>{ctaText}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-base px-8 py-6 border-border"
            >
              <Link to="/international">Learn About Our Process</Link>
            </Button>
          </div>

          {/* Keywords for SEO */}
          {keywords.length > 0 && (
            <div className="mt-10 flex flex-wrap justify-center gap-2">
              {keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
