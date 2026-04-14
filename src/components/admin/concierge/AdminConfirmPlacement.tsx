import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { CheckCircle2, CalendarIcon, Loader2, ShieldAlert, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import { useQuery } from "@tanstack/react-query";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface AdminConfirmPlacementProps {
  caseData: ConciergeInquiry;
  onRefresh: () => void;
}

export function AdminConfirmPlacement({ caseData, onRefresh }: AdminConfirmPlacementProps) {
  const queryClient = useQueryClient();
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");
  const [admittedDate, setAdmittedDate] = useState<Date>(new Date());

  // Fetch interested facilities from introductions
  const { data: interestedFacilities } = useQuery({
    queryKey: ["interested-facilities", caseData.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_introductions")
        .select(`
          facility_id,
          facility:facilities(id, name, city, state)
        `)
        .eq("inquiry_id", caseData.id)
        .eq("provider_response", "interested");

      if (error) throw error;
      return data;
    },
  });

  // Detect international case by payment amount ($299 = international)
  const isInternational = caseData.payment_amount_cents >= 29900;

  const confirmPlacementMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFacilityId) throw new Error("No facility selected");

      // Use ONLY the edge function for confirmation - it handles all updates atomically
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
      toast.success("Placement confirmed! Invoice has been generated.");
      queryClient.invalidateQueries({ queryKey: ["case-events", caseData.id] });
      queryClient.invalidateQueries({ queryKey: ["placement-invoices"] });
      onRefresh();
    },
    onError: (error) => {
      toast.error("Failed to confirm placement: " + error.message);
    },
  });

  // Don't show if already placed
  if (caseData.status === "placed" || caseData.placement_confirmed) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20">
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-800 dark:text-emerald-400">✅ Admission Successful</p>
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
              💰 Placement completed — billing initiated
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
          Confirm Admission (Brokerage Control)
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Only admins can confirm placements to ensure fee collection and coordination.
        </p>
      </CardHeader>
      <CardContent className="py-2 space-y-4">
        {!hasInterestedFacilities ? (
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            <ShieldAlert className="h-4 w-4 inline mr-2" />
            No facilities have accepted this candidate yet. Send introductions and wait for provider responses.
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
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !admittedDate && "text-muted-foreground"
                    )}
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

            {/* Fee Notice */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                <div className="flex items-start gap-2">
                  <DollarSign className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-400">
                      Placement Fee: {isInternational ? "$3,000" : "$1,000"}
                      {isInternational ? " (International)" : " (Domestic)"}
                    </p>
                    <p className="text-amber-700 dark:text-amber-500 text-xs mt-1">
                      Invoice auto-generated. Pro facilities receive 20% discount
                      {isInternational ? " ($2,400)" : " ($800)"}.
                    </p>
                  </div>
                </div>
              </div>

            {/* Confirm Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" disabled={!selectedFacilityId}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Placement
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm this placement?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark the case as placed and generate a placement fee invoice for the facility. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => confirmPlacementMutation.mutate()}
                    disabled={confirmPlacementMutation.isPending}
                  >
                    {confirmPlacementMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Confirm Placement
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
