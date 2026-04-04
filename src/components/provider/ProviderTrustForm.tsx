import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Info } from "lucide-react";
import { ACCREDITATION_OPTIONS, AccreditationType } from "@/components/trust/TrustBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CredentialsUpload } from "./CredentialsUpload";
import { AccreditationVerificationCard } from "./AccreditationVerificationCard";

interface ProviderTrustFormProps {
  facilityId: string;
  userId: string;
  yearEstablished: number | null;
  onYearChange: (year: number | null) => void;
  isEmbedded?: boolean;
}

export function ProviderTrustForm({ facilityId, userId, yearEstablished, onYearChange, isEmbedded = false }: ProviderTrustFormProps) {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i);

  // Fetch current accreditations with all verification fields
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

  const handleUpdate = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["facility-accreditations"] });
  };

  const getAccreditationData = (type: AccreditationType) => {
    return accreditations.find(a => a.accreditation_type === type) || null;
  };

  const content = (
    <div className="space-y-6">
      {/* Year Established */}
      <div className="space-y-2">
        <Label htmlFor="year-established">Year Established</Label>
        <Select
          value={yearEstablished?.toString() || "not_specified"}
          onValueChange={(value) => onYearChange(value === "not_specified" ? null : parseInt(value))}
        >
          <SelectTrigger id="year-established" className="w-full md:w-[200px]">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not_specified">Not specified</SelectItem>
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

      {/* Accreditations with Verification */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label>Accreditations & Certifications</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px]">
                <p className="text-xs">
                  Select your accreditations and provide verification details (certificate number, uploaded documents) to expedite the verification process.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="grid gap-3">
          {ACCREDITATION_OPTIONS.map((option) => (
            <AccreditationVerificationCard
              key={option.value}
              accreditationType={option.value}
              accreditation={getAccreditationData(option.value)}
              facilityId={facilityId}
              userId={userId}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      </div>

      <Separator />

      {/* Credential Documents Upload */}
      <CredentialsUpload facilityId={facilityId} userId={userId} />
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Trust & Credentials
        </CardTitle>
        <CardDescription>
          Add credentials to build trust with potential clients. Provide verification details for faster approval.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}