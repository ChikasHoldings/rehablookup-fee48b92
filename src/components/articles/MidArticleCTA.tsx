import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, ArrowRight, Phone } from "lucide-react";

interface MidArticleCTAProps {
  source?: string;
}

export function MidArticleCTA({ source = "article_mid" }: MidArticleCTAProps) {
  return (
    <div className="my-8 rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5 border border-primary/20 p-5 md:p-6 relative overflow-hidden">
      {/* Subtle decorative accent */}
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-accent rounded-l-xl" />
      
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Icon */}
        <div className="shrink-0">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/20">
            <Heart className="h-5 w-5 text-white" />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-display text-base font-semibold text-foreground mb-1">
            Need Help Finding Treatment?
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our specialists can help you find the right rehab center for your needs.
          </p>
        </div>
        
        {/* CTA Button */}
        <div className="shrink-0 flex flex-col sm:flex-row gap-2">
          <Link to={`/request-help?source=${source}`}>
            <Button size="sm" className="w-full sm:w-auto gap-1.5 h-9 px-4 shadow-sm">
              <Phone className="h-3.5 w-3.5" />
              Get Help Now
            </Button>
          </Link>
          <Link to="/rehab-centers" className="hidden sm:block">
            <Button size="sm" variant="ghost" className="gap-1.5 h-9 px-3 text-muted-foreground hover:text-foreground">
              Browse Centers
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
