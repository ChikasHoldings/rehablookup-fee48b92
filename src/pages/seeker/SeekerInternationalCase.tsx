import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSeekerSession } from "@/hooks/useSeekerSession";
import { AuthPrompt } from "@/components/seeker/AuthPrompt";
import { 
  Globe, 
  Clock, 
  CheckCircle, 
  Search, 
  Mail, 
  Building2,
  Loader2,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

interface PlacementCase {
  id: string;
  status: string;
  client_name: string;
  client_country: string;
  preferred_language: string;
  intake_data: Json;
  created_at: string;
  updated_at: string;
  intake_submitted_at: string | null;
  accepted_facility_id: string | null;
  matched_facility_ids: string[] | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  "new": { label: "New", color: "bg-blue-100 text-blue-800", icon: <Clock className="h-4 w-4" /> },
  "in_review": { label: "In Review", color: "bg-yellow-100 text-yellow-800", icon: <Search className="h-4 w-4" /> },
  "matching": { label: "Placing", color: "bg-purple-100 text-purple-800", icon: <Search className="h-4 w-4" /> },
  "introductions_sent": { label: "Introductions Sent", color: "bg-indigo-100 text-indigo-800", icon: <Mail className="h-4 w-4" /> },
  "facility_accepted": { label: "Facility Accepted", color: "bg-green-100 text-green-800", icon: <Building2 className="h-4 w-4" /> },
  "admitted": { label: "Admitted", color: "bg-green-100 text-green-800", icon: <CheckCircle className="h-4 w-4" /> },
  "closed_no_fit": { label: "Closed - No Fit", color: "bg-gray-100 text-gray-800", icon: <Clock className="h-4 w-4" /> },
  "closed_withdrew": { label: "Closed - Withdrew", color: "bg-gray-100 text-gray-800", icon: <Clock className="h-4 w-4" /> },
};

export default function SeekerInternationalCase() {
  const { userId: currentUserId, isReady, isAuthenticated } = useSeekerSession();

  const user = isReady && currentUserId ? { id: currentUserId } : null;

  const { data: placementCase, isLoading, isError, refetch } = useQuery({
    queryKey: ["seeker-international-case", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("international_placement_cases")
        .select("id, status, client_name, client_country, preferred_language, intake_data, created_at, updated_at, intake_submitted_at, accepted_facility_id, matched_facility_ids")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PlacementCase | null;
    },
    enabled: !!user?.id,
  });

  if (isReady && !isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <AuthPrompt
          title="Sign in to access international placement"
          description="Create a free account to start your international placement case."
          icon="lock"
          returnTo="/account/international"
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">International Placement</h1>
          <p className="text-muted-foreground">Get placed into top US treatment facilities</p>
        </div>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-12 text-center">
            <Globe className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-1">Unable to load your placement case</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This may be a temporary issue. Please try again.
            </p>
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <ArrowRight className="h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!placementCase) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">International Placement</h1>
          <p className="text-muted-foreground">Get placed into top US treatment facilities</p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Active Placement Case</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Our international placement service helps clients from outside the US access 
              premier American treatment facilities with personalized guidance.
            </p>
            <Button asChild>
              <Link to="/international">
                Start International Placement
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[placementCase.status] || STATUS_CONFIG["new"];
  const intakeData = (typeof placementCase.intake_data === 'object' && placementCase.intake_data !== null) 
    ? placementCase.intake_data as Record<string, string>
    : {};

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">International Placement</h1>
        <p className="text-muted-foreground">Track your placement case status</p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Your Placement Case
            </CardTitle>
            <Badge className={statusConfig.color}>
              {statusConfig.icon}
              <span className="ml-1">{statusConfig.label}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timeline */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Case Timeline
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm">
                  Case created: {format(new Date(placementCase.created_at), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
              {placementCase.intake_submitted_at && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm">
                    Intake submitted: {format(new Date(placementCase.intake_submitted_at), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              )}
              {placementCase.matched_facility_ids && placementCase.matched_facility_ids.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm">
                    Connected with {placementCase.matched_facility_ids.length} facilities
                  </span>
                </div>
              )}
              {placementCase.accepted_facility_id && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm">Facility confirmed admission</span>
                </div>
              )}
            </div>
          </div>

          {/* Case Details */}
          <div className="grid sm:grid-cols-2 gap-4">
            {placementCase.client_country && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Country</p>
                <p className="font-medium">{placementCase.client_country}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Preferred Language</p>
              <p className="font-medium">{placementCase.preferred_language || "English"}</p>
            </div>
            {intakeData.primaryConcern && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Primary Concern</p>
                <p className="font-medium">{intakeData.primaryConcern}</p>
              </div>
            )}
            {intakeData.urgency && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Timeline</p>
                <p className="font-medium capitalize">{String(intakeData.urgency).replace(/-/g, " ")}</p>
              </div>
            )}
            {intakeData.budgetRange && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Budget Range</p>
                <p className="font-medium capitalize">{String(intakeData.budgetRange).replace(/-/g, " ")}</p>
              </div>
            )}
            {intakeData.rehabStyle && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Preferred Style</p>
                <p className="font-medium capitalize">{String(intakeData.rehabStyle).replace(/-/g, " ")}</p>
              </div>
            )}
          </div>

          {/* What's Next */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">What Happens Next</h3>
            <p className="text-sm text-muted-foreground">
              {placementCase.status === "in_review" && (
                "Your dedicated placement advisor is reviewing your intake and will reach out within 24 hours to discuss options."
              )}
              {placementCase.status === "matching" && (
                "We're coordinating placement with the best US treatment facilities based on your needs and preferences."
              )}
              {placementCase.status === "introductions_sent" && (
                "We've sent your profile to selected facilities. You'll hear back with availability and next steps soon."
              )}
              {placementCase.status === "facility_accepted" && (
                "Great news! A facility has accepted your case. Your advisor will contact you to finalize admission details."
              )}
              {placementCase.status === "admitted" && (
                "Congratulations! Your admission is confirmed. Your advisor will help coordinate travel and arrival details."
              )}
              {(placementCase.status === "new" || !placementCase.status) && (
                "Your case has been received. Our team will begin reviewing your information shortly."
              )}
            </p>
          </div>

          {/* Contact */}
          <div className="bg-primary/5 rounded-lg p-4">
            <h3 className="font-medium mb-2">Questions?</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Contact our international placement team:
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a 
                href="mailto:international@rehablookup.com" 
                className="text-sm text-primary hover:underline flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                international@rehablookup.com
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}