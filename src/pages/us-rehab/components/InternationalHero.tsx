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
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 py-16 md:py-24 lg:py-32">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Globe className="h-4 w-4" />
            <span>Serving International Clients from 50+ Countries</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4 leading-tight">
            {title}
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-primary font-semibold mb-4">
            {subtitle}
          </p>

          {/* Description */}
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            {description}
          </p>

          {/* Trust Signals */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-10">
            <div className="flex items-center gap-2 text-sm md:text-base">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-muted-foreground">200+ Vetted Facilities</span>
            </div>
            <div className="flex items-center gap-2 text-sm md:text-base">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-muted-foreground">24-Hour Response</span>
            </div>
            <div className="flex items-center gap-2 text-sm md:text-base">
              <Shield className="h-5 w-5 text-accent" />
              <span className="text-muted-foreground">100% Confidential</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              asChild 
              size="lg" 
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-6"
            >
              <Link to={ctaLink}>{ctaText}</Link>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-6"
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
                  className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full"
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
