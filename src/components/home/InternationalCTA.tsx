import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Globe, ArrowRight, CheckCircle, Shield, Clock, Plane } from "lucide-react";

export function InternationalCTA() {
  return (
    <section className="py-10 md:py-12 lg:py-16 bg-gradient-to-br from-primary/5 via-background to-accent/5 border-y border-border/50 overflow-hidden">
      <div className="container px-4 md:px-6 lg:px-8">
        <div className="relative rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
          
          <div className="relative p-5 md:p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 lg:gap-10">
              {/* Left Content */}
              <div className="flex-1 text-center lg:text-left">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1.5 mb-4">
                  <Globe className="h-3.5 w-3.5 text-accent" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                    International Patients
                  </span>
                </div>
                
                <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-2 md:mb-3">
                  Seeking Treatment in the USA?
                </h2>
                
                <p className="text-[15px] md:text-base text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-5 md:mb-6">
                  Access world-class addiction treatment facilities in America. We specialize in helping international clients navigate the U.S. healthcare system with personalized placement services.
                </p>
                
                {/* Trust signals */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-x-4 gap-y-2 mb-5 md:mb-6">
                  <div className="flex items-center gap-1.5 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-muted-foreground">50+ Countries Served</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">24h Response</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Shield className="h-4 w-4 text-accent" />
                    <span className="text-muted-foreground">100% Confidential</span>
                  </div>
                </div>
                
                {/* CTA Button */}
                <div className="flex justify-center lg:justify-start">
                  <Button
                    asChild
                    size="lg"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    <Link to="/international">
                      <Plane className="h-4 w-4" />
                      Find US Treatment
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              
              {/* Right Side - Premium stats card */}
              <div className="hidden lg:block shrink-0">
                <div className="grid grid-cols-2 gap-3 w-56">
                  <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center">
                    <div className="font-display text-2xl font-bold text-primary">50+</div>
                    <p className="text-xs text-muted-foreground mt-0.5">Countries</p>
                  </div>
                  <div className="rounded-xl bg-accent/10 border border-accent/20 p-4 text-center">
                    <div className="font-display text-2xl font-bold text-accent">200+</div>
                    <p className="text-xs text-muted-foreground mt-0.5">Facilities</p>
                  </div>
                  <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-center">
                    <div className="font-display text-2xl font-bold text-green-600">24h</div>
                    <p className="text-xs text-muted-foreground mt-0.5">Response</p>
                  </div>
                  <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 text-center">
                    <div className="font-display text-2xl font-bold text-blue-600">100%</div>
                    <p className="text-xs text-muted-foreground mt-0.5">Confidential</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
