import { useState, useEffect, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { toast } from "sonner";
import {
  Check,
  Loader2,
  CheckCircle2,
  Clock,
  Building2,
  DollarSign,
  CreditCard,
  Landmark,
  Plus,
  FileText,
  AlertCircle,
  FileSignature,
  Trash2,
  ExternalLink,
  Settings,
  Network,
  Sparkles,
  Inbox,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { PlacementTermsModal } from "@/components/provider/PlacementTermsModal";
const AddPaymentMethodModal = lazy(() =>
  import("@/components/provider/AddPaymentMethodModal").then((m) => ({ default: m.AddPaymentMethodModal }))
);
import { CareTypesModal } from "@/components/provider/CareTypesModal";
import { PlacementReadinessChecklist } from "@/components/provider/PlacementReadinessChecklist";
import {
  PlacementHowItWorks,
  PlacementBenefits,
  PlacementJoinCTA,
  DomesticCandidatesTab,
} from "@/components/provider/placement-network";
import { InternationalCandidatesTab } from "@/components/provider/international/InternationalCandidatesTab";
import { cn } from "@/lib/utils";

const PLACEMENT_FEES = {
  flat_fee: { standard: 1000, pro: 800 },
};

const CARE_TYPES = [
  { value: "detox", label: "Detox" },
  { value: "inpatient", label: "Residential Inpatient" },
  { value: "php", label: "Partial Hospitalization (PHP)" },
  { value: "iop", label: "Intensive Outpatient (IOP)" },
  { value: "outpatient", label: "Outpatient" },
  { value: "mat", label: "Medication-Assisted Treatment (MAT)" },
  { value: "sober_living", label: "Sober Living" },
];

const INSURANCE_OPTIONS = [
  "Aetna", "Anthem", "Blue Cross Blue Shield", "Cigna", "Humana",
  "Kaiser Permanente", "Medicaid", "Medicare", "Tricare", "United Healthcare", "Self-Pay",
];

type TabKey = "pipeline" | "admissions" | "settings";

export default function ProviderPlacementNetworkPage() {
  const queryClient = useQueryClient();
  const { selectedFacility } = useSelectedFacility();
  const [activeTab, setActiveTab] = useState<TabKey>("pipeline");
  const [pipelineView, setPipelineView] = useState<"domestic" | "international">("domestic");

  const [profileForm, setProfileForm] = useState({
    acceptedCareTypes: [] as string[],
    acceptedInsurance: [] as string[],
    availabilityStatus: "open",
    admissionsContact: "",
    admissionsEmail: "",
    admissionsPhone: "",
    agreementPreference: "either",
  });

  // ── Queries ──
  const { data: facilityData, isLoading } = useQuery({
    queryKey: ["facility-concierge", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return null;
      const { data, error } = await supabase
        .from("facilities")
        .select(
          "concierge_network_opted_in, concierge_opted_in_at, concierge_accepted_care_types, concierge_accepted_insurance, concierge_availability_status, concierge_admissions_contact, concierge_admissions_email, concierge_admissions_phone, concierge_agreement_preference, concierge_terms_accepted_at, concierge_terms_version, name, address, phone"
        )
        .eq("id", selectedFacility.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFacility?.id,
    retry: 2,
  });

  const { data: introductions, error: introductionsError } = useQuery({
    queryKey: ["placement-introductions", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data, error } = await supabase
        .from("concierge_introductions")
        .select(`*, concierge_inquiries (id, user_name, level_of_care, payment_type, timeline_urgency, preferred_state, status, seeker_confirmed, seeker_confirmed_at, placement_confirmed, placement_confirmed_at, placed_facility_id)`)
        .eq("facility_id", selectedFacility.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedFacility?.id,
  });

  const { data: placements } = useQuery({
    queryKey: ["facility-placements", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select("id, user_name, user_email, user_phone, status, placed_facility_id, placement_confirmed, placement_confirmed_at, provider_fee_cents, provider_fee_status, provider_fee_type, created_at, updated_at")
        .eq("placed_facility_id", selectedFacility.id)
        .eq("status", "placed")
        .order("placement_confirmed_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedFacility?.id,
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ["provider-payment-methods", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data, error } = await supabase
        .from("provider_payment_methods")
        .select("id, facility_id, stripe_payment_method_id, card_brand, card_last4, is_default, created_at")
        .eq("facility_id", selectedFacility.id)
        .order("is_default", { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!selectedFacility?.id,
  });

  const { data: invoices } = useQuery({
    queryKey: ["placement-invoices", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data, error } = await supabase
        .from("placement_invoices")
        .select("id, facility_id, inquiry_id, amount_cents, status, stripe_invoice_id, due_date, paid_at, created_at")
        .eq("facility_id", selectedFacility.id)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!selectedFacility?.id,
  });

  const { data: proSubscription } = useQuery({
    queryKey: ["pro-subscription", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return null;
      const { data, error } = await supabase
        .from("pro_subscriptions")
        .select("id, facility_id, stripe_subscription_id, status, plan_type, current_period_start, current_period_end, unlock_discount_percent, created_at")
        .eq("facility_id", selectedFacility.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFacility?.id,
  });

  // ── Error handling ──
  useEffect(() => {
    if (introductionsError) {
      console.error("[PlacementNetwork] Introductions query error:", introductionsError);
    }
  }, [introductionsError]);

  // ── Sync profile form ──
  useEffect(() => {
    if (facilityData) {
      setProfileForm({
        acceptedCareTypes: (facilityData.concierge_accepted_care_types as string[]) || [],
        acceptedInsurance: (facilityData.concierge_accepted_insurance as string[]) || [],
        availabilityStatus: facilityData.concierge_availability_status || "open",
        admissionsContact: facilityData.concierge_admissions_contact || "",
        admissionsEmail: facilityData.concierge_admissions_email || "",
        admissionsPhone: facilityData.concierge_admissions_phone || "",
        agreementPreference: facilityData.concierge_agreement_preference || "either",
      });
    }
  }, [facilityData]);

  // ── Mutations ──
  const optInMutation = useMutation({
    mutationFn: async (optedIn: boolean) => {
      if (!selectedFacility?.id) throw new Error("No facility selected");
      const { error } = await supabase
        .from("facilities")
        .update({
          concierge_network_opted_in: optedIn,
          concierge_opted_in_at: optedIn ? new Date().toISOString() : null,
        })
        .eq("id", selectedFacility.id);
      if (error) throw error;
    },
    onSuccess: (_, optedIn) => {
      queryClient.invalidateQueries({ queryKey: ["facility-concierge"] });
      toast.success(optedIn ? "Joined Placement Network!" : "Left Placement Network");
    },
    onError: () => toast.error("Failed to update network status"),
  });

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFacility?.id) throw new Error("No facility selected");
      const { error } = await supabase
        .from("facilities")
        .update({
          concierge_accepted_care_types: profileForm.acceptedCareTypes,
          concierge_accepted_insurance: profileForm.acceptedInsurance,
          concierge_availability_status: profileForm.availabilityStatus,
          concierge_admissions_contact: profileForm.admissionsContact || null,
          concierge_admissions_email: profileForm.admissionsEmail || null,
          concierge_admissions_phone: profileForm.admissionsPhone || null,
          concierge_agreement_preference: profileForm.agreementPreference,
        })
        .eq("id", selectedFacility.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-concierge"] });
      toast.success("Network profile saved");
    },
    onError: () => toast.error("Failed to save profile"),
  });

  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      if (!selectedFacility?.id) throw new Error("No facility selected");
      const { error } = await supabase
        .from("provider_payment_methods")
        .delete()
        .eq("id", paymentMethodId)
        .eq("facility_id", selectedFacility.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-payment-methods"] });
      toast.success("Payment method removed");
    },
    onError: () => toast.error("Failed to remove payment method"),
  });

  const toggleArrayValue = (field: "acceptedCareTypes" | "acceptedInsurance", value: string) => {
    setProfileForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter((v) => v !== value) : [...prev[field], value],
    }));
  };

  // ── Modals ──
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [careTypesModalOpen, setCareTypesModalOpen] = useState(false);
  const [deletePaymentConfirm, setDeletePaymentConfirm] = useState<{ id: string; isOpen: boolean }>({ id: "", isOpen: false });

  const handleDeletePaymentMethod = () => {
    if (deletePaymentConfirm.id) deletePaymentMethodMutation.mutate(deletePaymentConfirm.id);
    setDeletePaymentConfirm({ id: "", isOpen: false });
  };

  // ── Computed ──
  const optedIn = facilityData?.concierge_network_opted_in || false;
  const pendingIntroductions = introductions?.filter((i) => !i.provider_response || i.provider_response === "pending") || [];
  const hasCompleteProfile = !!(facilityData?.name && facilityData?.address && facilityData?.phone);
  const hasTermsAccepted = !!facilityData?.concierge_terms_accepted_at;
  const hasPaymentMethod = paymentMethods && paymentMethods.length > 0;
  const hasCareTypes = Array.isArray(facilityData?.concierge_accepted_care_types) && (facilityData.concierge_accepted_care_types as string[]).length > 0;

  const readinessChecks = [
    { key: "profile", label: "Complete facility profile", description: "Ensure your facility name, address, and phone are filled in", complete: hasCompleteProfile, required: true },
    { key: "terms", label: "Accept placement terms", description: "Review and sign the placement network agreement", complete: hasTermsAccepted, required: true, action: () => setTermsModalOpen(true), actionLabel: "Accept Terms" },
    { key: "payment", label: "Add payment method", description: "Add a card to be charged only on confirmed placements", complete: !!hasPaymentMethod, required: true, action: () => setPaymentModalOpen(true), actionLabel: "Add Payment" },
    { key: "care_types", label: "Select accepted care types", description: "Tell us what types of patients you can accept", complete: hasCareTypes, required: true, action: () => setCareTypesModalOpen(true), actionLabel: "Select Types" },
  ];
  const isEligibleForNetwork = readinessChecks.filter((c) => c.required).every((c) => c.complete);

  const handleToggle = (checked: boolean) => {
    if (checked && !isEligibleForNetwork) {
      toast.error("Please complete all setup steps first");
      return;
    }
    optInMutation.mutate(checked);
  };

  // ── Tab config ──
  const tabs: { key: TabKey; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: "pipeline", label: "Pipeline", icon: Inbox, badge: pendingIntroductions.length || undefined },
    { key: "admissions", label: "Admissions", icon: Building2, badge: placements?.length || undefined },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="min-h-full bg-background px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-96" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">

        {/* ── Modals ── */}
        <PlacementTermsModal open={termsModalOpen} onOpenChange={setTermsModalOpen} facilityId={selectedFacility?.id || ""} facilityName={selectedFacility?.name || "Your Facility"} />
        {paymentModalOpen && (
          <Suspense fallback={null}>
            <AddPaymentMethodModal open={paymentModalOpen} onOpenChange={setPaymentModalOpen} facilityId={selectedFacility?.id || ""} />
          </Suspense>
        )}
        <CareTypesModal open={careTypesModalOpen} onOpenChange={setCareTypesModalOpen} facilityId={selectedFacility?.id || ""} initialCareTypes={profileForm.acceptedCareTypes} />

        {/* ══════════════════════════════════════════════════
            PAGE HEADER
        ══════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Network className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Placement Network</h1>
                <Badge variant="secondary" className="text-xs"><Sparkles className="h-3.5 w-3.5 mr-1" /> Beta</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Receive pre-qualified referrals from our placement specialists</p>
            </div>
          </div>
          {optedIn && (
            <div className="flex items-center gap-3 shrink-0">
              <Badge variant="outline" className="border-primary/30 text-primary text-sm gap-1.5 py-1 hidden sm:flex">
                <CheckCircle2 className="h-3.5 w-3.5" /> Active
              </Badge>
              <Switch checked={optedIn} onCheckedChange={handleToggle} disabled={optInMutation.isPending} />
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════
            NOT OPTED IN — ONBOARDING
        ══════════════════════════════════════════════════ */}
        {!optedIn ? (
          <div className="space-y-6">
            {!isEligibleForNetwork && <PlacementReadinessChecklist checks={readinessChecks} onComplete={() => optInMutation.mutate(true)} />}
            <PlacementHowItWorks />
            <PlacementBenefits />
            {isEligibleForNetwork && <PlacementJoinCTA isPending={optInMutation.isPending} onJoin={() => optInMutation.mutate(true)} />}
          </div>
        ) : (
          <>
            {/* ══════════════════════════════════════════════════
                TAB BAR — 3 clean tabs
            ══════════════════════════════════════════════════ */}
            <div className="border-b mb-8">
              <nav className="flex gap-6 -mb-px">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        "flex items-center gap-2 pb-3 text-base font-semibold border-b-2 transition-colors whitespace-nowrap",
                        isActive
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                      )}
                    >
                      <tab.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                      {tab.label}
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <span
                          className={cn(
                            "inline-flex items-center justify-center text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5",
                            tab.key === "pipeline"
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-primary/15 text-primary"
                          )}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* ══════════════════════════════════════════════════
                PIPELINE TAB
            ══════════════════════════════════════════════════ */}
            {activeTab === "pipeline" && (
              <div className="space-y-5">
                {/* Domestic / International toggle */}
                <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl w-fit">
                  <button
                    onClick={() => setPipelineView("domestic")}
                    className={cn(
                      "px-4 py-2 text-sm font-semibold rounded-lg transition-all",
                      pipelineView === "domestic"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10"
                    )}
                  >
                    🇺🇸 Domestic
                  </button>
                  <button
                    onClick={() => setPipelineView("international")}
                    className={cn(
                      "px-4 py-2 text-sm font-semibold rounded-lg transition-all",
                      pipelineView === "international"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10"
                    )}
                  >
                    🌍 International
                  </button>
                </div>

                {pipelineView === "domestic" ? (
                  <DomesticCandidatesTab hasPro={!!proSubscription} />
                ) : (
                  <InternationalCandidatesTab hasPro={!!proSubscription} />
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════
                ADMISSIONS TAB
            ══════════════════════════════════════════════════ */}
            {activeTab === "admissions" && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Confirmed Admissions</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Patients placed at your facility through the network</p>
                  </div>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {placements?.length || 0} total
                  </Badge>
                </div>

                {placements && placements.length > 0 ? (
                  <div className="space-y-2">
                    {placements.map((p) => (
                      <Card key={p.id} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              </div>
                             <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">Case #{p.id.slice(0, 8).toUpperCase()}</p>
                                <p className="text-xs text-muted-foreground">
                                  {p.user_name?.split(" ")[0] || "Client"} · {p.level_of_care ? p.level_of_care.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) : "—"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <div className="text-right">
                                <p className="text-xs font-medium">
                                  {p.placement_confirmed_at && format(new Date(p.placement_confirmed_at), "MMM d, yyyy")}
                                </p>
                                <p className="text-[10px] text-muted-foreground uppercase">Placed</p>
                              </div>
                              <Badge variant="outline" className="border-primary/30 text-primary text-[10px] shrink-0">Admitted</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-16 text-center">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium mb-1">No admissions yet</p>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        When you accept a referral and the placement is confirmed, it will appear here.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════
                SETTINGS TAB — Profile + Billing + Agreement
            ══════════════════════════════════════════════════ */}
            {activeTab === "settings" && (
              <div className="space-y-6">

                {/* ── Agreement Status Banner ── */}
                {facilityData?.concierge_terms_accepted_at && (
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between gap-3 px-5 py-4 bg-primary/5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <FileSignature className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">Placement Agreement</p>
                            <p className="text-xs text-muted-foreground">
                              v{facilityData.concierge_terms_version || "1.0"} · Signed {format(new Date(facilityData.concierge_terms_accepted_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs shrink-0" onClick={() => setTermsModalOpen(true)}>
                          <FileText className="h-3.5 w-3.5" /> View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ── Network Profile Card ── */}
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="px-5 sm:px-6 py-4 border-b bg-muted/30">
                      <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Network Profile</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Configure what patients and insurance you accept</p>
                    </div>

                    <div className="p-5 sm:p-6 space-y-6">
                      {/* Care Types */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Accepted Care Types</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {CARE_TYPES.map((type) => (
                            <Label
                              key={type.value}
                              className="flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-colors"
                            >
                              <Checkbox
                                checked={profileForm.acceptedCareTypes.includes(type.value)}
                                onCheckedChange={() => toggleArrayValue("acceptedCareTypes", type.value)}
                              />
                              <span className="text-sm">{type.label}</span>
                            </Label>
                          ))}
                        </div>
                      </div>

                      {/* Insurance */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Accepted Insurance</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {INSURANCE_OPTIONS.map((ins) => (
                            <Label
                              key={ins}
                              className="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-colors"
                            >
                              <Checkbox
                                checked={profileForm.acceptedInsurance.includes(ins.toLowerCase().replace(/\s/g, "_"))}
                                onCheckedChange={() => toggleArrayValue("acceptedInsurance", ins.toLowerCase().replace(/\s/g, "_"))}
                              />
                              <span className="text-xs leading-tight">{ins}</span>
                            </Label>
                          ))}
                        </div>
                      </div>

                      {/* Availability + Fee Structure */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Availability</Label>
                          <Select
                            value={profileForm.availabilityStatus}
                            onValueChange={(v) => setProfileForm((p) => ({ ...p, availabilityStatus: v }))}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open for Admissions</SelectItem>
                              <SelectItem value="limited">Limited Availability</SelectItem>
                              <SelectItem value="full">Not Taking New Admissions</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Fee Structure</Label>
                          <Select
                            value={profileForm.agreementPreference}
                            onValueChange={(v) => setProfileForm((p) => ({ ...p, agreementPreference: v }))}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="flat_fee">Flat Fee Per Placement</SelectItem>
                              <SelectItem value="either">Flexible</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Admissions Contact */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Admissions Contact</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Contact Name</Label>
                            <Input placeholder="Admissions Director" value={profileForm.admissionsContact} onChange={(e) => setProfileForm((p) => ({ ...p, admissionsContact: e.target.value }))} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Email</Label>
                            <Input type="email" placeholder="admissions@facility.com" value={profileForm.admissionsEmail} onChange={(e) => setProfileForm((p) => ({ ...p, admissionsEmail: e.target.value }))} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Phone</Label>
                            <Input type="tel" placeholder="(555) 123-4567" value={profileForm.admissionsPhone} onChange={(e) => setProfileForm((p) => ({ ...p, admissionsPhone: e.target.value }))} />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button onClick={() => saveProfileMutation.mutate()} disabled={saveProfileMutation.isPending} className="w-full sm:w-auto">
                          {saveProfileMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                          Save Profile
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ── Billing & Payments Card ── */}
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="px-5 sm:px-6 py-4 border-b bg-muted/30">
                      <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Billing & Payments</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Payment methods and invoices</p>
                    </div>

                    <div className="p-5 sm:p-6 space-y-6">
                      {/* Payment Methods */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <Label className="text-sm font-medium">Payment Methods</Label>
                        </div>
                        {paymentMethods && paymentMethods.length > 0 ? (
                          <div className="space-y-2">
                            {paymentMethods.map((pm) => (
                              <div key={pm.id} className="flex items-center justify-between p-3 border rounded-lg gap-2 bg-muted/20">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {pm.type === "ach" ? <Landmark className="h-4 w-4 text-muted-foreground shrink-0" /> : <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />}
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{pm.type === "ach" ? pm.bank_name || "Bank" : "Card"} •••• {pm.last_four}</p>
                                    <p className="text-[10px] text-muted-foreground">Added {format(new Date(pm.created_at), "MMM d, yyyy")}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {pm.is_default && <Badge variant="secondary" className="text-[10px] px-1.5">Default</Badge>}
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeletePaymentConfirm({ id: pm.id, isOpen: true })} disabled={deletePaymentMethodMutation.isPending}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Alert className="py-3">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs">Add a payment method to receive referrals.</AlertDescription>
                          </Alert>
                        )}
                        <Button variant="outline" className="w-full sm:w-auto gap-2" onClick={() => setPaymentModalOpen(true)}>
                          <Plus className="h-4 w-4" /> Add Payment Method
                        </Button>
                      </div>

                      {/* Invoices */}
                      {invoices && invoices.length > 0 && (
                        <div className="space-y-3 pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-sm font-medium">Invoices</Label>
                          </div>
                          <div className="space-y-2">
                            {invoices.map((inv) => (
                              <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg gap-2 bg-muted/20">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium">${(inv.amount_cents / 100).toFixed(2)}</p>
                                  <p className="text-[10px] text-muted-foreground">{format(new Date(inv.created_at), "MMM d, yyyy")}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="capitalize text-xs">{inv.status}</Badge>
                                  {inv.status === "paid" && inv.receipt_url && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                      <a href={inv.receipt_url} target="_blank" rel="noopener noreferrer" title="View Receipt">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}

        {/* Delete Payment Confirmation */}
        <AlertDialog open={deletePaymentConfirm.isOpen} onOpenChange={(open) => setDeletePaymentConfirm((prev) => ({ ...prev, isOpen: open }))}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Payment Method</AlertDialogTitle>
              <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePaymentMethod} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
