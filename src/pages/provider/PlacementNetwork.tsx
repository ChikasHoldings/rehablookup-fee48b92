import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { toast } from "sonner";
import {
  Bell,
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
  Globe,
  Network,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { lazy, Suspense } from "react";
const AddPaymentMethodModal = lazy(() => import("@/components/provider/AddPaymentMethodModal").then(m => ({ default: m.AddPaymentMethodModal })));
import { CareTypesModal } from "@/components/provider/CareTypesModal";
import { PlacementReadinessChecklist } from "@/components/provider/PlacementReadinessChecklist";
import {
  PlacementHowItWorks,
  PlacementBenefits,
  PlacementJoinCTA,
  DomesticCandidatesTab,
} from "@/components/provider/placement-network";
import { InternationalCandidatesTab } from "@/components/provider/international/InternationalCandidatesTab";

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
  "Aetna",
  "Anthem",
  "Blue Cross Blue Shield",
  "Cigna",
  "Humana",
  "Kaiser Permanente",
  "Medicaid",
  "Medicare",
  "Tricare",
  "United Healthcare",
  "Self-Pay",
];

export default function ProviderPlacementNetworkPage() {
  const queryClient = useQueryClient();
  const { selectedFacility } = useSelectedFacility();

  const [profileForm, setProfileForm] = useState({
    acceptedCareTypes: [] as string[],
    acceptedInsurance: [] as string[],
    availabilityStatus: "open",
    admissionsContact: "",
    admissionsEmail: "",
    admissionsPhone: "",
    agreementPreference: "either",
  });

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
  });

  const { data: introductions } = useQuery({
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
        .select("*")
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
        .select("*")
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
        .select("*")
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
        .select("*")
        .eq("facility_id", selectedFacility.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFacility?.id,
  });

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

  const respondMutation = useMutation({
    mutationFn: async ({ id, response, notes }: { id: string; response: string; notes?: string }) => {
      const { error } = await supabase
        .from("concierge_introductions")
        .update({
          provider_response: response,
          provider_responded_at: new Date().toISOString(),
          provider_notes: notes || null,
        })
        .eq("id", id)
        .eq("facility_id", selectedFacility?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["placement-introductions"] });
      toast.success("Response submitted");
    },
    onError: () => toast.error("Failed to submit response"),
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

  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [careTypesModalOpen, setCareTypesModalOpen] = useState(false);
  const [deletePaymentConfirm, setDeletePaymentConfirm] = useState<{ id: string; isOpen: boolean }>({ id: "", isOpen: false });

  const handleDeletePaymentMethod = () => {
    if (deletePaymentConfirm.id) deletePaymentMethodMutation.mutate(deletePaymentConfirm.id);
    setDeletePaymentConfirm({ id: "", isOpen: false });
  };

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

  if (isLoading) {
    return (
      <div className="min-h-full bg-background px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 space-y-6">

        {/* ─── Page Header ─── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Network className="h-5 w-5 sm:h-5.5 sm:w-5.5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">Placement Network</h1>
                  <Badge variant="secondary" className="text-[10px] font-medium">
                    <Sparkles className="h-3 w-3 mr-0.5" /> Beta
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Receive matched referrals from our placement specialists
                </p>
              </div>
            </div>

            {/* Network Toggle — compact inline */}
            {optedIn && (
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="text-xs font-medium text-primary">Active</span>
                  {pendingIntroductions.length > 0 && (
                    <Badge variant="destructive" className="text-[10px] h-5 px-1.5">{pendingIntroductions.length} new</Badge>
                  )}
                </div>
                <Switch
                  checked={optedIn}
                  onCheckedChange={handleToggle}
                  disabled={optInMutation.isPending}
                />
              </div>
            )}
          </div>
        </div>

        {/* ─── Modals ─── */}
        <PlacementTermsModal open={termsModalOpen} onOpenChange={setTermsModalOpen} facilityId={selectedFacility?.id || ""} facilityName={selectedFacility?.name || "Your Facility"} />
        {paymentModalOpen && (
          <Suspense fallback={null}>
            <AddPaymentMethodModal open={paymentModalOpen} onOpenChange={setPaymentModalOpen} facilityId={selectedFacility?.id || ""} />
          </Suspense>
        )}
        <CareTypesModal open={careTypesModalOpen} onOpenChange={setCareTypesModalOpen} facilityId={selectedFacility?.id || ""} initialCareTypes={profileForm.acceptedCareTypes} />

        {/* ─── Not Opted In: Onboarding Flow ─── */}
        {!optedIn ? (
          <div className="space-y-6">
            {!isEligibleForNetwork && (
              <PlacementReadinessChecklist checks={readinessChecks} onComplete={() => optInMutation.mutate(true)} />
            )}
            <PlacementHowItWorks />
            <PlacementBenefits />
            {isEligibleForNetwork && (
              <PlacementJoinCTA isPending={optInMutation.isPending} onJoin={() => optInMutation.mutate(true)} />
            )}
          </div>
        ) : (
          /* ─── Opted In: Tabbed Dashboard ─── */
          <Tabs defaultValue="domestic" className="space-y-5">
            <div className="border-b">
              <TabsList className="h-auto p-0 bg-transparent gap-0 w-full justify-start overflow-x-auto">
                <TabsTrigger
                  value="domestic"
                  className="relative rounded-none border-b-2 border-transparent px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5"
                >
                  <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Domestic</span>
                  {pendingIntroductions.length > 0 && (
                    <Badge variant="destructive" className="text-[10px] h-4 px-1 ml-1">{pendingIntroductions.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="international"
                  className="relative rounded-none border-b-2 border-transparent px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5"
                >
                  <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">International</span>
                  <span className="sm:hidden">Intl</span>
                </TabsTrigger>
                <TabsTrigger
                  value="placed"
                  className="relative rounded-none border-b-2 border-transparent px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5"
                >
                  <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Placed</span>
                  {placements && placements.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-1">{placements.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="profile"
                  className="relative rounded-none border-b-2 border-transparent px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5"
                >
                  <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Profile</span>
                </TabsTrigger>
                <TabsTrigger
                  value="billing"
                  className="relative rounded-none border-b-2 border-transparent px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5"
                >
                  <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Billing</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── Domestic Tab ── */}
            <TabsContent value="domestic" className="mt-0">
              <DomesticCandidatesTab hasPro={!!proSubscription} />
            </TabsContent>

            {/* ── International Tab ── */}
            <TabsContent value="international" className="mt-0">
              <InternationalCandidatesTab hasPro={!!proSubscription} />
            </TabsContent>

            {/* ── Placed Tab ── */}
            <TabsContent value="placed" className="mt-0 space-y-4">
              {placements && placements.length > 0 ? (
                <div className="space-y-3">
                  {placements.map((p) => (
                    <Card key={p.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3 gap-2">
                          <p className="text-sm font-semibold truncate">Case #{p.id.slice(0, 8).toUpperCase()}</p>
                          <Badge variant="outline" className="border-primary/30 text-primary shrink-0 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Admitted
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground block text-xs mb-0.5">Placed</span>
                            <p className="font-medium text-sm">
                              {p.placement_confirmed_at && format(new Date(p.placement_confirmed_at), "MMM d, yyyy")}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-xs mb-0.5">Type</span>
                            <p className="font-medium text-sm capitalize">{p.provider_fee_type === "flat_fee" ? "Flat Fee" : p.provider_fee_type || "Flat Fee"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-xs mb-0.5">Fee</span>
                            <p className="font-medium text-sm">{p.provider_fee_cents ? `$${(p.provider_fee_cents / 100).toFixed(0)}` : "—"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">No placements yet</p>
                    <p className="text-xs text-muted-foreground">Successful placements will appear here</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── Profile Tab ── */}
            <TabsContent value="profile" className="mt-0">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Network Profile</CardTitle>
                  <CardDescription>Configure what types of patients and insurance you accept</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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

                  {/* Availability */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Current Availability</Label>
                    <Select
                      value={profileForm.availabilityStatus}
                      onValueChange={(v) => setProfileForm((p) => ({ ...p, availabilityStatus: v }))}
                    >
                      <SelectTrigger className="w-full sm:w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open for Admissions</SelectItem>
                        <SelectItem value="limited">Limited Availability</SelectItem>
                        <SelectItem value="full">Not Taking New Admissions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Admissions Contact */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Admissions Contact</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Contact Name</Label>
                        <Input
                          placeholder="Admissions Director"
                          value={profileForm.admissionsContact}
                          onChange={(e) => setProfileForm((p) => ({ ...p, admissionsContact: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <Input
                          type="email"
                          placeholder="admissions@facility.com"
                          value={profileForm.admissionsEmail}
                          onChange={(e) => setProfileForm((p) => ({ ...p, admissionsEmail: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Phone</Label>
                        <Input
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={profileForm.admissionsPhone}
                          onChange={(e) => setProfileForm((p) => ({ ...p, admissionsPhone: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Preference */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Payment Preference</Label>
                    <Select
                      value={profileForm.agreementPreference}
                      onValueChange={(v) => setProfileForm((p) => ({ ...p, agreementPreference: v }))}
                    >
                      <SelectTrigger className="w-full sm:w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat_fee">Flat Fee Per Placement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={() => saveProfileMutation.mutate()} disabled={saveProfileMutation.isPending} className="w-full sm:w-auto">
                    {saveProfileMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    Save Profile
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Billing Tab ── */}
            <TabsContent value="billing" className="mt-0 space-y-5">
              {/* Agreement Status */}
              {facilityData?.concierge_terms_accepted_at && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileSignature className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">Agreement Active</span>
                            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">v{facilityData.concierge_terms_version || "1.0"}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Signed {format(new Date(facilityData.concierge_terms_accepted_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setTermsModalOpen(true)}>
                        <FileText className="h-3.5 w-3.5" /> View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Fee Structure + Payment Methods in a 2-col grid on desktop */}
              <div className="grid md:grid-cols-2 gap-5">
                {/* Fee Structure */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" /> Fee Structure
                    </CardTitle>
                    <CardDescription className="text-xs">Charged only on confirmed admission</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Flat Fee Per Placement</p>
                      <p className="text-2xl font-bold">
                        ${proSubscription ? PLACEMENT_FEES.flat_fee.pro.toLocaleString() : PLACEMENT_FEES.flat_fee.standard.toLocaleString()}
                      </p>
                      {proSubscription ? (
                        <Badge variant="outline" className="mt-2 border-primary/30 text-primary text-[10px]">Pro: Save $200</Badge>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-2">
                          Pro members: ${PLACEMENT_FEES.flat_fee.pro.toLocaleString()} <span className="text-primary">(save $200)</span>
                        </p>
                      )}
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
                      <p className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" /> When charged?
                      </p>
                      <ul className="text-[11px] text-muted-foreground space-y-1 ml-5">
                        <li>• Only after confirmed placement</li>
                        <li>• Admission confirmed by both parties</li>
                        <li>• Invoices due within 14 days</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Methods */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" /> Payment Methods
                    </CardTitle>
                    <CardDescription className="text-xs">Required to receive referrals</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {paymentMethods && paymentMethods.length > 0 ? (
                      paymentMethods.map((pm) => (
                        <div key={pm.id} className="flex items-center justify-between p-3 border rounded-lg gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {pm.type === "ach" ? (
                              <Landmark className="h-4 w-4 text-muted-foreground shrink-0" />
                            ) : (
                              <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{pm.type === "ach" ? pm.bank_name || "Bank" : "Card"} •••• {pm.last_four}</p>
                              <p className="text-[10px] text-muted-foreground">Added {format(new Date(pm.created_at), "MMM d, yyyy")}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {pm.is_default && <Badge variant="secondary" className="text-[10px] px-1.5">Default</Badge>}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeletePaymentConfirm({ id: pm.id, isOpen: true })}
                              disabled={deletePaymentMethodMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <Alert className="py-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">Add a payment method to start receiving referrals.</AlertDescription>
                      </Alert>
                    )}
                    <Button variant="outline" className="w-full gap-2" onClick={() => setPaymentModalOpen(true)}>
                      <Plus className="h-4 w-4" /> Add Payment Method
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Invoices */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" /> Invoices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {invoices && invoices.length > 0 ? (
                    <div className="space-y-2">
                      {invoices.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg gap-2">
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
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No invoices yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Delete Payment Confirmation */}
        <AlertDialog open={deletePaymentConfirm.isOpen} onOpenChange={(open) => setDeletePaymentConfirm(prev => ({ ...prev, isOpen: open }))}>
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
