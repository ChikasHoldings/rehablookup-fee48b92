import { Star, Quote, Building2, Heart, User } from "lucide-react";
import type { Testimonial } from "@/data/testimonials";

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
  title?: string;
  subtitle?: string;
  variant?: "default" | "compact";
  columns?: 2 | 3;
}

const roleConfig = {
  seeker: { icon: User, label: "Patient", color: "bg-accent/10 text-accent" },
  family: { icon: Heart, label: "Family Member", color: "bg-primary/10 text-primary" },
  provider: { icon: Building2, label: "Treatment Provider", color: "bg-emerald-500/10 text-emerald-600" },
};

export function TestimonialsSection({
  testimonials,
  title = "What People Say",
  subtitle = "Real experiences from families and providers",
  variant = "default",
  columns = 3,
}: TestimonialsSectionProps) {
  const gridCols = columns === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3";

  return (
    <section className="py-10 md:py-12 lg:py-20 bg-muted/30 border-y border-border/50">
      <div className="container px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 md:mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium mb-3">
            <Star className="h-3 w-3 fill-current" />
            Trusted by thousands
          </div>
          <h2 className="font-display text-xl md:text-2xl font-bold text-foreground lg:text-3xl">
            {title}
          </h2>
          <p className="mt-1.5 md:mt-2 text-[15px] md:text-base text-muted-foreground max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Testimonial Cards */}
        <div className={`flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 ${gridCols} md:gap-5 -mx-4 px-4 sm:mx-0 sm:px-0`}>
          {testimonials.map((testimonial, idx) => {
            const config = roleConfig[testimonial.role];
            const RoleIcon = config.icon;

            return (
              <div
                key={`${testimonial.name}-${idx}`}
                className="flex-shrink-0 w-[300px] sm:w-auto snap-center rounded-xl border border-border bg-card p-5 md:p-6 transition-all hover:shadow-lg hover:border-primary/20 flex flex-col"
              >
                {/* Quote icon */}
                <Quote className="h-5 w-5 text-primary/20 mb-3 flex-shrink-0" />

                {/* Rating */}
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>

                {/* Quote text */}
                <blockquote className="mb-4 flex-1">
                  <p className="text-sm md:text-[15px] text-foreground leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.color} text-sm font-semibold flex-shrink-0`}>
                    {testimonial.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{testimonial.context || testimonial.location}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <RoleIcon className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground font-medium">{config.label} · {testimonial.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile scroll indicator */}
        <div className="flex justify-center gap-1.5 mt-3 sm:hidden">
          {testimonials.map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/30" />
          ))}
        </div>
      </div>
    </section>
  );
}
