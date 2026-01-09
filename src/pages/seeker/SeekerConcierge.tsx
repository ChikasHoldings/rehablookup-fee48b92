import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  Search, 
  Users, 
  Send, 
  Phone, 
  CheckCircle, 
  XCircle,
  ArrowRight,
  Calendar,
  MapPin,
  CreditCard,
  AlertCircle,
  HeartHandshake,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { CaseStatusTimeline } from "@/components/seeker/CaseStatusTimeline";
import { MatchedFacilityCard } from "@/components/seeker/MatchedFacilityCard";
import { ConfirmAdmissionModal } from "@/components/seeker/ConfirmAdmissionModal";
import { FeedbackForm } from "@/components/seeker/FeedbackForm";

interface ConciergeInquiry {
  id: string;
  status: string;
  created_at: string;
  intake_submitted_at: string | null;
  matched_at: string | null;
  matched_facility_ids: string[] | null;
  level_of_care: string | null;
  payment_type: string | null;
  insurance_carrier: string | null;
  timeline_urgency: string | null;
  preferred_state: string | null;
  preferred_city: string | null;
  seeker_confirmed: boolean;
  seeker_confirmed_at: string | null;
  placement_confirmed: boolean;
  placement_confirmed_at: string | null;
  placed_facility_id: string | null;
  seeker_rating: number | null;
  seeker_feedback: string | null;
  user_name: string;
}

interface Facility {
  id: string;
  name: string;
  city: string;
  state: string;
  phone: string;
  slug: string;
  logo_url: string | null;
  facility_type: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  new: { label: "Submitted", icon: Clock, color: "bg-blue-500" },
  reviewing: { label: "Reviewing", icon: Search, color: "bg-yellow-500" },
  matching: { label: "Finding Matches", icon: Users, color: "bg-purple-500" },
  introductions_sent: { label: "Introductions Sent", icon: Send, color: "bg-indigo-500" },
  in_contact: { label: "In Contact", icon: Phone, color: "bg-teal-500" },
  confirming: { label: "Awaiting Confirmation", icon: Clock, color: "bg-amber-500" },
  placed: { label: "Placed", icon: CheckCircle, color: "bg-green-500" },
  closed: { label: "Closed", icon: XCircle, color: "bg-muted-foreground" },
};

const TIMELINE_STEPS = ["new", "reviewing", "matching", "introductions_sent", "in_contact", "placed"];

export default function SeekerConcierge() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fetch user's concierge cases
  const { data: cases, isLoading: casesLoading, refetch } = useQuery({
    queryKey: ["seeker-concierge-cases"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select(`
          id, status, created_at, intake_submitted_at, matched_at,
          matched_facility_ids, level_of_care, payment_type, insurance_carrier,
          timeline_urgency, preferred_state, preferred_city,
          seeker_confirmed, seeker_confirmed_at, placement_confirmed,
          placement_confirmed_at, placed_facility_id, seeker_rating,
          seeker_feedback, user_name
        `)
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ConciergeInquiry[];
    },
  });

  const selectedCase = cases?.find(c => c.id === selectedCaseId) || cases?.[0];

  // Fetch matched facilities
  const { data: matchedFacilities } = useQuery({
    queryKey: ["matched-facilities", selectedCase?.matched_facility_ids],
    queryFn: async () => {
      if (!selectedCase?.matched_facility_ids?.length) return [];
      
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, city, state, phone, slug, logo_url, facility_type")
        .in("id", selectedCase.matched_facility_ids);
      
      if (error) throw error;
      return (data || []) as Facility[];
    },
    enabled: !!selectedCase?.matched_facility_ids?.length,
  });

  // Fetch placed facility details
  const { data: placedFacility } = useQuery({
    queryKey: ["placed-facility", selectedCase?.placed_facility_id],
    queryFn: async () => {
      if (!selectedCase?.placed_facility_id) return null;
      
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, city, state, phone, slug, logo_url, facility_type")
        .eq("id", selectedCase.placed_facility_id)
        .single();
      
      if (error) throw error;
      return data as Facility;
    },
    enabled: !!selectedCase?.placed_facility_id,
  });

  // Submit feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async ({ rating, feedback }: { rating: number; feedback: string }) => {
      const { error } = await supabase
        .from("concierge_inquiries")
        .update({
          seeker_rating: rating,
          seeker_feedback: feedback,
        })
        .eq("id", selectedCase!.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted.",
      });
      queryClient.invalidateQueries({ queryKey: ["seeker-concierge-cases"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (casesLoading) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Empty state
  if (!cases?.length) {
    return (
      <div className="container max-w-4xl py-12">
        <Card className="text-center py-12">
          <CardContent className="space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <HeartHandshake className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">No Placement Cases</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                You haven't submitted a concierge request yet. Our specialists can help you find the right treatment center.
              </p>
            </div>
            <Button onClick={() => navigate("/concierge")} className="gap-2">
              Get Placement Help
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStatusConfig = STATUS_CONFIG[selectedCase?.status || "new"];
  const showMatchedFacilities = selectedCase && 
    ["matching", "introductions_sent", "in_contact", "confirming", "placed"].includes(selectedCase.status);
  const showConfirmation = selectedCase?.status === "in_contact" && !selectedCase.seeker_confirmed;
  const showAwaitingProvider = selectedCase?.seeker_confirmed && !selectedCase.placement_confirmed;
  const showFeedback = selectedCase?.status === "placed" && !selectedCase.seeker_feedback;

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Placement Tracker</h1>
          <p className="text-muted-foreground">Track your concierge placement progress</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Case Selector (if multiple) */}
      {cases.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {cases.map((c) => (
            <Button
              key={c.id}
              variant={selectedCaseId === c.id || (!selectedCaseId && c.id === cases[0].id) ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCaseId(c.id)}
            >
              Case #{c.id.slice(0, 8).toUpperCase()}
            </Button>
          ))}
        </div>
      )}

      {/* Main Case Card */}
      {selectedCase && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-3">
                  Case #{selectedCase.id.slice(0, 8).toUpperCase()}
                  <Badge className={`${currentStatusConfig.color} text-white`}>
                    {currentStatusConfig.label}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  Submitted {format(new Date(selectedCase.created_at), "MMMM d, yyyy")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Timeline */}
            <CaseStatusTimeline 
              currentStatus={selectedCase.status} 
              steps={TIMELINE_STEPS}
              statusConfig={STATUS_CONFIG}
            />

            {/* Case Details Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              {selectedCase.level_of_care && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Care Type</p>
                  <p className="text-sm font-medium capitalize">{selectedCase.level_of_care.replace(/_/g, ' ')}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <CreditCard className="h-3 w-3" /> Payment
                </p>
                <p className="text-sm font-medium capitalize">
                  {selectedCase.payment_type === "insurance" 
                    ? selectedCase.insurance_carrier || "Insurance"
                    : selectedCase.payment_type?.replace(/_/g, ' ') || "Not specified"}
                </p>
              </div>
              {selectedCase.timeline_urgency && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Urgency
                  </p>
                  <p className="text-sm font-medium capitalize">{selectedCase.timeline_urgency.replace(/_/g, ' ')}</p>
                </div>
              )}
              {(selectedCase.preferred_city || selectedCase.preferred_state) && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Location
                  </p>
                  <p className="text-sm font-medium">
                    {[selectedCase.preferred_city, selectedCase.preferred_state].filter(Boolean).join(", ")}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Placed Facility */}
      {selectedCase?.status === "placed" && placedFacility && (
        <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              Successfully Placed
            </CardTitle>
            <CardDescription>
              Congratulations! You've been placed at the following facility.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MatchedFacilityCard facility={placedFacility} isPlaced />
          </CardContent>
        </Card>
      )}

      {/* Matched Facilities */}
      {showMatchedFacilities && matchedFacilities && matchedFacilities.length > 0 && selectedCase?.status !== "placed" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Matched Facilities
            </CardTitle>
            <CardDescription>
              These treatment centers match your needs and have been notified about your case.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {matchedFacilities.map((facility) => (
                <MatchedFacilityCard key={facility.id} facility={facility} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Awaiting Provider Confirmation */}
      {showAwaitingProvider && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-700 dark:text-amber-400">
                Awaiting Facility Confirmation
              </h3>
              <p className="text-sm text-muted-foreground">
                You've confirmed your admission. We're waiting for the facility to confirm as well.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Section */}
      {showConfirmation && matchedFacilities && matchedFacilities.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Ready to Confirm?
            </CardTitle>
            <CardDescription>
              Have you been admitted to one of the matched facilities? Let us know!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowConfirmModal(true)} className="gap-2">
              Confirm My Admission
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Feedback Section */}
      {showFeedback && (
        <Card>
          <CardHeader>
            <CardTitle>How was your experience?</CardTitle>
            <CardDescription>
              Your feedback helps us improve our concierge service for others.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FeedbackForm 
              onSubmit={(rating, feedback) => feedbackMutation.mutate({ rating, feedback })}
              isSubmitting={feedbackMutation.isPending}
            />
          </CardContent>
        </Card>
      )}

      {/* Already gave feedback */}
      {selectedCase?.seeker_feedback && (
        <Card className="bg-muted/30">
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">
              Thank you for your feedback! You rated your experience {selectedCase.seeker_rating}/5 stars.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Contact Card */}
      <Card className="bg-muted/30">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Questions about your case?</p>
              <p className="text-sm text-muted-foreground">Our specialists are here to help.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href="tel:1-800-555-0199">Call Us</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="mailto:concierge@rehabookup.com">Email Us</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedCase && matchedFacilities && (
        <ConfirmAdmissionModal
          open={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          inquiryId={selectedCase.id}
          facilities={matchedFacilities}
          onConfirmed={() => {
            setShowConfirmModal(false);
            queryClient.invalidateQueries({ queryKey: ["seeker-concierge-cases"] });
          }}
        />
      )}
    </div>
  );
}
