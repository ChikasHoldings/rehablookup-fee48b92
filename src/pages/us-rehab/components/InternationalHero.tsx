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
  ctaText = "Search Treatment Centers",
  ctaLink = "/search-results",
  keywords = [],
  breadcrumbItems,
}: InternationalHeroProps) => {
  return (
    <section className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-slate-950 via-slate-900 to-primary/65">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.06),_transparent_55%)]" />

      <div className="container relative z-10 mx-auto px-4 py-6 md:py-9">
        {breadcrumbItems && (
          <BreadcrumbNav className="mb-3 [&_*]:!text-white/70 [&_a:hover]:!text-white" variant="dark" items={breadcrumbItems} />
        )}

        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm ring-1 ring-white/15">
            <Globe className="h-3 w-3" />
            International · 50+ Countries
          </div>

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 leading-tight tracking-tight font-display">
            {title}
          </h1>

          <p className="text-sm md:text-base text-accent font-semibold mb-2">
            {subtitle}
          </p>

          <p className="text-sm md:text-base text-white/80 mb-4 max-w-2xl mx-auto">
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
