import { useState } from "react";
import { 
  Network, 
  Users, 
  Check,
  ArrowRight,
  MessageSquare,
  Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { toast } from "sonner";

const PLACEMENT_BENEFITS = [
  "Receive matched inquiries from our placement team",
  "Families pre-screened for treatment readiness",
  "Higher conversion rates from qualified referrals",
  "Same unlock pricing applies",
];

export default function ProviderPlacementNetworkPage() {
  const { selectedFacility } = useSelectedFacility();
  const [optedIn, setOptedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleOptIn = async (enabled: boolean) => {
    setIsLoading(true);
    // TODO: Save opt-in preference to database
    setTimeout(() => {
      setOptedIn(enabled);
      setIsLoading(false);
      toast.success(enabled 
        ? "You're now part of the Placement Network!" 
        : "You've opted out of the Placement Network"
      );
    }, 500);
  };

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 mb-4">
            <Network className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Placement Network</h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Receive matched inquiries from families working with our placement specialists
          </p>
        </div>

        {/* Opt-in Card */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Placement Network</h3>
                  <p className="text-sm text-muted-foreground">
                    {optedIn 
                      ? "You're receiving placement referrals" 
                      : "Opt in to receive matched inquiries"
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {optedIn && (
                  <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                )}
                <Switch
                  checked={optedIn}
                  onCheckedChange={handleOptIn}
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How it Works */}
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">How it Works</h2>
          <div className="grid gap-4">
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                  1
                </div>
                <div>
                  <h3 className="font-medium">Families Request Help</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Families submit detailed intake forms through our placement service
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                  2
                </div>
                <div>
                  <h3 className="font-medium">We Match to Your Facility</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Our team reviews cases and matches families to facilities that fit their needs
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                  3
                </div>
                <div>
                  <h3 className="font-medium">Unlock to Connect</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Review matched inquiries and unlock to get contact details and respond
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              Network Benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {PLACEMENT_BENEFITS.map((benefit, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* CTA for non-opted */}
        {!optedIn && (
          <div className="mt-8 text-center">
            <Button 
              size="lg" 
              className="gap-2"
              onClick={() => handleOptIn(true)}
              disabled={isLoading}
            >
              <Network className="h-4 w-4" />
              Join Placement Network
              <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              No additional cost. Standard unlock pricing applies.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
