import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  MapPin,
  DollarSign,
  Clock,
  Users,
  UserCheck,
  Bell,
  TrendingUp,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { IntroductionCard } from "./IntroductionCard";

interface DomesticCandidatesTabProps {
  hasPro?: boolean;
}

export function DomesticCandidatesTab({ hasPro = false }: DomesticCandidatesTabProps) {
  const queryClient = useQueryClient();
  const { selectedFacility } = useSelectedFacility();

  // Fetch pending introductions from concierge system
  const { data: introductions, isLoading } = useQuery({
    queryKey: ["placement-introductions", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data, error } = await supabase
        .from("concierge_introductions")
        .select(
          `
          *,
          concierge_inquiries (
            id, user_name, level_of_care, payment_type, timeline_urgency, preferred_state, status,
            seeker_confirmed, seeker_confirmed_at, placement_confirmed, placement_confirmed_at, placed_facility_id
          )
        `
        )
        .eq("facility_id", selectedFacility.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedFacility?.id,
  });

  // Respond to introduction mutation
  const respondMutation = useMutation({
    mutationFn: async ({ id, response, notes }: { id: string; response: string; notes?: string }) => {
      const { error } = await supabase
        .from("concierge_introductions")
        .update({
          provider_response: response,
          provider_responded_at: new Date().toISOString(),
          provider_notes: notes || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["placement-introductions"] });
      toast.success("Response submitted");
    },
    onError: () => {
      toast.error("Failed to submit response");
    },
  });

  const pendingIntroductions =
    introductions?.filter((i) => !i.provider_response || i.provider_response === "pending") || [];

  // Introductions where seeker confirmed but provider hasn't yet
  const awaitingProviderConfirm =
    introductions?.filter(
      (i) =>
        i.concierge_inquiries?.seeker_confirmed &&
        !i.concierge_inquiries?.placement_confirmed &&
        i.concierge_inquiries?.placed_facility_id === selectedFacility?.id
    ) || [];

  const respondedIntroductions = introductions?.filter(
    (i) => i.provider_response && i.provider_response !== "pending"
  ) || [];

  const acceptedCount = respondedIntroductions.filter((i) => i.provider_response === "accepted").length;
  const declinedCount = respondedIntroductions.filter((i) => i.provider_response === "declined").length;

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
      {/* Domestic Placements Header */}
      <Card className="bg-gradient-to-r from-blue-500/5 to-blue-600/10 border-blue-500/20">
        <CardContent className="py-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <MapPin className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">U.S. Client Placements</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Pre-qualified domestic clients seeking treatment. All candidates have been screened by our
                placement advisors to ensure a good fit.
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-2xl font-bold text-blue-600">$1,000</p>
              <p className="text-xs text-muted-foreground">per confirmed admission</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Bell className="h-4 w-4 text-amber-500" />
              <span className="text-2xl font-bold">{pendingIntroductions.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-2xl font-bold">{acceptedCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Accepted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{declinedCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Declined</p>
          </CardContent>
        </Card>
      </div>

      {/* Awaiting Provider Confirmation - Top Priority */}
      {awaitingProviderConfirm.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-emerald-500" />
            Awaiting Your Confirmation
            <Badge variant="default" className="bg-emerald-500">
              {awaitingProviderConfirm.length}
            </Badge>
          </h3>
          <p className="text-sm text-muted-foreground -mt-1">
            These seekers have confirmed interest. Accept to finalize the placement.
          </p>
          <div className="grid gap-4">
            {awaitingProviderConfirm.map((intro) => (
              <IntroductionCard
                key={`confirm-${intro.id}`}
                introduction={intro}
                facilityId={selectedFacility?.id || ""}
                onRespond={(response, notes) => respondMutation.mutate({ id: intro.id, response, notes })}
                isResponding={respondMutation.isPending}
                showConfirmButton
                hasPro={hasPro}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pending Introductions */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          Pending Candidates
          {pendingIntroductions.length > 0 && (
            <Badge variant="destructive">{pendingIntroductions.length} new</Badge>
          )}
        </h3>

        {pendingIntroductions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No pending domestic candidates</p>
              <p className="text-sm text-muted-foreground mt-1">
                When U.S. clients are matched to your facility, they'll appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingIntroductions.map((intro) => (
              <IntroductionCard
                key={intro.id}
                introduction={intro}
                facilityId={selectedFacility?.id || ""}
                onRespond={(response, notes) => respondMutation.mutate({ id: intro.id, response, notes })}
                isResponding={respondMutation.isPending}
                hasPro={hasPro}
              />
            ))}
          </div>
        )}
      </div>

      {/* Past Responses */}
      {respondedIntroductions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-muted-foreground">Past Responses</h3>
          <div className="grid gap-3">
            {respondedIntroductions.slice(0, 5).map((intro) => (
              <Card key={intro.id} className="bg-muted/30">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={intro.provider_response === "accepted" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {intro.provider_response === "accepted" ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" /> Accepted
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" /> Declined
                          </>
                        )}
                      </Badge>
                      <span className="text-sm">
                        Case #{intro.concierge_inquiries?.id?.slice(0, 8).toUpperCase() ||
                          intro.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {intro.provider_responded_at &&
                        format(new Date(intro.provider_responded_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
