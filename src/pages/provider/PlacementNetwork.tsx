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
  UserCheck,
  Trash2,
  ExternalLink,
  Settings,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { PlacementTermsModal } from "@/components/provider/PlacementTermsModal";
import { AddPaymentMethodModal } from "@/components/provider/AddPaymentMethodModal";
import { CareTypesModal } from "@/components/provider/CareTypesModal";
import { PlacementReadinessChecklist } from "@/components/provider/PlacementReadinessChecklist";
import {
  PlacementLandingHeader,
  PlacementNetworkToggle,
  PlacementHowItWorks,
  PlacementBenefits,
  PlacementJoinCTA,
  IntroductionCard,
} from "@/components/provider/placement-network";

// Placement fee structure
const PLACEMENT_FEES = {
  flat_fee: { standard: 1200, pro: 960 },
  commission: { standard: "8%", pro: "6.4%", cap: 1500 },
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

  // Fetch facility's concierge settings
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

  // Fetch pending introductions from concierge system
  const { data: introductions } = useQuery({
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

  // Fetch past placements (confirmed cases from concierge system)
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

  // Fetch payment methods
  const { data: paymentMethods } = useQuery({
    queryKey: ["provider-payment-methods", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data, error } = await (supabase as any)
        .from("provider_payment_methods")
        .select("*")
        .eq("facility_id", selectedFacility.id)
        .order("is_default", { ascending: false });

      if (error) return [];
      return data || [];
    },
    enabled: !!selectedFacility?.id,
  });

  // Fetch placement invoices
  const { data: invoices } = useQuery({
    queryKey: ["placement-invoices", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data, error } = await (supabase as any)
        .from("placement_invoices")
        .select("*")
        .eq("facility_id", selectedFacility.id)
        .order("created_at", { ascending: false });

      if (error) return [];
      return data || [];
    },
    enabled: !!selectedFacility?.id,
  });

  // Check for Pro subscription
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

  // Update form when data loads
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

  // Opt-in mutation
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
    onError: () => {
      toast.error("Failed to update network status");
    },
  });

  // Save profile mutation
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
    onError: () => {
      toast.error("Failed to save profile");
    },
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

  // Delete payment method mutation
  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const { error } = await (supabase as any)
        .from("provider_payment_methods")
        .delete()
        .eq("id", paymentMethodId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-payment-methods"] });
      toast.success("Payment method removed");
    },
    onError: () => {
      toast.error("Failed to remove payment method");
    },
  });

  const toggleArrayValue = (field: "acceptedCareTypes" | "acceptedInsurance", value: string) => {
    setProfileForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  // Modal states
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [careTypesModalOpen, setCareTypesModalOpen] = useState(false);

  const optedIn = facilityData?.concierge_network_opted_in || false;
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

  // Readiness checks for placement network
  const hasCompleteProfile = !!(facilityData?.name && facilityData?.address && facilityData?.phone);
  const hasTermsAccepted = !!facilityData?.concierge_terms_accepted_at;
  const hasPaymentMethod = paymentMethods && paymentMethods.length > 0;
  // Use facilityData directly to check care types (not the form state which initializes empty)
  const hasCareTypes = Array.isArray(facilityData?.concierge_accepted_care_types) && 
    (facilityData.concierge_accepted_care_types as string[]).length > 0;
  

  const readinessChecks = [
    {
      key: "profile",
      label: "Complete facility profile",
      description: "Ensure your facility name, address, and phone are filled in",
      complete: hasCompleteProfile,
      required: true,
    },
    {
      key: "terms",
      label: "Accept placement terms",
      description: "Review and sign the placement network agreement",
      complete: hasTermsAccepted,
      required: true,
      action: () => setTermsModalOpen(true),
      actionLabel: "Accept Terms",
    },
    {
      key: "payment",
      label: "Add payment method",
      description: "Add a card to be charged only on confirmed placements",
      complete: !!hasPaymentMethod,
      required: true,
      action: () => setPaymentModalOpen(true),
      actionLabel: "Add Payment",
    },
    {
      key: "care_types",
      label: "Select accepted care types",
      description: "Tell us what types of patients you can accept",
      complete: hasCareTypes,
      required: true,
      action: () => setCareTypesModalOpen(true),
      actionLabel: "Select Types",
    },
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
      <div className="min-h-full bg-background px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header with Network Toggle */}
        <PlacementLandingHeader
          statusSlot={
            optedIn ? (
              <PlacementNetworkToggle
                optedIn={optedIn}
                optedInAt={facilityData?.concierge_opted_in_at || null}
                pendingCount={pendingIntroductions.length}
                isEligible={isEligibleForNetwork}
                isPending={optInMutation.isPending}
                onToggle={handleToggle}
              />
            ) : undefined
          }
        />

        {/* Modals */}
        <PlacementTermsModal
          open={termsModalOpen}
          onOpenChange={setTermsModalOpen}
          facilityId={selectedFacility?.id || ""}
          facilityName={selectedFacility?.name || "Your Facility"}
        />
        <AddPaymentMethodModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          facilityId={selectedFacility?.id || ""}
        />
        <CareTypesModal
          open={careTypesModalOpen}
          onOpenChange={setCareTypesModalOpen}
          facilityId={selectedFacility?.id || ""}
          initialCareTypes={profileForm.acceptedCareTypes}
        />

        {/* Readiness Checklist - Show when not opted in and not fully ready */}
        {!optedIn && !isEligibleForNetwork && (
          <PlacementReadinessChecklist checks={readinessChecks} onComplete={() => optInMutation.mutate(true)} />
        )}

        {!optedIn ? (
          <>
            <PlacementHowItWorks />
            <PlacementBenefits />
            {isEligibleForNetwork && (
              <PlacementJoinCTA isPending={optInMutation.isPending} onJoin={() => optInMutation.mutate(true)} />
            )}
          </>
        ) : (
          /* Opted-In View */
          <Tabs defaultValue="introductions" className="space-y-4 sm:space-y-6">
            <TabsList className="w-full grid grid-cols-4 h-10 sm:h-11">
              <TabsTrigger value="introductions" className="gap-1 sm:gap-1.5 text-xs sm:text-sm px-1 sm:px-3 relative">
                <Bell className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Introductions</span>
                {pendingIntroductions.length > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 sm:relative sm:top-0 sm:right-0 sm:ml-1 h-4 sm:h-5 min-w-4 sm:min-w-5 px-1 sm:px-1.5 text-[9px] sm:text-[10px]">
                    {pendingIntroductions.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-1 sm:gap-1.5 text-xs sm:text-sm px-1 sm:px-3">
                <Settings className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="gap-1 sm:gap-1.5 text-xs sm:text-sm px-1 sm:px-3">
                <CreditCard className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Billing</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1 sm:gap-1.5 text-xs sm:text-sm px-1 sm:px-3">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Placements</span>
              </TabsTrigger>
            </TabsList>

            {/* Introductions Tab */}
            <TabsContent value="introductions" className="space-y-4">
              {/* Awaiting Provider Confirmation - Top Priority */}
              {awaitingProviderConfirm.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h3 className="text-sm font-semibold text-emerald-600 flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Awaiting Your Confirmation ({awaitingProviderConfirm.length})
                  </h3>
                  {awaitingProviderConfirm.map((intro) => (
                    <IntroductionCard
                      key={`confirm-${intro.id}`}
                      introduction={intro}
                      facilityId={selectedFacility?.id || ""}
                      onRespond={(response, notes) => respondMutation.mutate({ id: intro.id, response, notes })}
                      isResponding={respondMutation.isPending}
                      showConfirmButton
                      hasPro={!!proSubscription}
                    />
                  ))}
                </div>
              )}

              {/* Pending Introductions */}
              {pendingIntroductions.length > 0 ? (
                pendingIntroductions.map((intro) => (
                  <IntroductionCard
                    key={intro.id}
                    introduction={intro}
                    facilityId={selectedFacility?.id || ""}
                    onRespond={(response, notes) => respondMutation.mutate({ id: intro.id, response, notes })}
                    isResponding={respondMutation.isPending}
                    hasPro={!!proSubscription}
                  />
                ))
              ) : awaitingProviderConfirm.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-16 text-center">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Bell className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-foreground mb-1">No pending introductions</p>
                    <p className="text-sm text-muted-foreground">We'll notify you when there's a match</p>
                  </CardContent>
                </Card>
              ) : null}

              {/* Past Introductions */}
              {introductions &&
                introductions.filter((i) => i.provider_response && i.provider_response !== "pending").length > 0 && (
                  <div className="space-y-3 pt-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Past Responses</h3>
                    {introductions
                      .filter((i) => i.provider_response && i.provider_response !== "pending")
                      .slice(0, 5)
                      .map((intro) => (
                        <Card key={intro.id} className="bg-muted/30">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">
                                Case #{intro.concierge_inquiries?.id?.slice(0, 8).toUpperCase() || intro.id.slice(0, 8).toUpperCase()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Responded {intro.provider_responded_at && format(new Date(intro.provider_responded_at), "MMM d")}
                              </p>
                            </div>
                            <Badge variant="secondary" className="capitalize">
                              {intro.provider_response}
                            </Badge>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Network Profile</CardTitle>
                  <CardDescription>Tell us what types of patients you can accept</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 sm:space-y-6">
                  {/* Care Types */}
                  <div className="space-y-2 sm:space-y-3">
                    <Label className="text-sm font-medium">Accepted Care Types</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CARE_TYPES.map((type) => (
                        <Label
                          key={type.value}
                          className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg border cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-colors"
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
                  <div className="space-y-2 sm:space-y-3">
                    <Label className="text-sm font-medium">Accepted Insurance</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                      {INSURANCE_OPTIONS.map((ins) => (
                        <Label
                          key={ins}
                          className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg border cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-colors"
                        >
                          <Checkbox
                            checked={profileForm.acceptedInsurance.includes(ins.toLowerCase().replace(/\s/g, "_"))}
                            onCheckedChange={() => toggleArrayValue("acceptedInsurance", ins.toLowerCase().replace(/\s/g, "_"))}
                          />
                          <span className="text-[11px] sm:text-xs leading-tight">{ins}</span>
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
                      <SelectTrigger>
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
                  <div className="space-y-3 sm:space-y-4">
                    <Label className="text-sm font-medium">Admissions Contact (for placement cases)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-xs text-muted-foreground">Contact Name</Label>
                        <Input
                          placeholder="Admissions Director"
                          value={profileForm.admissionsContact}
                          onChange={(e) => setProfileForm((p) => ({ ...p, admissionsContact: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <Input
                          type="email"
                          placeholder="admissions@facility.com"
                          value={profileForm.admissionsEmail}
                          onChange={(e) => setProfileForm((p) => ({ ...p, admissionsEmail: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
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

                  {/* Agreement Preference */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Payment Preference</Label>
                    <Select
                      value={profileForm.agreementPreference}
                      onValueChange={(v) => setProfileForm((p) => ({ ...p, agreementPreference: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="commission">Prefer Commission (% of first month)</SelectItem>
                        <SelectItem value="flat_fee">Prefer Flat Fee</SelectItem>
                        <SelectItem value="either">Open to Either</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={() => saveProfileMutation.mutate()}
                    disabled={saveProfileMutation.isPending}
                    className="w-full"
                  >
                    {saveProfileMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Save Profile
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing" className="space-y-4 sm:space-y-6">
              {/* Signed Agreement Status */}
              {facilityData?.concierge_terms_accepted_at && (
                <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <FileSignature className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
                      Agreement Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Terms Accepted</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Signed on</p>
                        <p className="text-sm font-medium">
                          {format(new Date(facilityData.concierge_terms_accepted_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Terms Version</p>
                        <p className="text-sm font-medium">{facilityData.concierge_terms_version || "1.0"}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2 mt-2 w-full sm:w-auto" onClick={() => setTermsModalOpen(true)}>
                      <FileText className="h-4 w-4" />
                      View Agreement
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Fee Structure */}
              <Card>
                <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                    Placement Fee Structure
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">You only pay when a placement is confirmed by both parties</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-3 sm:p-4 rounded-xl border bg-muted/30">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Flat Fee</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        ${proSubscription ? PLACEMENT_FEES.flat_fee.pro : PLACEMENT_FEES.flat_fee.standard}
                      </p>
                      {proSubscription ? (
                        <Badge variant="outline" className="mt-2 border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-[10px] sm:text-xs">
                          Pro: 20% off
                        </Badge>
                      ) : (
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                          Pro: ${PLACEMENT_FEES.flat_fee.pro} <span className="text-primary">(save $240)</span>
                        </p>
                      )}
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl border bg-muted/30">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Commission</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {proSubscription ? PLACEMENT_FEES.commission.pro : PLACEMENT_FEES.commission.standard}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">of 1st mo. (max ${PLACEMENT_FEES.commission.cap})</p>
                      {!proSubscription && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          Pro: {PLACEMENT_FEES.commission.pro} <span className="text-primary">(20% off)</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* When charged FAQ */}
                  <div className="p-3 sm:p-4 rounded-lg bg-muted/50 border border-dashed">
                    <p className="text-xs sm:text-sm font-medium flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                      When will I be charged?
                    </p>
                    <ul className="text-[11px] sm:text-xs text-muted-foreground space-y-1 sm:space-y-1.5 ml-5 sm:ml-6">
                      <li>• Fees are charged only after confirmed placement</li>
                      <li>• Both you and the family must confirm admission</li>
                      <li>• Invoices are due within 14 days</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card>
                <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                    Payment Methods
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Add a payment method to receive placement referrals</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
                  {paymentMethods && paymentMethods.length > 0 ? (
                    paymentMethods.map((pm: any) => (
                      <div key={pm.id} className="flex items-center justify-between p-2.5 sm:p-3 border rounded-lg gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          {pm.type === "ach" ? (
                            <Landmark className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                          ) : (
                            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {pm.type === "ach" ? pm.bank_name || "Bank" : "Card"} •••• {pm.last_four}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Added {format(new Date(pm.created_at), "MMM d, yyyy")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                          {pm.is_default && <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2">Default</Badge>}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              if (confirm("Remove this payment method?")) {
                                deletePaymentMethodMutation.mutate(pm.id);
                              }
                            }}
                            disabled={deletePaymentMethodMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <Alert className="py-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs sm:text-sm">
                        Add a payment method to start receiving placement referrals.
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button variant="outline" className="w-full gap-2" onClick={() => setPaymentModalOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add Payment Method
                  </Button>
                </CardContent>
              </Card>

              {/* Invoices */}
              <Card>
                <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                    Invoices
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  {invoices && invoices.length > 0 ? (
                    <div className="space-y-2">
                      {invoices.map((inv: any) => (
                        <div key={inv.id} className="flex items-center justify-between p-2.5 sm:p-3 border rounded-lg gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">${(inv.amount_cents / 100).toFixed(2)}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">{format(new Date(inv.created_at), "MMM d, yyyy")}</p>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="capitalize text-[10px] sm:text-xs px-1.5 sm:px-2">
                              {inv.status}
                            </Badge>
                            {inv.status === "paid" && inv.receipt_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                asChild
                              >
                                <a href={inv.receipt_url} target="_blank" rel="noopener noreferrer" title="View Receipt">
                                  <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-8">
                      <p className="text-sm text-muted-foreground">No invoices yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Placements Tab */}
            <TabsContent value="history" className="space-y-3 sm:space-y-4">
              {placements && placements.length > 0 ? (
                placements.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                        <p className="text-sm font-medium truncate">Case #{p.id.slice(0, 8).toUpperCase()}</p>
                        <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 shrink-0 text-[10px] sm:text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Admitted
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                        <div>
                          <span className="text-muted-foreground block text-[10px] sm:text-xs mb-0.5">Placed</span>
                          <p className="font-medium">
                            {p.placement_confirmed_at && format(new Date(p.placement_confirmed_at), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] sm:text-xs mb-0.5">Type</span>
                          <p className="font-medium capitalize">{p.provider_fee_type === "flat_fee" ? "Flat" : p.provider_fee_type || "Flat"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] sm:text-xs mb-0.5">Fee</span>
                          <p className="font-medium">{p.provider_fee_cents ? `$${(p.provider_fee_cents / 100).toFixed(0)}` : "—"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-10 sm:py-16 text-center">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">No placements yet</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Successful placements will appear here</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
