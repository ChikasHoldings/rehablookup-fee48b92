import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Globe, Clock, Shield, CheckCircle } from "lucide-react";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";

interface InternationalHeroProps {
  title: string;
  subtitle: string;
  description: string;
  ctaText?: string;
  ctaLink?: string;
  keywords?: string[];
  breadcrumbItems?: { label: string; href?: string }[];
}

export const InternationalHero = ({
  title,
  subtitle,
  description,
  ctaText = "Start Your Placement",
  ctaLink = "/international/apply",
  keywords = [],
  breadcrumbItems,
}: InternationalHeroProps) => {
  return (
    <section className="relative overflow-hidden bg-primary py-10 md:py-14 lg:py-16">

      <div className="container relative mx-auto px-4">
        {breadcrumbItems && (
          <BreadcrumbNav className="mb-6" variant="dark" items={breadcrumbItems} />
        )}

        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 px-4 py-1.5 rounded-full text-sm font-medium mb-5 backdrop-blur-sm">
            <Globe className="h-4 w-4" />
            <span>Serving International Clients from 50+ Countries</span>
          </div>

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight tracking-tight">
            {title}
          </h1>

          <p className="text-lg md:text-xl text-accent font-semibold mb-3">
            {subtitle}
          </p>

          <p className="text-base md:text-lg text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>

          <div className="flex flex-wrap justify-center gap-5 md:gap-8 mb-10">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-accent" />
              <span className="text-white/85">1,000+ Vetted Facilities</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-accent" />
              <span className="text-white/85">24-Hour Response</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-accent" />
              <span className="text-white/85">100% Confidential</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-base px-8 py-6 shadow-lg shadow-accent/25"
            >
              <Link to={ctaLink}>{ctaText}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-base px-8 py-6 border-white/30 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm"
            >
              <Link to="/international">Learn About Our Process</Link>
            </Button>
          </div>

          {keywords.length > 0 && (
            <div className="mt-10 flex flex-wrap justify-center gap-2">
              {keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-white/10 text-white/70 text-xs rounded-full"
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
