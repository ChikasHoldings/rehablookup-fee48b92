import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, CheckCircle, Clock, Info } from "lucide-react";
import { ACCREDITATION_OPTIONS, AccreditationType } from "@/components/trust/TrustBadge";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProviderTrustFormProps {
  facilityId: string;
  yearEstablished: number | null;
  onYearChange: (year: number | null) => void;
}

export function ProviderTrustForm({ facilityId, yearEstablished, onYearChange }: ProviderTrustFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i);

  // Fetch current accreditations
  const { data: accreditations = [], refetch } = useQuery({
    queryKey: ["facility-accreditations", facilityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facility_accreditations")
        .select("*")
        .eq("facility_id", facilityId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!facilityId,
  });

  const selectedAccreditations = accreditations.map(a => a.accreditation_type);

  const handleAccreditationToggle = async (accreditationType: AccreditationType, checked: boolean) => {
    try {
      if (checked) {
        // Add accreditation
        const { error } = await supabase
          .from("facility_accreditations")
          .insert({
            facility_id: facilityId,
            accreditation_type: accreditationType,
            verified: false,
          });
        if (error) throw error;
        toast({
          title: "Accreditation added",
          description: "Your accreditation will be reviewed and verified by our team.",
        });
      } else {
        // Remove accreditation
        const { error } = await supabase
          .from("facility_accreditations")
          .delete()
          .eq("facility_id", facilityId)
          .eq("accreditation_type", accreditationType);
        if (error) throw error;
        toast({
          title: "Accreditation removed",
        });
      }
      refetch();
      queryClient.invalidateQueries({ queryKey: ["facility-accreditations"] });
    } catch (error) {
      console.error("Error updating accreditation:", error);
      toast({
        title: "Error",
        description: "Failed to update accreditation",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Trust & Credentials
        </CardTitle>
        <CardDescription>
          Add credentials to build trust with potential clients. Accreditations will be verified by our team.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Year Established */}
        <div className="space-y-2">
          <Label htmlFor="year-established">Year Established</Label>
          <Select
            value={yearEstablished?.toString() || ""}
            onValueChange={(value) => onYearChange(value ? parseInt(value) : null)}
          >
            <SelectTrigger id="year-established" className="w-full md:w-[200px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Not specified</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            This will display as "X+ Years" on your public profile
          </p>
        </div>

        {/* Accreditations */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label>Accreditations & Certifications</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[250px]">
                  <p className="text-xs">
                    Claimed accreditations will be verified by our team before displaying on your public profile.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="grid gap-3">
            {ACCREDITATION_OPTIONS.map((option) => {
              const existing = accreditations.find(a => a.accreditation_type === option.value);
              const isChecked = !!existing;
              const isVerified = existing?.verified || false;

              return (
                <div
                  key={option.value}
                  className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={option.value}
                    checked={isChecked}
                    onCheckedChange={(checked) => 
                      handleAccreditationToggle(option.value, checked as boolean)
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={option.value}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {option.label}
                      </Label>
                      {isChecked && (
                        isVerified ? (
                          <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-200 text-xs">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-muted-foreground text-xs border-dashed">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        )
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
