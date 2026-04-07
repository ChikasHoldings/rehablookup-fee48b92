import { useEffect, useRef, useState, useCallback } from "react";
import { Star, Quote, Building2, Heart, User, ChevronLeft, ChevronRight } from "lucide-react";
import type { Testimonial } from "@/data/testimonials";

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
  title?: string;
  subtitle?: string;
}

const roleConfig = {
  seeker: { icon: User, label: "Patient" },
  family: { icon: Heart, label: "Family Member" },
  provider: { icon: Building2, label: "Treatment Provider" },
};

export function TestimonialsSection({
  testimonials,
  title = "What People Say",
  subtitle = "Real experiences from families and providers",
}: TestimonialsSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const autoScrollRef = useRef<ReturnType<typeof setInterval>>();

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  const scrollBy = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 340;
    el.scrollBy({ left: direction === "right" ? cardWidth : -cardWidth, behavior: "smooth" });
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (isPaused) return;
    autoScrollRef.current = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 2) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 340, behavior: "smooth" });
      }
    }, 4000);
    return () => clearInterval(autoScrollRef.current);
  }, [isPaused]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    checkScroll();
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll]);

  return (
    <section className="py-10 md:py-14 lg:py-20 bg-muted/30 border-y border-border/50 overflow-hidden">
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

        {/* Carousel wrapper */}
        <div
          className="relative group"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setTimeout(() => setIsPaused(false), 5000)}
        >
          {/* Left arrow */}
          <button
            onClick={() => scrollBy("left")}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/90 border border-border shadow-lg flex items-center justify-center transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:border-primary ${canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"} -translate-x-1 md:translate-x-0`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Right arrow */}
          <button
            onClick={() => scrollBy("right")}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/90 border border-border shadow-lg flex items-center justify-center transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:border-primary ${canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"} translate-x-1 md:translate-x-0`}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Edge fade */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 md:w-16 bg-gradient-to-r from-muted/30 to-transparent z-[5]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 md:w-16 bg-gradient-to-l from-muted/30 to-transparent z-[5]" />

          {/* Scrollable row */}
          <div
            ref={scrollRef}
            className="flex gap-4 md:gap-5 overflow-x-auto scrollbar-hide scroll-smooth px-2 md:px-8 py-2"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {testimonials.map((testimonial, idx) => {
              const config = roleConfig[testimonial.role];
              const RoleIcon = config.icon;

              return (
                <div
                  key={`${testimonial.name}-${idx}`}
                  className="flex-shrink-0 w-[300px] md:w-[340px] snap-center rounded-xl border border-border bg-card p-5 md:p-6 transition-all duration-300 hover:shadow-xl hover:border-primary/20 hover:-translate-y-1 flex flex-col"
                  style={{ scrollSnapAlign: "center" }}
                >
                  {/* Top: avatar + name + rating */}
                  <div className="flex items-start gap-3 mb-4">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      loading="lazy"
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/10 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{testimonial.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <RoleIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-[11px] text-muted-foreground font-medium truncate">{config.label}</span>
                      </div>
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-accent text-accent" />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quote */}
                  <blockquote className="mb-4 flex-1 relative">
                    <Quote className="absolute -top-1 -left-1 h-4 w-4 text-primary/15" />
                    <p className="text-sm text-foreground/90 leading-relaxed pl-4">
                      {testimonial.quote}
                    </p>
                  </blockquote>

                  {/* Footer */}
                  <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{testimonial.context}</span>
                    <span className="text-[11px] text-muted-foreground/70">{testimonial.location}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 mt-5">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                const el = scrollRef.current;
                if (el) el.scrollTo({ left: i * 340, behavior: "smooth" });
              }}
              className="w-2 h-2 rounded-full bg-primary/20 hover:bg-primary/50 transition-colors"
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
