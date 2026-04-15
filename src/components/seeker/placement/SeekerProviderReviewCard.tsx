import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSeekerSession } from "@/hooks/useSeekerSession";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Star,
  Shield,
  Clock,
  ChevronRight,
  Sparkles,
  Heart,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import facilityPlaceholder from "@/assets/facility-placeholder.webp";

// ── Types ──────────────────────────────────────────────

interface EnrichedFacility {
  id: string;
  name: string;
  city: string;
  state: string;
  slug: string;
  logo_url: string | null;
  gallery_urls: string[] | null;
  facility_type: string;
  description: string | null;
  verified: boolean | null;
  year_established: number | null;
  introduction_id: string;
  services: string[];
  insurance: string[];
}

interface SeekerProviderReviewCardProps {
  inquiryId: string;
  onConfirmed: () => void;
}

const FACILITY_TYPE_LABELS: Record<string, string> = {
  "Residential Treatment Center": "Residential",
  "Outpatient Program": "Outpatient",
  "Detox Center": "Detox",
  "Intensive Outpatient (IOP)": "IOP",
  "Partial Hospitalization (PHP)": "PHP",
  "Sober Living": "Sober Living",
  "Dual Diagnosis": "Dual Diagnosis",
  "Luxury Rehab": "Luxury",
  "Telehealth/Virtual": "Telehealth",
};

// ── Main Component ─────────────────────────────────────

export function SeekerProviderReviewCard({ inquiryId, onConfirmed }: SeekerProviderReviewCardProps) {
  const { userId } = useSeekerSession();
  const queryClient = useQueryClient();
  const [confirmFacility, setConfirmFacility] = useState<EnrichedFacility | null>(null);
  const [rejectFacility, setRejectFacility] = useState<EnrichedFacility | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const submitGuard = useRef(false);

  // Fetch inquiry to check insurance match & confirmation status
  const { data: inquiry } = useQuery({
    queryKey: ["seeker-inquiry-confirm-status", inquiryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select("seeker_confirmed, seeker_confirmed_at, placed_facility_id, insurance_carrier")
        .eq("id", inquiryId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!inquiryId,
  });

  // Fetch interested facilities with enriched data
  const { data: facilities, isLoading } = useQuery({
    queryKey: ["seeker-interested-facilities", inquiryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_introductions")
        .select(`
          id,
          facility_id,
          provider_response,
          facilities (
            id, name, city, state, slug, logo_url, gallery_urls,
            facility_type, description, verified, year_established
          )
        `)
        .eq("inquiry_id", inquiryId)
        .eq("provider_response", "interested")
        .limit(3);

      if (error) throw error;

      const intros = (data || []).filter((intro: any) => intro.facilities);
      const facilityIds = intros.map((i: any) => i.facilities.id);

      // Parallel fetch services & insurance for all facilities
      const [servicesRes, insuranceRes] = await Promise.all([
        facilityIds.length > 0
          ? supabase.from("facility_services").select("facility_id, service_name").in("facility_id", facilityIds)
          : { data: [] },
        facilityIds.length > 0
          ? supabase.from("facility_insurance").select("facility_id, insurance_name").in("facility_id", facilityIds)
          : { data: [] },
      ]);

      const servicesByFacility: Record<string, string[]> = {};
      const insuranceByFacility: Record<string, string[]> = {};

      (servicesRes.data || []).forEach((s: any) => {
        if (!servicesByFacility[s.facility_id]) servicesByFacility[s.facility_id] = [];
        servicesByFacility[s.facility_id].push(s.service_name);
      });
      (insuranceRes.data || []).forEach((i: any) => {
        if (!insuranceByFacility[i.facility_id]) insuranceByFacility[i.facility_id] = [];
        insuranceByFacility[i.facility_id].push(i.insurance_name);
      });

      return intros.map((intro: any) => ({
        id: intro.facilities.id,
        name: intro.facilities.name,
        city: intro.facilities.city,
        state: intro.facilities.state,
        slug: intro.facilities.slug,
        logo_url: intro.facilities.logo_url,
        gallery_urls: intro.facilities.gallery_urls,
        facility_type: intro.facilities.facility_type,
        description: intro.facilities.description,
        verified: intro.facilities.verified,
        year_established: intro.facilities.year_established,
        introduction_id: intro.id,
        services: servicesByFacility[intro.facilities.id] || [],
        insurance: insuranceByFacility[intro.facilities.id] || [],
      })) as EnrichedFacility[];
    },
    enabled: !!inquiryId,
  });

  // ── Confirm mutation ──
  const confirmMutation = useMutation({
    mutationFn: async (facility: EnrichedFacility) => {
      if (submitGuard.current) return;
      submitGuard.current = true;
      if (!userId) throw new Error("Not authenticated");

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
      if (!updated) return; // idempotent

      await supabase.from("concierge_case_events").insert({
        inquiry_id: inquiryId,
        event_type: "seeker_confirmed",
        event_data: { facility_id: facility.id, facility_name: facility.name },
        actor_type: "seeker",
        actor_id: userId,
      });

      await supabase.functions.invoke("send-concierge-notifications", {
        body: { type: "seeker_confirmed", inquiryId, facilityId: facility.id },
      });
    },
    onSuccess: () => {
      toast.success("You've confirmed your choice! Your advisor will finalize admission.");
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

  // ── Reject mutation ──
  const rejectMutation = useMutation({
    mutationFn: async ({ facility, reason }: { facility: EnrichedFacility; reason: string }) => {
      if (!userId) throw new Error("Not authenticated");

      await supabase.from("concierge_rejected_facilities").insert({
        inquiry_id: inquiryId,
        facility_id: facility.id,
        user_id: userId,
      });

      await supabase.from("concierge_case_events").insert({
        inquiry_id: inquiryId,
        event_type: "seeker_rejected_facility",
        event_data: { facility_id: facility.id, facility_name: facility.name, reason: reason.trim() || undefined },
        actor_type: "seeker",
        actor_id: userId,
      });

      try {
        await supabase.functions.invoke("send-concierge-notifications", {
          body: { type: "seeker_rejected_provider", inquiryId, facilityId: facility.id, metadata: { reason: reason.trim() || "No reason provided" } },
        });
      } catch (e) { console.error("Notification error:", e); }
    },
    onSuccess: () => {
      toast.success("Facility dismissed. Your advisor will find better options.");
      queryClient.invalidateQueries({ queryKey: ["seeker-interested-facilities", inquiryId] });
      queryClient.invalidateQueries({ queryKey: ["rejected-facilities", inquiryId] });
      setRejectFacility(null);
      setRejectReason("");
    },
    onError: () => toast.error("Failed to dismiss facility. Please try again."),
  });

  // ── Check insurance match ──
  const seekerInsurance = inquiry?.insurance_carrier?.toLowerCase() || "";
  const matchesInsurance = (facilityInsurance: string[]) =>
    seekerInsurance && facilityInsurance.some((ins) => ins.toLowerCase().includes(seekerInsurance) || seekerInsurance.includes(ins.toLowerCase()));

  // ── Already confirmed ──
  if (inquiry?.seeker_confirmed) {
    return (
      <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-green-50/50 dark:from-emerald-950/30 dark:to-green-950/20 p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
            <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-300">You've Confirmed Your Choice</h3>
            <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80 mt-1">
              Your advisor is now finalizing your admission. We'll notify you once everything is confirmed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted rounded-lg animate-pulse" />
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border bg-card overflow-hidden">
            <div className="h-48 bg-muted animate-pulse" />
            <div className="p-5 space-y-3">
              <div className="h-5 w-48 bg-muted rounded animate-pulse" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded-xl animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── No facilities yet ──
  if (!facilities?.length) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <HeadphonesIcon className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Your Advisor is Coordinating</h3>
            <p className="text-sm text-muted-foreground mt-1">
              We're waiting for facilities to respond. Your advisor will present options as soon as they're available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Matched for You
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Your Matched Options</h2>
          <p className="text-muted-foreground mt-2 max-w-lg">
            {facilities.length === 1
              ? "A treatment center has been matched to your needs. Review and select to begin admission."
              : `${facilities.length} treatment centers matched to your needs. Review and select your preferred option.`}
          </p>
        </div>

        {/* ── Urgency banner ── */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <Clock className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Availability changes quickly</span> — secure your spot as soon as you're ready.
          </p>
        </div>

        {/* ── Facility Cards ── */}
        <AnimatePresence mode="popLayout">
          {facilities.map((facility, idx) => (
            <motion.div
              key={facility.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.1 }}
            >
              <FacilityCard
                facility={facility}
                insuranceMatch={matchesInsurance(facility.insurance)}
                onSelect={() => setConfirmFacility(facility)}
                onDismiss={() => setRejectFacility(facility)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* ── Footer note ── */}
        <p className="text-xs text-muted-foreground text-center">
          Your advisor will finalize admission after your selection. You're not committed until admission is confirmed.
        </p>
      </div>

      {/* ── Confirm Dialog ── */}
      <AlertDialog open={!!confirmFacility} onOpenChange={() => setConfirmFacility(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Confirm your choice</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              You're selecting <strong className="text-foreground">{confirmFacility?.name}</strong> in{" "}
              {confirmFacility?.city}, {confirmFacility?.state}. Your advisor will coordinate the admission process.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmFacility && confirmMutation.mutate(confirmFacility)}
              disabled={confirmMutation.isPending}
              className="gap-2"
            >
              {confirmMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Confirm Selection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Reject Dialog ── */}
      <AlertDialog open={!!rejectFacility} onOpenChange={() => { setRejectFacility(null); setRejectReason(""); }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Not the right fit?</AlertDialogTitle>
            <AlertDialogDescription>
              You can optionally share why <strong className="text-foreground">{rejectFacility?.name}</strong> isn't right for you. This helps your advisor find better options.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Optional: What would you prefer instead?"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="mt-2 rounded-xl"
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejectFacility && rejectMutation.mutate({ facility: rejectFacility, reason: rejectReason })}
              disabled={rejectMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Dismiss
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Facility Card ──────────────────────────────────────

function FacilityCard({
  facility,
  insuranceMatch,
  onSelect,
  onDismiss,
}: {
  facility: EnrichedFacility;
  insuranceMatch: boolean;
  onSelect: () => void;
  onDismiss: () => void;
}) {
  const heroImage = facility.gallery_urls?.[0] || facility.logo_url || facilityPlaceholder;
  const typeLabel = FACILITY_TYPE_LABELS[facility.facility_type] || facility.facility_type;
  const shortDescription = facility.description
    ? facility.description.length > 160
      ? facility.description.slice(0, 157) + "..."
      : facility.description
    : null;

  const highlights: { icon: React.ElementType; label: string; className: string }[] = [];

  if (insuranceMatch) {
    highlights.push({ icon: Shield, label: "Accepts your insurance", className: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20" });
  }
  if (facility.verified) {
    highlights.push({ icon: CheckCircle, label: "Verified facility", className: "text-primary bg-primary/10 border-primary/20" });
  }
  highlights.push({ icon: Clock, label: "Available now", className: "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" });
  if (facility.year_established) {
    const years = new Date().getFullYear() - facility.year_established;
    if (years >= 5) {
      highlights.push({ icon: Star, label: `${years}+ years experience`, className: "text-muted-foreground bg-muted border-border" });
    }
  }

  return (
    <div className="group rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
      {/* ── Hero Image ── */}
      <div className="relative h-44 sm:h-52 overflow-hidden bg-muted">
        <img
          src={heroImage}
          alt={facility.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Overlay badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className="bg-white/90 text-foreground backdrop-blur-sm border-0 text-xs font-semibold shadow-sm">
            <Building2 className="h-3 w-3 mr-1" />
            {typeLabel}
          </Badge>
        </div>

        {/* Location on image */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white/90 text-sm font-medium">
          <MapPin className="h-3.5 w-3.5" />
          {facility.city}, {facility.state}
        </div>

        {/* Gallery thumbnails */}
        {facility.gallery_urls && facility.gallery_urls.length > 1 && (
          <div className="absolute bottom-3 right-3 flex gap-1.5">
            {facility.gallery_urls.slice(1, 4).map((url, i) => (
              <div key={i} className="h-10 w-10 rounded-lg overflow-hidden border-2 border-white/50 shadow-sm">
                <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="p-5 sm:p-6 space-y-4">
        {/* Name & link */}
        <div>
          <h3 className="text-lg sm:text-xl font-bold leading-tight">{facility.name}</h3>
          {shortDescription && (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{shortDescription}</p>
          )}
        </div>

        {/* Highlights */}
        <div className="flex flex-wrap gap-2">
          {highlights.map((h, i) => (
            <Badge key={i} variant="outline" className={cn("text-xs gap-1.5 py-1 px-2.5 font-medium", h.className)}>
              <h.icon className="h-3 w-3" />
              {h.label}
            </Badge>
          ))}
        </div>

        {/* Top services */}
        {facility.services.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {facility.services.slice(0, 4).map((s) => (
              <span key={s} className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                {s}
              </span>
            ))}
            {facility.services.length > 4 && (
              <span className="text-xs px-2 py-0.5 text-muted-foreground">+{facility.services.length - 4} more</span>
            )}
          </div>
        )}

        {/* ── CTA ── */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={onSelect}
            className="flex-1 h-12 text-sm font-bold gap-2 rounded-xl shadow-sm"
            size="lg"
          >
            <Heart className="h-4 w-4" />
            Select This Facility
            <ChevronRight className="h-4 w-4 ml-auto" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-xl shrink-0"
            asChild
          >
            <Link to={`/center/${facility.slug}`} target="_blank">
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-xl shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={onDismiss}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
