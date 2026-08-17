import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Globe, Search, Building2, ExternalLink } from "lucide-react";
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
      <div className="container relative z-10 mx-auto px-4 py-8 md:py-12">
        {breadcrumbItems && (
          <BreadcrumbNav className="mb-4 [&_*]:!text-white/70 [&_a:hover]:!text-white" variant="dark" items={breadcrumbItems} />
        )}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90 ring-1 ring-white/15">
            <Globe className="h-3 w-3" />
            US treatment directory
          </div>
          <h1 className="mb-3 text-2xl font-bold leading-tight tracking-tight text-white md:text-4xl">{title}</h1>
          <p className="mb-2 text-sm font-semibold text-accent md:text-base">{subtitle}</p>
          <p className="mx-auto mb-6 max-w-2xl text-sm leading-7 text-white/80 md:text-base">{description}</p>

          <div className="mb-7 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-white/80">
            <span className="inline-flex items-center gap-2"><Search className="h-4 w-4 text-accent" />Search US facilities</span>
            <span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4 text-accent" />Review facility information</span>
            <span className="inline-flex items-center gap-2"><ExternalLink className="h-4 w-4 text-accent" />Contact providers directly</span>
          </div>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-accent px-8 text-accent-foreground hover:bg-accent/90">
              <Link to={ctaLink}>{ctaText}</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/30 bg-transparent px-8 text-white hover:bg-white/10 hover:text-white">
              <Link to="/international">International treatment information</Link>
            </Button>
          </div>

          {keywords.length > 0 && (
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {keywords.map((keyword) => (
                <span key={keyword} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">{keyword}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
