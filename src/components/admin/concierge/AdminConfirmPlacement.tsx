import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { CheckCircle2, CalendarIcon, Loader2, ShieldAlert, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface AdminConfirmPlacementProps {
  caseData: ConciergeInquiry;
  onRefresh: () => void;
}

// Default prices
const DEFAULT_DOMESTIC = 100000;
const DEFAULT_INTERNATIONAL = 300000;
const DEFAULT_PRO_DISCOUNT = 20;

export function AdminConfirmPlacement({ caseData, onRefresh }: AdminConfirmPlacementProps) {
  const queryClient = useQueryClient();
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");
  const [admittedDate, setAdmittedDate] = useState<Date>(new Date());

  // Fetch placement fees from platform_settings
  const { data: feeConfig } = useQuery({
    queryKey: ["placement-fee-config"],
    queryFn: async () => {
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["placement_fee_domestic", "placement_fee_international", "pro_discount_percent"]);

      let domestic = DEFAULT_DOMESTIC;
      let international = DEFAULT_INTERNATIONAL;
      let proDiscount = DEFAULT_PRO_DISCOUNT;

      if (settings) {
        for (const s of settings) {
          const val = s.setting_value as Record<string, number>;
          if (s.setting_key === "placement_fee_domestic") domestic = val?.cents ?? DEFAULT_DOMESTIC;
          if (s.setting_key === "placement_fee_international") international = val?.cents ?? DEFAULT_INTERNATIONAL;
          if (s.setting_key === "pro_discount_percent") proDiscount = val?.value ?? DEFAULT_PRO_DISCOUNT;
        }
      }

      return { domestic, international, proDiscount };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch interested facilities
  const { data: interestedFacilities } = useQuery({
    queryKey: ["interested-facilities", caseData.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_introductions")
        .select(`facility_id, facility:facilities(id, name, city, state)`)
        .eq("inquiry_id", caseData.id)
        .eq("provider_response", "interested");
      if (error) throw error;
      return data;
    },
  });

  // Check Pro status for selected facility
  const { data: selectedProStatus } = useQuery({
    queryKey: ["facility-pro-status", selectedFacilityId],
    queryFn: async () => {
      if (!selectedFacilityId) return null;
      const { data } = await supabase
        .from("pro_subscriptions")
        .select("status, unlock_discount_percent")
        .eq("facility_id", selectedFacilityId)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    enabled: !!selectedFacilityId,
  });

  // Domestic intake is free ($0); any non-zero intake payment indicates an international case.
  const isInternational = (caseData.payment_amount_cents ?? 0) > 0;
  const baseFee = isInternational
    ? (feeConfig?.international ?? DEFAULT_INTERNATIONAL)
    : (feeConfig?.domestic ?? DEFAULT_DOMESTIC);
  const hasPro = !!selectedProStatus;
  const discountPercent = hasPro
    ? (selectedProStatus?.unlock_discount_percent ?? feeConfig?.proDiscount ?? DEFAULT_PRO_DISCOUNT)
    : 0;
  const finalFee = hasPro ? Math.round(baseFee * (1 - discountPercent / 100)) : baseFee;

  const confirmPlacementMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFacilityId) throw new Error("No facility selected");

      const response = await supabase.functions.invoke("confirm-placement", {
        body: {
          inquiryId: caseData.id,
          facilityId: selectedFacilityId,
          confirmationType: "admin",
          admittedAt: admittedDate.toISOString(),
          isInternational,
        },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Admission confirmed! Billing has been triggered.");
      queryClient.invalidateQueries({ queryKey: ["case-events", caseData.id] });
      queryClient.invalidateQueries({ queryKey: ["placement-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["case-invoice", caseData.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-concierge-cases-full"] });
      queryClient.invalidateQueries({ queryKey: ["admin-concierge-stats"] });
      onRefresh();
    },
    onError: (error) => {
      toast.error("Failed to confirm placement: " + error.message);
    },
  });

  // Already admitted/billed/completed
  const TERMINAL = ["admitted", "billed", "completed"];
  if (TERMINAL.includes(caseData.status) || caseData.placement_confirmed) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20">
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-800 dark:text-emerald-400">✅ Admission Confirmed</p>
              {caseData.placement_confirmed_at && (
                <p className="text-sm text-muted-foreground">
                  Confirmed on {format(new Date(caseData.placement_confirmed_at), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-100/50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              💰 Billing initiated — check Billing tab for invoice status
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasInterestedFacilities = interestedFacilities && interestedFacilities.length > 0;

  return (
    <Card className="border-primary/50">
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Confirm Admission
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Confirms admission and auto-triggers billing. Only admins can perform this action.
        </p>
      </CardHeader>
      <CardContent className="py-2 space-y-4">
        {!hasInterestedFacilities ? (
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            <ShieldAlert className="h-4 w-4 inline mr-2" />
            No facilities have accepted this candidate yet.
          </div>
        ) : (
          <>
            {/* Select Facility */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Admitting Facility</label>
              <Select value={selectedFacilityId} onValueChange={setSelectedFacilityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose facility..." />
                </SelectTrigger>
                <SelectContent>
                  {interestedFacilities.map((intro) => (
                    <SelectItem key={intro.facility_id} value={intro.facility_id}>
                      {(intro.facility as any)?.name} - {(intro.facility as any)?.city}, {(intro.facility as any)?.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Admission Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Admission Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !admittedDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {admittedDate ? format(admittedDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={admittedDate}
                    onSelect={(date) => date && setAdmittedDate(date)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Dynamic Fee Notice */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-400">
                    Placement Fee: ${(finalFee / 100).toLocaleString()}
                    {isInternational ? " (International)" : " (Domestic)"}
                  </p>
                  {hasPro ? (
                    <p className="text-amber-700 dark:text-amber-500 text-xs mt-1">
                      <Badge variant="outline" className="text-xs mr-1">PRO</Badge>
                      {discountPercent}% discount applied (base: ${(baseFee / 100).toLocaleString()})
                    </p>
                  ) : (
                    <p className="text-amber-700 dark:text-amber-500 text-xs mt-1">
                      Standard pricing. Pro facilities receive {feeConfig?.proDiscount ?? DEFAULT_PRO_DISCOUNT}% discount.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Confirm Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" disabled={!selectedFacilityId}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Admission & Bill
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm admission & trigger billing?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark the case as admitted and generate a ${(finalFee / 100).toLocaleString()} placement fee invoice.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => confirmPlacementMutation.mutate()}
                    disabled={confirmPlacementMutation.isPending}
                  >
                    {confirmPlacementMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Confirm & Bill
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}
