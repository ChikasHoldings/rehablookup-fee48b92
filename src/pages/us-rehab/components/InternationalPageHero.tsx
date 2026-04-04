import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Phone } from "lucide-react";
import { motion } from "framer-motion";

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
    <section className="relative overflow-hidden bg-primary">
      {/* Hero image background */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt={heroAlt}
          className="w-full h-full object-cover object-center"
          width={1280}
          height={512}
          fetchPriority="high"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-black/70" />
      </div>

      <div className="container relative mx-auto px-4 py-10 md:py-14 lg:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 px-4 py-1.5 rounded-full text-sm font-medium mb-5 backdrop-blur-sm">
            <span className="text-base">{flag}</span>
            <span>{badge}</span>
          </div>

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight tracking-tight">
            {title}
          </h1>

          <p className="text-lg text-accent font-semibold mb-3">
            {subtitle}
          </p>

          <p className="text-base text-white/80 mb-6 leading-relaxed">
            {description}
          </p>

          {/* Trust signals */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 mb-8">
            {trustPoints.map((t) => (
              <div key={t} className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-accent shrink-0" />
                <span className="text-white/85">{t}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-base px-7 py-6 shadow-lg shadow-accent/25"
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
              className="text-base px-7 py-6 border-white/30 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm"
            >
              <Link to="/concierge" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Speak to an Advisor
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
