import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Phone } from "lucide-react";

interface InternationalPageHeroProps {
  flag: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  trustPoints: string[];
  heroImage: string;
  heroAlt: string;
}

export const InternationalPageHero = ({
  flag,
  badge,
  title,
  subtitle,
  description,
  trustPoints,
  heroImage,
  heroAlt,
}: InternationalPageHeroProps) => {
  return (
    <section className="relative overflow-hidden bg-background">
      {/* Hero image background */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt={heroAlt}
          className="w-full h-full object-cover"
          width={1280}
          height={512}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <div className="container relative mx-auto px-4 py-10 md:py-14 lg:py-16">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left: Content */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-5">
              <span className="text-base">{flag}</span>
              <span>{badge}</span>
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 leading-tight tracking-tight">
              {title}
            </h1>

            <p className="text-lg text-primary font-semibold mb-3">
              {subtitle}
            </p>

            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
              {description}
            </p>

            {/* Trust signals */}
            <div className="flex flex-wrap gap-x-5 gap-y-2 mb-8">
              {trustPoints.map((t) => (
                <div key={t} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">{t}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-base px-7 py-6"
              >
                <Link to="/international/apply" className="flex items-center gap-2">
                  Apply for Treatment
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="text-base px-7 py-6 border-border bg-background/80 backdrop-blur-sm"
              >
                <Link to="/concierge" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Speak to an Advisor
                </Link>
              </Button>
            </div>
          </div>

          {/* Right: Image peek-through on large screens */}
          <div className="hidden lg:block" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
};
