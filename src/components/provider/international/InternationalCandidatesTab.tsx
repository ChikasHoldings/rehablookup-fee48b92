import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Globe,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Loader2,
  Sparkles,
  MapPin,
} from "lucide-react";

interface InternationalMatch {
  id: string;
  case_id: string;
  facility_id: string;
  provider_id: string;
  status: string;
  invited_at: string;
  responded_at: string | null;
  provider_notes: string | null;
  international_placement_cases: {
    id: string;
    client_country: string;
    intake_data: Record<string, unknown>;
    priority: string | null;
    created_at: string;
  };
}

const URGENCY_COLORS: Record<string, string> = {
  immediate: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  within_week: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  within_month: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  flexible: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const BUDGET_LABELS: Record<string, string> = {
  "10k-25k": "$10K - $25K/month",
  "25k-50k": "$25K - $50K/month",
  "50k-100k": "$50K - $100K/month",
  "100k+": "$100K+/month",
};

export function InternationalCandidatesTab() {
  const queryClient = useQueryClient();
  const { selectedFacility } = useSelectedFacility();
  const [selectedMatch, setSelectedMatch] = useState<InternationalMatch | null>(null);
  const [responseNotes, setResponseNotes] = useState("");
  const [responseAction, setResponseAction] = useState<"accepted" | "declined" | null>(null);

  // Fetch international case matches for this facility
  const { data: matches, isLoading } = useQuery({
    queryKey: ["international-matches", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data, error } = await supabase
        .from("international_case_facility_matches")
        .select(`
          *,
          international_placement_cases (
            id, client_country, intake_data, priority, created_at
          )
        `)
        .eq("facility_id", selectedFacility.id)
        .order("invited_at", { ascending: false });

      if (error) throw error;
      return (data as unknown as InternationalMatch[]) || [];
    },
    enabled: !!selectedFacility?.id,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ matchId, response, notes }: { matchId: string; response: string; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke("respond-international-case", {
        body: { action: "respond", matchId, data: { response, notes } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["international-matches"] });
      toast.success(responseAction === "accepted" ? "Interest submitted!" : "Response recorded");
      setSelectedMatch(null);
      setResponseNotes("");
      setResponseAction(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to respond");
    },
  });

  const handleRespond = () => {
    if (!selectedMatch || !responseAction) return;
    respondMutation.mutate({
      matchId: selectedMatch.id,
      response: responseAction,
      notes: responseNotes,
    });
  };

  const pendingMatches = matches?.filter((m) => m.status === "invited") || [];
  const respondedMatches = matches?.filter((m) => m.status !== "invited") || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Invitations */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          International Placement Candidates
          {pendingMatches.length > 0 && (
            <Badge variant="destructive">{pendingMatches.length} pending</Badge>
          )}
        </h3>

        {pendingMatches.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No pending international candidates</p>
              <p className="text-sm text-muted-foreground mt-1">
                When international clients are matched to your facility, they'll appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingMatches.map((match) => (
              <CandidateCard
                key={match.id}
                match={match}
                onRespond={() => setSelectedMatch(match)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Past Responses */}
      {respondedMatches.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-muted-foreground">Past Responses</h3>
          <div className="grid gap-3">
            {respondedMatches.map((match) => (
              <Card key={match.id} className="bg-muted/30">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={match.status === "accepted" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {match.status === "accepted" ? (
                          <><CheckCircle className="h-3 w-3 mr-1" /> Interested</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" /> Declined</>
                        )}
                      </Badge>
                      <span className="text-sm">
                        {match.international_placement_cases?.client_country} •{" "}
                        {(match.international_placement_cases?.intake_data?.primary_concern as string) || "Treatment"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {match.responded_at && format(new Date(match.responded_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Response Dialog */}
      <Dialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              International Candidate
            </DialogTitle>
            <DialogDescription>
              Review this anonymized candidate profile and indicate your interest.
            </DialogDescription>
          </DialogHeader>

          {selectedMatch && (
            <div className="space-y-4">
              {/* Anonymized Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Country:</span>
                  <span>{selectedMatch.international_placement_cases?.client_country}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Budget:</span>
                  <span>
                    {BUDGET_LABELS[
                      selectedMatch.international_placement_cases?.intake_data?.budget_range as string
                    ] || "Not specified"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Urgency:</span>
                  <Badge
                    className={
                      URGENCY_COLORS[
                        selectedMatch.international_placement_cases?.intake_data?.urgency as string
                      ] || "bg-gray-100"
                    }
                    variant="outline"
                  >
                    {(selectedMatch.international_placement_cases?.intake_data?.urgency as string)?.replace(
                      "_",
                      " "
                    ) || "Flexible"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Primary Concern:</span>
                  <span>
                    {(selectedMatch.international_placement_cases?.intake_data?.primary_concern as string) ||
                      "Substance Use"}
                  </span>
                </div>
                {selectedMatch.international_placement_cases?.intake_data?.rehab_style && (
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Preference:</span>
                    <span className="capitalize">
                      {(selectedMatch.international_placement_cases?.intake_data?.rehab_style as string)?.replace(
                        "_",
                        " "
                      )}
                    </span>
                  </div>
                )}
                {selectedMatch.international_placement_cases?.intake_data?.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      {selectedMatch.international_placement_cases?.intake_data?.notes as string}
                    </p>
                  </div>
                )}
              </div>

              {/* Facility Fee Notice */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-400">
                      $4,500 Placement Fee
                    </p>
                    <p className="text-amber-700 dark:text-amber-500">
                      A placement fee is charged only if the client is admitted to your facility.
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label>Notes (optional)</Label>
                <Textarea
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Add any notes about availability, questions, or concerns..."
                  className="mt-1.5"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setResponseAction("declined");
                handleRespond();
              }}
              disabled={respondMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Not a Fit
            </Button>
            <Button
              onClick={() => {
                setResponseAction("accepted");
                handleRespond();
              }}
              disabled={respondMutation.isPending}
            >
              {respondMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1.5" />
              )}
              I'm Interested
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CandidateCard({
  match,
  onRespond,
}: {
  match: InternationalMatch;
  onRespond: () => void;
}) {
  const intakeData = match.international_placement_cases?.intake_data || {};

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {match.international_placement_cases?.client_country}
              {match.international_placement_cases?.priority === "vip" && (
                <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
                  <Sparkles className="h-3 w-3 mr-1" /> VIP
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Invited {format(new Date(match.invited_at), "MMM d, yyyy")}
            </CardDescription>
          </div>
          <Badge
            className={URGENCY_COLORS[(intakeData.urgency as string)] || "bg-gray-100"}
            variant="outline"
          >
            {(intakeData.urgency as string)?.replace("_", " ") || "Flexible"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>{BUDGET_LABELS[(intakeData.budget_range as string)] || "Not specified"}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{(intakeData.primary_concern as string) || "Substance Use"}</span>
          </div>
        </div>
        {intakeData.rehab_style && (
          <div className="text-sm text-muted-foreground">
            <span className="capitalize">{(intakeData.rehab_style as string)?.replace("_", " ")}</span>{" "}
            environment preferred
          </div>
        )}
        <Button onClick={onRespond} className="w-full mt-2">
          Review & Respond
        </Button>
      </CardContent>
    </Card>
  );
}
