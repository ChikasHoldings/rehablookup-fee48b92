import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { toast } from "sonner";
import { 
  Network, 
  Users, 
  Check,
  ArrowRight,
  Shield,
  Settings,
  Bell,
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import { PlacementReadinessChecklist } from "@/components/provider/PlacementReadinessChecklist";

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

const PLACEMENT_BENEFITS = [
  "Receive matched inquiries from our placement team",
  "Families pre-screened for treatment readiness",
  "Higher conversion rates from qualified referrals",
  "Commission or flat fee arrangements",
  "No upfront cost—pay only on successful placement",
  "Pro subscribers save 20% on every placement fee",
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
        .select("concierge_network_opted_in, concierge_opted_in_at, concierge_accepted_care_types, concierge_accepted_insurance, concierge_availability_status, concierge_admissions_contact, concierge_admissions_email, concierge_admissions_phone, concierge_agreement_preference, concierge_terms_accepted_at, concierge_terms_version, name, address, phone")
        .eq("id", selectedFacility.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedFacility?.id,
  });

  // Fetch pending introductions
  const { data: introductions } = useQuery({
    queryKey: ["placement-introductions", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data, error } = await supabase
        .from("placement_case_providers")
        .select(`
          *,
          placement_cases (
            id, seeker_name, level_of_care, payment_type, urgency, preferred_states, status
          )
        `)
        .eq("facility_id", selectedFacility.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedFacility?.id,
  });

  // Fetch past placements
  const { data: placements } = useQuery({
    queryKey: ["facility-placements", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data, error } = await supabase
        .from("placement_cases")
        .select("*")
        .eq("admitted_facility_id", selectedFacility.id)
        .order("admitted_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedFacility?.id,
  });

  // Fetch payment methods - using type assertion since types may not be updated yet
  const { data: paymentMethods, isLoading: paymentMethodsLoading } = useQuery({
    queryKey: ["provider-payment-methods", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      // Use type assertion since table may not be in generated types yet
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
      // Use type assertion since table may not be in generated types yet
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
        .from("placement_case_providers")
        .update({
          provider_response: response,
          responded_at: new Date().toISOString(),
          availability_notes: notes || null,
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

  const optedIn = facilityData?.concierge_network_opted_in || false;
  const pendingIntroductions = introductions?.filter((i) => i.provider_response === "pending") || [];

  // Readiness checks for placement network
  const hasCompleteProfile = !!(facilityData?.name && facilityData?.address && facilityData?.phone);
  const hasTermsAccepted = !!facilityData?.concierge_terms_accepted_at;
  const hasPaymentMethod = paymentMethods && paymentMethods.length > 0;
  const hasCareTypes = profileForm.acceptedCareTypes.length > 0;
  
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
    },
  ];

  const isEligibleForNetwork = readinessChecks.filter((c) => c.required).every((c) => c.complete);

  if (isLoading) {
    return (
      <div className="min-h-full bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 mb-4">
            <Network className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Placement Network</h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Receive matched placement referrals from families working with our specialists
          </p>
        </div>

        {/* Opt-in Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Placement Network</h3>
                  <p className="text-sm text-muted-foreground">
                    {optedIn 
                      ? `Active since ${facilityData?.concierge_opted_in_at ? format(new Date(facilityData.concierge_opted_in_at), "MMM d, yyyy") : "—"}`
                      : "Opt in to receive placement referrals"
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {optedIn && (
                  <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                )}
                {pendingIntroductions.length > 0 && (
                  <Badge variant="destructive">{pendingIntroductions.length} pending</Badge>
                )}
                <Switch
                  checked={optedIn}
                  onCheckedChange={(checked) => {
                    if (checked && !isEligibleForNetwork) {
                      toast.error("Please complete all setup steps first");
                      return;
                    }
                    optInMutation.mutate(checked);
                  }}
                  disabled={optInMutation.isPending || (optedIn === false && !isEligibleForNetwork)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Readiness Checklist - Show when not opted in and not fully ready */}
        {!optedIn && !isEligibleForNetwork && (
          <PlacementReadinessChecklist
            checks={readinessChecks}
            onComplete={() => optInMutation.mutate(true)}
          />
        )}

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

        {!optedIn ? (
          <>
            {/* How it Works */}
            <div className="space-y-4 mb-8">
              <h2 className="text-xl font-semibold text-foreground">How it Works</h2>
              <div className="grid gap-4">
                {[
                  { num: 1, title: "Families Request Help", desc: "Families submit detailed intake forms through our placement service" },
                  { num: 2, title: "We Match to Your Facility", desc: "Our team reviews cases and matches families to facilities that fit their needs" },
                  { num: 3, title: "You Receive Introductions", desc: "Review case details and respond with your availability" },
                  { num: 4, title: "Pay on Success", desc: "Commission or flat fee—only when a patient is admitted" },
                ].map((step) => (
                  <Card key={step.num}>
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                        {step.num}
                      </div>
                      <div>
                        <h3 className="font-medium">{step.title}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">{step.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  Network Benefits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {PLACEMENT_BENEFITS.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* CTA - Only show when eligible */}
            {isEligibleForNetwork && (
              <div className="text-center">
                <Button 
                  size="lg" 
                  className="gap-2"
                  onClick={() => optInMutation.mutate(true)}
                  disabled={optInMutation.isPending}
                >
                  {optInMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Network className="h-4 w-4" />
                  )}
                  Join Placement Network
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Pay only on successful placement. No upfront costs.
                </p>
              </div>
            )}
          </>
        ) : (
          /* Opted-In View */
          <Tabs defaultValue="introductions" className="space-y-6">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="introductions" className="gap-1 text-xs sm:text-sm">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Introductions</span>
                {pendingIntroductions.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                    {pendingIntroductions.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-1 text-xs sm:text-sm">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="gap-1 text-xs sm:text-sm">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Billing</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1 text-xs sm:text-sm">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Placements</span>
              </TabsTrigger>
            </TabsList>

            {/* Introductions Tab */}
            <TabsContent value="introductions" className="space-y-4">
              {pendingIntroductions.length > 0 ? (
                pendingIntroductions.map((intro) => (
                  <IntroductionCard
                    key={intro.id}
                    introduction={intro}
                    onRespond={(response, notes) =>
                      respondMutation.mutate({ id: intro.id, response, notes })
                    }
                    isResponding={respondMutation.isPending}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No pending introductions</p>
                    <p className="text-sm text-muted-foreground">
                      We'll notify you when there's a match
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Past Introductions */}
              {introductions && introductions.filter((i) => i.provider_response !== "pending").length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Past Responses</h3>
                  {introductions
                    .filter((i) => i.provider_response !== "pending")
                    .slice(0, 5)
                    .map((intro) => (
                      <Card key={intro.id} className="opacity-75">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              Case #{intro.placement_cases?.id.slice(0, 8).toUpperCase()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Responded {intro.responded_at && format(new Date(intro.responded_at), "MMM d")}
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
                  <CardDescription>
                    Tell us what types of patients you can accept
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Care Types */}
                  <div className="space-y-3">
                    <Label>Accepted Care Types</Label>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {CARE_TYPES.map((type) => (
                        <Label
                          key={type.value}
                          className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
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
                    <Label>Accepted Insurance</Label>
                    <div className="grid sm:grid-cols-3 gap-2">
                      {INSURANCE_OPTIONS.map((ins) => (
                        <Label
                          key={ins}
                          className="flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                        >
                          <Checkbox
                            checked={profileForm.acceptedInsurance.includes(ins.toLowerCase().replace(/\s/g, "_"))}
                            onCheckedChange={() => toggleArrayValue("acceptedInsurance", ins.toLowerCase().replace(/\s/g, "_"))}
                          />
                          <span className="text-xs">{ins}</span>
                        </Label>
                      ))}
                    </div>
                  </div>

                  {/* Availability */}
                  <div className="space-y-2">
                    <Label>Current Availability</Label>
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
                  <div className="space-y-4">
                    <Label className="text-base">Admissions Contact (for placement cases)</Label>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Contact Name</Label>
                        <Input
                          placeholder="Admissions Director"
                          value={profileForm.admissionsContact}
                          onChange={(e) => setProfileForm((p) => ({ ...p, admissionsContact: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Email</Label>
                        <Input
                          type="email"
                          placeholder="admissions@facility.com"
                          value={profileForm.admissionsEmail}
                          onChange={(e) => setProfileForm((p) => ({ ...p, admissionsEmail: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Phone</Label>
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
                    <Label>Payment Preference</Label>
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
            <TabsContent value="billing" className="space-y-6">
              {/* Signed Agreement Status */}
              {facilityData?.concierge_terms_accepted_at && (
                <Card className="border-emerald-500/30 bg-emerald-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileSignature className="h-5 w-5 text-emerald-600" />
                      Agreement Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700">Terms Accepted</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Signed on</p>
                        <p className="font-medium">{format(new Date(facilityData.concierge_terms_accepted_at), "MMM d, yyyy 'at' h:mm a")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Terms Version</p>
                        <p className="font-medium">{facilityData.concierge_terms_version || "1.0"}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 mt-2"
                      onClick={() => setTermsModalOpen(true)}
                    >
                      <FileText className="h-4 w-4" />
                      View Agreement
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Fee Structure */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Placement Fee Structure
                  </CardTitle>
                  <CardDescription>
                    You only pay when a placement is confirmed by both parties
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <p className="text-sm text-muted-foreground mb-1">Flat Fee</p>
                      <p className="text-xl font-bold">
                        ${proSubscription ? PLACEMENT_FEES.flat_fee.pro : PLACEMENT_FEES.flat_fee.standard}
                      </p>
                      {proSubscription ? (
                        <Badge className="mt-2 bg-emerald-100 text-emerald-700">Pro: 20% off</Badge>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                          Pro: ${PLACEMENT_FEES.flat_fee.pro} <span className="text-primary">(save $240)</span>
                        </p>
                      )}
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <p className="text-sm text-muted-foreground mb-1">Commission</p>
                      <p className="text-xl font-bold">
                        {proSubscription ? PLACEMENT_FEES.commission.pro : PLACEMENT_FEES.commission.standard}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">of first month (max ${PLACEMENT_FEES.commission.cap})</p>
                      {!proSubscription && (
                        <p className="text-xs text-muted-foreground">
                          Pro: {PLACEMENT_FEES.commission.pro} <span className="text-primary">(20% off)</span>
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* When charged FAQ */}
                  <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
                    <p className="text-sm font-medium flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      When will I be charged?
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                      <li>• Fees are charged only after confirmed placement</li>
                      <li>• Both you and the family must confirm admission</li>
                      <li>• Invoices are due within 14 days</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Methods
                  </CardTitle>
                  <CardDescription>
                    Add a payment method to receive placement referrals
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {paymentMethods && paymentMethods.length > 0 ? (
                    paymentMethods.map((pm: any) => (
                      <div key={pm.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {pm.type === 'ach' ? (
                            <Landmark className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium">
                              {pm.type === 'ach' ? pm.bank_name || 'Bank Account' : 'Card'} •••• {pm.last_four}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Added {format(new Date(pm.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        {pm.is_default && <Badge variant="secondary">Default</Badge>}
                      </div>
                    ))
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Add a payment method to start receiving placement referrals. You'll only be charged on confirmed placements.
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => setPaymentModalOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add Payment Method
                  </Button>
                </CardContent>
              </Card>

              {/* Invoices */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Invoices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {invoices && invoices.length > 0 ? (
                    <div className="space-y-2">
                      {invoices.map((inv: any) => (
                        <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">
                              ${(inv.amount_cents / 100).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(inv.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                          <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'} className="capitalize">
                            {inv.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-6">No invoices yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Placements Tab */}
            <TabsContent value="history" className="space-y-4">
              {placements && placements.length > 0 ? (
                placements.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">Case #{p.id.slice(0, 8).toUpperCase()}</p>
                        <Badge className="bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Admitted
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Admitted:</span>
                          <p className="font-medium">
                            {p.admitted_at && format(new Date(p.admitted_at), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <p className="font-medium capitalize">{p.monetization_type || "—"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <p className="font-medium capitalize">{p.terms_status || "—"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No placements yet</p>
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

// Introduction Card Component
interface IntroductionCardProps {
  introduction: any;
  onRespond: (response: string, notes?: string) => void;
  isResponding: boolean;
}

function IntroductionCard({ introduction, onRespond, isResponding }: IntroductionCardProps) {
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const caseData = introduction.placement_cases;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <Badge className="bg-amber-100 text-amber-700 mb-2">
              <Clock className="h-3 w-3 mr-1" />
              New Introduction
            </Badge>
            <h3 className="font-semibold">Case #{caseData?.id?.slice(0, 8).toUpperCase()}</h3>
            <p className="text-sm text-muted-foreground">
              Received {format(new Date(introduction.created_at), "MMM d 'at' h:mm a")}
            </p>
          </div>
        </div>

        {/* Case Details */}
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <span className="text-muted-foreground">Level of Care:</span>
            <p className="font-medium capitalize">{caseData?.level_of_care?.replace(/_/g, " ") || "—"}</p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Payment:</span>
            <p className="font-medium capitalize">{caseData?.payment_type?.replace(/_/g, " ") || "—"}</p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Urgency:</span>
            <p className="font-medium capitalize">{caseData?.urgency?.replace(/_/g, " ") || "—"}</p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Location:</span>
            <p className="font-medium">
              {caseData?.preferred_states?.join(", ") || "Flexible"}
            </p>
          </div>
        </div>

        {/* Response Actions */}
        {showNotes && (
          <div className="space-y-2">
            <Textarea
              placeholder="Any notes about your availability or the case..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => onRespond("interested", notes)}
            disabled={isResponding}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Interested
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (!showNotes) {
                setShowNotes(true);
              } else {
                onRespond("limited", notes);
              }
            }}
            disabled={isResponding}
          >
            Limited Availability
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRespond("not_available")}
            disabled={isResponding}
          >
            Not Available
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
