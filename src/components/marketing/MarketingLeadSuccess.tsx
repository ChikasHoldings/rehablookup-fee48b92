import { useState } from "react";
import { CheckCircle2, MapPin, Building2, ArrowRight, Sparkles, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface MatchedFacility {
  id: string;
  name: string;
  city: string;
  state: string;
  logoUrl: string | null;
  facilityType: string;
}

interface MarketingLeadSuccessProps {
  leadId: string;
  matchedFacilities: MatchedFacility[];
}

export function MarketingLeadSuccess({ leadId, matchedFacilities }: MarketingLeadSuccessProps) {
  const { toast } = useToast();
  const [requestedFacilities, setRequestedFacilities] = useState<Set<string>>(new Set());
  const [loadingFacility, setLoadingFacility] = useState<string | null>(null);

  const handleRequestInfo = async (facilityId: string, facilityName: string) => {
    if (requestedFacilities.has(facilityId)) return;
    
    setLoadingFacility(facilityId);
    
    try {
      const { data, error } = await supabase.functions.invoke("request-facility-from-marketing", {
        body: {
          marketingLeadId: leadId,
          facilityId,
        },
      });

      if (error) throw error;

      setRequestedFacilities((prev) => new Set(prev).add(facilityId));
      
      toast({
        title: "Request sent!",
        description: `${facilityName} will contact you soon.`,
      });
    } catch (err) {
      console.error("Request failed:", err);
      toast({
        title: "Request failed",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoadingFacility(null);
    }
  };

  const formatFacilityType = (type: string) => {
    return type
      ?.replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()) || "Treatment Center";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/50 via-background to-muted/30">
      {/* Success Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            We Found Treatment Options for You!
          </h1>
          <p className="text-lg text-white/90 max-w-xl mx-auto">
            {matchedFacilities.length > 0
              ? `We matched you with ${matchedFacilities.length} treatment centers near you. Click "Request Info" to connect with any facility.`
              : "We're working on finding the best matches for you. Check your email for updates."}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Matched Facilities Grid */}
        {matchedFacilities.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-6 text-center">
              Your Matched Treatment Centers
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {matchedFacilities.map((facility) => {
                const isRequested = requestedFacilities.has(facility.id);
                const isLoading = loadingFacility === facility.id;

                return (
                  <Card
                    key={facility.id}
                    className={`overflow-hidden transition-all ${
                      isRequested
                        ? "border-green-300 bg-green-50/50"
                        : "hover:shadow-lg hover:border-primary/30"
                    }`}
                  >
                    <CardContent className="p-5">
                      {/* Logo / Initial */}
                      <div className="flex items-center gap-3 mb-4">
                        {facility.logoUrl ? (
                          <img
                            src={facility.logoUrl}
                            alt={facility.name}
                            className="w-12 h-12 rounded-lg object-cover bg-muted"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {facility.name}
                          </h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {facility.city}, {facility.state}
                          </p>
                        </div>
                      </div>

                      {/* Type Badge */}
                      <div className="mb-4">
                        <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                          {formatFacilityType(facility.facilityType)}
                        </span>
                      </div>

                      {/* Action Button */}
                      {isRequested ? (
                        <div className="flex items-center gap-2 text-green-700 bg-green-100 rounded-lg px-3 py-2 text-sm font-medium">
                          <CheckCircle2 className="h-4 w-4" />
                          Request Sent!
                        </div>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => handleRequestInfo(facility.id, facility.name)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            "Sending..."
                          ) : (
                            <>
                              Request Info
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Concierge Upsell */}
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 rounded-2xl p-6 md:p-8 text-center">
          <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-7 w-7 text-violet-600" />
          </div>
          <h2 className="text-2xl font-bold text-violet-900 mb-3">
            Want Personalized Help?
          </h2>
          <p className="text-violet-700 mb-6 max-w-xl mx-auto">
            Our Concierge team provides one-on-one matching, insurance verification, and direct introductions to programs — all for a one-time $29 fee.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Link to="/concierge">
                Get Expert Help — $29
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Emergency Notice */}
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            <Phone className="h-4 w-4 inline mr-1" />
            Need immediate help? Call SAMHSA:{" "}
            <a href="tel:1-800-662-4357" className="text-primary font-medium underline">
              1-800-662-4357
            </a>{" "}
            (Free, 24/7)
          </p>
        </div>
      </div>
    </div>
  );
}
