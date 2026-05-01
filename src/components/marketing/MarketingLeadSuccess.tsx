import { useState, useEffect } from "react";
import { CheckCircle2, MapPin, Building2, ArrowRight, Sparkles, Phone, Heart, Clock, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

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
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleRequestInfo = async (facilityId: string, facilityName: string) => {
    if (requestedFacilities.has(facilityId)) return;
    setLoadingFacility(facilityId);
    
    try {
      const { data, error } = await supabase.functions.invoke("request-facility-from-marketing", {
        body: { marketingLeadId: leadId, facilityId },
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
    return type?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Treatment Center";
  };

  const requestedCount = requestedFacilities.size;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/50 via-background to-muted/30">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-border/30 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary shrink-0" />
            <span className="text-base font-bold text-foreground">RehabLookup</span>
          </div>
          <a
            href="tel:1-800-662-4357"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary"
          >
            <Phone className="h-3.5 w-3.5" />
            <span className="underline">1-800-662-4357</span>
          </a>
        </div>
      </header>

      {/* Success Hero */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-green-600 to-teal-600 text-white py-10 md:py-14"
      >
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 className="h-10 w-10 text-white" />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
            {matchedFacilities.length > 0
              ? "We Found Treatment Options for You!"
              : "Your Request Has Been Received!"}
          </h1>
          <p className="text-base sm:text-lg text-white/90 max-w-xl mx-auto">
            {matchedFacilities.length > 0
              ? `We found ${matchedFacilities.length} verified treatment center${matchedFacilities.length > 1 ? "s" : ""} near you. Click "Connect Now" to get in touch.`
              : "Our team is reviewing your information and will email you with personalized options within 24 hours."}
          </p>
        </div>
      </motion.div>

      {/* What Happens Next — always visible */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-xl border border-border/30 shadow-sm p-5 sm:p-6 mb-8">
          <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            What Happens Next
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { step: "1", title: "We Review Your Info", desc: "Our team matches you with programs that accept your insurance and fit your needs.", time: "Now" },
              { step: "2", title: "Facilities Reach Out", desc: "Matched centers will contact you at your preferred time — no pressure, no spam.", time: "Within 24hrs" },
              { step: "3", title: "You Choose", desc: "Compare options, ask questions, and pick the program that feels right.", time: "At your pace" },
            ].map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{item.step}</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{item.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                  <div className="text-xs font-medium text-primary mt-1">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Matched Facilities Grid */}
        {matchedFacilities.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                Your Matched Centers
              </h2>
              {requestedCount > 0 && (
                <span className="text-xs sm:text-sm font-medium text-green-700 bg-green-100 px-3 py-1 rounded-full tabular-nums">
                  {requestedCount} connected
                </span>
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {matchedFacilities.map((facility, index) => {
                const isRequested = requestedFacilities.has(facility.id);
                const isLoading = loadingFacility === facility.id;

                return (
                  <motion.div
                    key={facility.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index, duration: 0.3 }}
                  >
                    <Card className={`overflow-hidden transition-all h-full ${
                      isRequested
                        ? "border-green-300 bg-green-50/50"
                        : "hover:shadow-lg hover:border-primary/30"
                    }`}>
                      <CardContent className="p-5 flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-3">
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
                            <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2">
                              {facility.name}
                            </h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {facility.city}, {facility.state}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                            {formatFacilityType(facility.facilityType)}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Shield className="h-3 w-3 text-primary" />
                            Verified
                          </span>
                        </div>

                        <div className="mt-auto">
                          {isRequested ? (
                            <div className="flex items-center gap-2 text-green-700 bg-green-100 rounded-lg px-3 py-2.5 text-sm font-medium justify-center">
                              <CheckCircle2 className="h-4 w-4" />
                              Connected — They'll Reach Out
                            </div>
                          ) : (
                            <Button
                              className="w-full shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                              onClick={() => handleRequestInfo(facility.id, facility.name)}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                "Connecting..."
                              ) : (
                                <>
                                  Connect Now
                                  <ArrowRight className="h-4 w-4 ml-2" />
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Concierge Upsell */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 rounded-2xl p-6 md:p-8 text-center"
        >
          <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-6 w-6 text-violet-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-violet-900 mb-2">
            Want a Dedicated Placement Advisor?
          </h2>
          <p className="text-sm sm:text-base text-violet-700 mb-5 max-w-xl mx-auto">
            Our Concierge team handles everything — insurance verification, facility introductions, and personalized matching — so you don't have to navigate this alone.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button
              asChild
              size="lg"
              className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Link to="/concierge">
                Get Expert Help — Free
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <span className="text-xs text-violet-600">No fee for clients • Personalized placement</span>
          </div>
        </motion.div>

        {/* Emergency Notice */}
        <div className="mt-10 text-center pb-8">
          <p className="text-sm text-muted-foreground">
            <Phone className="h-4 w-4 inline mr-1" />
            In crisis? Call SAMHSA:{" "}
            <a href="tel:1-800-662-4357" className="text-primary font-medium underline">
              1-800-662-4357
            </a>{" "}
            (Free, Confidential, 24/7)
          </p>
        </div>
      </div>
    </div>
  );
}
