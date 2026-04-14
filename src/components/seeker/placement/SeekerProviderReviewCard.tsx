import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSeekerSession } from "@/hooks/useSeekerSession";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  MapPin,
  Building2,
  Loader2,
  HeadphonesIcon,
  ThumbsUp,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import facilityPlaceholder from "@/assets/facility-placeholder.webp";

interface InterestedFacility {
  id: string;
  name: string;
  city: string;
  state: string;
  slug: string;
  logo_url: string | null;
  facility_type: string;
  introduction_id: string;
}

interface SeekerProviderReviewCardProps {
  inquiryId: string;
  onConfirmed: () => void;
}

const FACILITY_TYPE_LABELS: Record<string, string> = {
  residential: "Residential",
  outpatient: "Outpatient",
  detox: "Detox",
  php: "Partial Hospitalization",
  iop: "Intensive Outpatient",
  sober_living: "Sober Living",
};

export function SeekerProviderReviewCard({ inquiryId, onConfirmed }: SeekerProviderReviewCardProps) {
  const { userId } = useSeekerSession();
  const queryClient = useQueryClient();
  const [confirmFacility, setConfirmFacility] = useState<InterestedFacility | null>(null);
  const [rejectFacility, setRejectFacility] = useState<InterestedFacility | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const submitGuard = useRef(false);

  // Fetch interested facilities (providers who accepted)
  const { data: interestedFacilities, isLoading } = useQuery({
    queryKey: ["seeker-interested-facilities", inquiryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_introductions")
        .select(`
          id,
          facility_id,
          provider_response,
          facilities (id, name, city, state, slug, logo_url, facility_type)
        `)
        .eq("inquiry_id", inquiryId)
        .eq("provider_response", "interested");

      if (error) throw error;

      return (data || [])
        .filter((intro: any) => intro.facilities)
        .map((intro: any) => ({
          id: intro.facilities.id,
          name: intro.facilities.name,
          city: intro.facilities.city,
          state: intro.facilities.state,
          slug: intro.facilities.slug,
          logo_url: intro.facilities.logo_url,
          facility_type: intro.facilities.facility_type,
          introduction_id: intro.id,
        })) as InterestedFacility[];
    },
    enabled: !!inquiryId,
  });

  // Check if seeker already confirmed
  const { data: inquiry } = useQuery({
    queryKey: ["seeker-inquiry-confirm-status", inquiryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select("seeker_confirmed, seeker_confirmed_at, placed_facility_id")
        .eq("id", inquiryId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!inquiryId,
  });

  // Seeker confirms preferred facility
  const confirmMutation = useMutation({
    mutationFn: async (facility: InterestedFacility) => {
      if (submitGuard.current) return;
      submitGuard.current = true;

      if (!userId) throw new Error("Not authenticated");

      // Update the inquiry with seeker's choice — idempotent guard
      const { data: updated, error } = await supabase
        .from("concierge_inquiries")
        .update({
          seeker_confirmed: true,
          seeker_confirmed_at: new Date().toISOString(),
          placed_facility_id: facility.id,
        })
        .eq("id", inquiryId)
        .eq("user_id", userId)
        .eq("seeker_confirmed", false)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!updated) {
        // Already confirmed — idempotent return
        return;
      }

      // Log case event
      await supabase.from("concierge_case_events").insert({
        inquiry_id: inquiryId,
        event_type: "seeker_confirmed",
        event_data: {
          facility_id: facility.id,
          facility_name: facility.name,
        },
        actor_type: "seeker",
        actor_id: userId,
      });

      // Notify admin/advisor
      await supabase.functions.invoke("send-concierge-notifications", {
        body: {
          type: "seeker_confirmed",
          inquiryId,
          facilityId: facility.id,
        },
      });
    },
    onSuccess: () => {
      toast.success("You've confirmed your choice! Your advisor will finalize the admission.");
      queryClient.invalidateQueries({ queryKey: ["seeker-concierge-cases"] });
      queryClient.invalidateQueries({ queryKey: ["seeker-inquiry-confirm-status", inquiryId] });
      setConfirmFacility(null);
      onConfirmed();
      submitGuard.current = false;
    },
    onError: (error) => {
      toast.error("Failed to confirm: " + error.message);
      submitGuard.current = false;
    },
  });

  // Seeker rejects a facility
  const rejectMutation = useMutation({
    mutationFn: async ({ facility, reason }: { facility: InterestedFacility; reason: string }) => {
      if (!userId) throw new Error("Not authenticated");

      // Record rejection
      await supabase.from("concierge_rejected_facilities").insert({
        inquiry_id: inquiryId,
        facility_id: facility.id,
        user_id: userId,
      });

      // Log case event
      await supabase.from("concierge_case_events").insert({
        inquiry_id: inquiryId,
        event_type: "seeker_rejected_facility",
        event_data: {
          facility_id: facility.id,
          facility_name: facility.name,
          reason: reason.trim() || undefined,
        },
        actor_type: "seeker",
        actor_id: userId,
      });

      // Notify admin/advisor of rejection
      try {
        await supabase.functions.invoke("send-concierge-notifications", {
          body: {
            type: "seeker_rejected_provider",
            inquiryId,
            facilityId: facility.id,
            metadata: { reason: reason.trim() || "No reason provided" },
          },
        });
      } catch (e) { console.error("Notification error:", e); }
    },
    onSuccess: () => {
      toast.success("Facility dismissed. Your advisor will be notified.");
      queryClient.invalidateQueries({ queryKey: ["seeker-interested-facilities", inquiryId] });
      queryClient.invalidateQueries({ queryKey: ["rejected-facilities", inquiryId] });
      setRejectFacility(null);
      setRejectReason("");
    },
    onError: () => {
      toast.error("Failed to dismiss facility. Please try again.");
    },
  });

  // Already confirmed
  if (inquiry?.seeker_confirmed) {
    return (
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50/50 dark:from-emerald-950/30 dark:to-green-950/20 dark:border-emerald-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl">
              <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">
                You've Confirmed Your Choice
              </h3>
              <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                Your advisor is now finalizing your admission. We'll notify you once everything is confirmed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!interestedFacilities?.length) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <HeadphonesIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Your Advisor is Coordinating</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                We're waiting for facilities to respond. Your advisor will present options as soon as they're available.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/30 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ThumbsUp className="h-5 w-5 text-primary" />
            Review Your Options
          </CardTitle>
          <CardDescription>
            {interestedFacilities.length === 1
              ? "A facility has accepted your case. Review and confirm to proceed."
              : `${interestedFacilities.length} facilities have accepted your case. Choose your preferred option.`}
          </CardDescription>
          <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg">
            <span className="text-sm font-medium text-warning">⚠️ Availability may change quickly</span>
            <span className="text-xs text-muted-foreground">— Secure your spot today</span>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <AnimatePresence>
            {interestedFacilities.map((facility) => (
              <motion.div
                key={facility.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex items-start gap-4 p-4">
                      <Avatar className="h-14 w-14 rounded-xl border-2 border-muted">
                        <AvatarImage
                          src={facility.logo_url || facilityPlaceholder}
                          alt={facility.name}
                          className="object-cover"
                        />
                        <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-lg font-bold">
                          {facility.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0 space-y-1">
                        <h3 className="font-semibold text-base leading-tight line-clamp-2">
                          {facility.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {facility.city}, {facility.state}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Building2 className="h-3 w-3" />
                          {FACILITY_TYPE_LABELS[facility.facility_type] || facility.facility_type}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-4 pb-4">
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => setConfirmFacility(facility)}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Choose This Facility
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        asChild
                      >
                        <Link to={`/center/${facility.slug}`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2"
                        onClick={() => setRejectFacility(facility)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          <p className="text-xs text-muted-foreground text-center pt-2">
            Your advisor will finalize the admission after your selection.
          </p>
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmFacility} onOpenChange={() => setConfirmFacility(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm your choice?</AlertDialogTitle>
            <AlertDialogDescription>
              You're choosing <strong>{confirmFacility?.name}</strong> in{" "}
              {confirmFacility?.city}, {confirmFacility?.state}. Your advisor will
              coordinate the admission process on your behalf.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmFacility && confirmMutation.mutate(confirmFacility)}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm Choice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={!!rejectFacility} onOpenChange={() => { setRejectFacility(null); setRejectReason(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dismiss {rejectFacility?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You can optionally share why this facility isn't right for you. Your advisor will use this to find better options.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Optional: Why isn't this the right fit?"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="mt-2"
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejectFacility && rejectMutation.mutate({ facility: rejectFacility, reason: rejectReason })}
              disabled={rejectMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Dismiss Facility
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
