import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface ConciergeDecisionTabProps {
  caseData: ConciergeInquiry;
}

const RESPONSE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  interested: { label: "Interested", icon: ThumbsUp, color: "text-success" },
  accepted: { label: "Accepted", icon: CheckCircle, color: "text-success" },
  declined: { label: "Declined", icon: ThumbsDown, color: "text-destructive" },
  pending: { label: "Pending", icon: Clock, color: "text-muted-foreground" },
};

export function ConciergeDecisionTab({ caseData }: ConciergeDecisionTabProps) {
  // Fetch introductions with facility details
  const { data: introductions, isLoading } = useQuery({
    queryKey: ["decision-intros", caseData.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_introductions")
        .select("*, facilities:facility_id(name, city, state)")
        .eq("inquiry_id", caseData.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch rejected facilities
  const { data: rejections } = useQuery({
    queryKey: ["decision-rejections", caseData.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_rejected_facilities")
        .select("*, facilities:facility_id(name, city, state)")
        .eq("inquiry_id", caseData.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>;
  }

  const acceptedIntros = introductions?.filter(i => i.provider_response === "interested" || i.provider_response === "accepted") || [];
  const declinedIntros = introductions?.filter(i => i.provider_response === "declined") || [];
  const pendingIntros = introductions?.filter(i => !i.provider_response || i.provider_response === "pending") || [];

  return (
    <div className="space-y-4">
      {/* Seeker Confirmation Status */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Client Decision Status</CardTitle>
        </CardHeader>
        <CardContent className="py-2 space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Client Confirmed</span>
            <div>
              {caseData.seeker_confirmed ? (
                <Badge className="bg-success/10 text-success border-success/30 gap-1">
                  <CheckCircle className="h-3 w-3" /> Confirmed
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" /> Awaiting
                </Badge>
              )}
            </div>
          </div>
          {caseData.seeker_confirmed_at && (
            <div className="flex items-center justify-between py-2 border-t border-border/50">
              <span className="text-sm text-muted-foreground">Confirmed At</span>
              <span className="text-sm font-medium">{format(new Date(caseData.seeker_confirmed_at), "MMM d, yyyy 'at' h:mm a")}</span>
            </div>
          )}
          {caseData.seeker_feedback && (
            <div className="border-t border-border/50 pt-2">
              <span className="text-xs text-muted-foreground block mb-1">Client Feedback</span>
              <p className="text-sm bg-muted/50 rounded-lg p-2">{caseData.seeker_feedback}</p>
            </div>
          )}
          {caseData.seeker_rating && (
            <div className="flex items-center justify-between py-2 border-t border-border/50">
              <span className="text-sm text-muted-foreground">Client Rating</span>
              <span className="text-sm font-medium">{"★".repeat(caseData.seeker_rating)}{"☆".repeat(5 - caseData.seeker_rating)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Responses */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Providers Presented</CardTitle>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] bg-success/10 text-success">{acceptedIntros.length} Accepted</Badge>
              <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive">{declinedIntros.length} Declined</Badge>
              <Badge variant="outline" className="text-[10px]">{pendingIntros.length} Pending</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-2">
          {(!introductions || introductions.length === 0) ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No providers introduced yet</p>
          ) : (
            <div className="divide-y divide-border/50">
              {introductions.map((intro) => {
                const facility = intro.facilities as any;
                const responseConfig = RESPONSE_CONFIG[intro.provider_response || "pending"];
                const ResponseIcon = responseConfig.icon;
                return (
                  <div key={intro.id} className="py-3 first:pt-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{facility?.name || "Unknown Facility"}</p>
                        {facility && (
                          <p className="text-xs text-muted-foreground">{facility.city}, {facility.state}</p>
                        )}
                      </div>
                      <Badge variant="outline" className={`gap-1 ${responseConfig.color}`}>
                        <ResponseIcon className="h-3 w-3" />
                        {responseConfig.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      {intro.sent_at && <span>Sent: {format(new Date(intro.sent_at), "MMM d")}</span>}
                      {intro.provider_responded_at && <span>Responded: {format(new Date(intro.provider_responded_at), "MMM d")}</span>}
                      {intro.admin_disclosed_pii_at && (
                        <Badge variant="outline" className="text-[9px] h-4">PII Disclosed</Badge>
                      )}
                    </div>
                    {intro.provider_notes && (
                      <div className="mt-2 flex items-start gap-1.5 bg-muted/50 rounded p-2">
                        <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs">{intro.provider_notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seeker Rejections */}
      {rejections && rejections.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-destructive">Seeker Rejected Facilities</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="divide-y divide-border/50">
              {rejections.map((rej) => {
                const facility = rej.facilities as any;
                return (
                  <div key={rej.id} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{facility?.name || "Unknown"}</p>
                      {facility && <p className="text-xs text-muted-foreground">{facility.city}, {facility.state}</p>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(rej.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
