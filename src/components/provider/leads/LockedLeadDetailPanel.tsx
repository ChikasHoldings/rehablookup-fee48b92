import { Lock, Sparkles, TrendingUp, CheckCircle, Phone, Users, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface LockedLeadDetailPanelProps {
  totalLeadsCount: number;
  onClose: () => void;
}

export function LockedLeadDetailPanel({ totalLeadsCount, onClose }: LockedLeadDetailPanelProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm text-center space-y-6">
        {/* Lock Icon */}
        <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mx-auto">
          <Lock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
        </div>
        
        {/* Title */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Inquiry Details Locked
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Unlock with credits to view contact info
          </p>
        </div>

        {/* Waiting leads counter */}
        {totalLeadsCount > 0 && (
          <div className="py-4 px-6 rounded-xl bg-primary/5 border border-primary/20">
            <div className="text-4xl font-bold text-primary">
              {totalLeadsCount}
            </div>
            <p className="text-sm text-primary/80 font-medium">
              Inquir{totalLeadsCount !== 1 ? 'ies' : 'y'} waiting for you
            </p>
          </div>
        )}

        {/* What's hidden - compact */}
        <div className="space-y-2 text-left">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            What's Hidden
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50 text-sm">
              <Phone className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span className="text-muted-foreground">Direct phone number</span>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50 text-sm">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="text-muted-foreground">Verified email address</span>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50 text-sm">
              <Users className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <span className="text-muted-foreground">Treatment & insurance details</span>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-center gap-2 text-sm">
            <Badge className="bg-green-600 text-white border-0">
              <Coins className="h-3 w-3 mr-1" />
              Pay-per-unlock
            </Badge>
          </div>
          
          <ul className="space-y-1.5 text-left">
            {[
              "Only pay for inquiries you want",
              "Full contact details on unlock",
              "Pro members get 20% off",
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-4 py-3 text-xs text-muted-foreground">
          <span>Trusted by 500+ providers</span>
          <span className="flex items-center gap-1 text-primary font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            4x Avg. ROI
          </span>
        </div>

        {/* CTA */}
        <div className="space-y-2">
          <Button asChild size="default" className="w-full gap-2">
            <Link to="/provider/billing">
              <Coins className="h-4 w-4" />
              Get Credits
            </Link>
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  );
}
