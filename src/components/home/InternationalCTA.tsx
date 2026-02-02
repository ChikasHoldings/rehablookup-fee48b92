import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Globe, ArrowRight, CheckCircle, Shield, Clock, Plane } from "lucide-react";

export function InternationalCTA() {
  return (
    <section className="py-10 md:py-12 lg:py-16 bg-gradient-to-br from-primary/5 via-background to-accent/5 border-y border-border/50 overflow-hidden">
      <div className="container">
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
                
                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <Link to="/international">
                    <Button size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground gap-2 font-semibold shadow-md hover:shadow-lg transition-all">
                      <Plane className="h-4 w-4" />
                      Find US Treatment
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/international/apply">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2">
                      Start Application
                    </Button>
                  </Link>
                </div>
              </div>
              
              {/* Right Side - Countries served visual */}
              <div className="hidden lg:block shrink-0">
                <div className="relative w-64 h-48">
                  {/* Globe visualization with country flags */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border/50 flex items-center justify-center">
                    <div className="text-center">
                      <Globe className="h-12 w-12 text-primary/40 mx-auto mb-3" />
                      <div className="flex flex-wrap gap-1.5 justify-center max-w-[200px]">
                        {["🇬🇧", "🇦🇺", "🇦🇪", "🇨🇦", "🇩🇪", "🇫🇷", "🇳🇱", "🇮🇪", "🇲🇽", "🇧🇷", "🇸🇦", "🇮🇳"].map((flag, i) => (
                          <span 
                            key={i} 
                            className="text-lg opacity-70 hover:opacity-100 hover:scale-125 transition-all cursor-default"
                            title="Countries we serve"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">& 40+ more countries</p>
                    </div>
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
