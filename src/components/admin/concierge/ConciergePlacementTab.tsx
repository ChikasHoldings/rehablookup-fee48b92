import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Play, RefreshCw, MapPin, Building2, CreditCard, CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface MatchScore {
  facilityId: string;
  score?: number;
  totalScore?: number;
  factors: {
    location: number;
    careType: number;
    insurance: number;
    availability?: number;
    gender?: number;
    age?: number;
  };
}

interface ConciergePlacementTabProps {
  caseData: ConciergeInquiry;
  onRefresh: () => void;
}

export function ConciergePlacementTab({ caseData, onRefresh }: ConciergePlacementTabProps) {
  const [isRunning, setIsRunning] = useState(false);

  // Merge both matched lists for complete facility coverage
  const allMatchedFacilityIds = [
    ...new Set([
      ...(caseData.matched_facility_ids || []),
      ...(caseData.admin_matched_facility_ids || []),
    ])
  ];

  // Fetch placement facilities details
  const { data: placementFacilities, isLoading: loadingFacilities } = useQuery({
    queryKey: ["placement-facilities", allMatchedFacilityIds],
    queryFn: async () => {
      if (allMatchedFacilityIds.length === 0) {
        return [];
      }
      
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, city, state, facility_type, concierge_availability_status")
        .in("id", allMatchedFacilityIds);
      
      if (error) throw error;
      return data;
    },
    enabled: allMatchedFacilityIds.length > 0,
  });

  const runPlacementMutation = useMutation({
    mutationFn: async () => {
      setIsRunning(true);
      const { data, error } = await supabase.functions.invoke("match-concierge-intake", {
        body: { inquiryId: caseData.id },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Found ${data.matchCount || 0} placement options`);
      onRefresh();
      setIsRunning(false);
    },
    onError: (error) => {
      toast.error("Placement search failed: " + error.message);
      setIsRunning(false);
    },
  });

  const placementScores = (caseData.match_scores as unknown as MatchScore[] | null) || [];

  const getScoreForFacility = (facilityId: string): MatchScore | undefined => {
    return placementScores.find((s) => s.facilityId === facilityId);
  };

  return (
    <div className="space-y-4">
      {/* Run Placement Button */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Treatment Placement Engine</h3>
              <p className="text-sm text-muted-foreground">
                {caseData.matched_at
                  ? `Last run: ${new Date(caseData.matched_at).toLocaleString()}`
                  : "Not yet run"}
              </p>
            </div>
            <Button
              onClick={() => runPlacementMutation.mutate()}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Placing...
                </>
              ) : caseData.matched_at ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-run Placement
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Placement
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Placement Options */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Placement Options ({placementFacilities?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          {loadingFacilities ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : !placementFacilities?.length ? (
            <div className="text-center py-4 text-muted-foreground">
              No options yet. Run the placement engine to find suitable facilities.
            </div>
          ) : (
            <div className="space-y-3">
              {placementFacilities.map((facility, index) => {
                const score = getScoreForFacility(facility.id);
                const totalScore = score?.score || score?.totalScore || 0;
                
                return (
                  <div
                    key={facility.id}
                    className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg text-primary">#{index + 1}</span>
                          <h4 className="font-medium">{facility.name}</h4>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          {facility.city}, {facility.state}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {facility.facility_type}
                          </Badge>
                          <Badge
                            variant={
                              facility.concierge_availability_status === "open"
                                ? "default"
                                : facility.concierge_availability_status === "limited"
                                ? "secondary"
                                : "destructive"
                            }
                            className="text-xs"
                          >
                            {facility.concierge_availability_status || "Unknown"}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{totalScore}</div>
                        <div className="text-xs text-muted-foreground">/ 100</div>
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    {score?.factors && (
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <ScoreFactor label="Location" score={score.factors.location} max={35} />
                        <ScoreFactor label="Care Type" score={score.factors.careType} max={30} />
                        <ScoreFactor label="Insurance" score={score.factors.insurance} max={25} />
                        <ScoreFactor label="Availability" score={score.factors.availability || 0} max={10} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Placement Criteria Summary */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Placement Criteria Used</CardTitle>
        </CardHeader>
        <CardContent className="py-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <CriteriaItem
              label="Location"
              value={caseData.desired_location_state || caseData.preferred_state}
              matched={!!caseData.desired_location_state || !!caseData.preferred_state}
            />
            <CriteriaItem
              label="Level of Care"
              value={caseData.level_of_care}
              matched={!!caseData.level_of_care}
            />
            <CriteriaItem
              label="Payment Type"
              value={caseData.payment_type}
              matched={!!caseData.payment_type}
            />
            <CriteriaItem
              label="Insurance"
              value={caseData.insurance_carrier}
              matched={!!caseData.insurance_carrier}
            />
            <CriteriaItem
              label="Gender"
              value={caseData.gender}
              matched={!!caseData.gender}
            />
            <CriteriaItem
              label="Age Range"
              value={caseData.age_range}
              matched={!!caseData.age_range}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreFactor({ label, score, max }: { label: string; score: number; max: number }) {
  const percentage = (score / max) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{score}/{max}</span>
      </div>
      <Progress value={percentage} className="h-1.5" />
    </div>
  );
}

function CriteriaItem({ label, value, matched }: { label: string; value?: string | null; matched: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {matched ? (
        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      )}
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium truncate">{value || "—"}</span>
    </div>
  );
}
