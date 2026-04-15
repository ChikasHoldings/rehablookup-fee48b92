import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Award, FileText, CheckCircle, XCircle, BadgeCheck, ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { Facility } from "../ProviderListItem";

interface ProviderCredentialsTabProps {
  provider: Facility;
  providerFacilities?: Facility[];
}

export function ProviderCredentialsTab({ provider, providerFacilities }: ProviderCredentialsTabProps) {
  const queryClient = useQueryClient();
  const facilityIds = providerFacilities?.map((f) => f.id) || [provider.id];

  const { data: accreditations, refetch: refetchAccreditations } = useQuery({
    queryKey: ["admin-provider-accreditations", provider.user_id, facilityIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("facility_accreditations")
        .select("id, facility_id, accreditation_type, issuing_authority, verification_number, verified, verified_at, expiry_date, document_url, document_name, notes, created_at")
        .in("facility_id", facilityIds)
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  const { data: documents, refetch: refetchDocuments } = useQuery({
    queryKey: ["admin-provider-credentials", provider.user_id, facilityIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("facility_credential_documents")
        .select("id, facility_id, document_type, document_name, document_url, status, uploaded_at, verified_at, verified_by, rejection_reason")
        .in("facility_id", facilityIds)
        .order("uploaded_at", { ascending: false });
      return data || [];
    },
  });

  const updateAccreditationVerification = useMutation({
    mutationFn: async ({ accreditationId, verified }: { accreditationId: string; verified: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("facility_accreditations")
        .update({
          verified,
          verified_at: verified ? new Date().toISOString() : null,
          verified_by: verified ? user?.id : null,
        })
        .eq("id", accreditationId);
      if (error) throw error;
    },
    onSuccess: () => { refetchAccreditations(); toast.success("Accreditation updated"); },
    onError: () => toast.error("Failed to update"),
  });

  const facilityName = (id: string) => providerFacilities?.find((f) => f.id === id)?.name || provider.name;
  const showFacilityCol = facilityIds.length > 1;

  const lookupUrls: Record<string, string> = {
    "JCAHO": "https://www.qualitycheck.org",
    "CARF": "https://carf.org/providerSearch",
    "LegitScript": "https://www.legitscript.com/search",
    "NAATP": "https://www.naatp.org/membership-directory",
    "SAMHSA Listed": "https://findtreatment.gov",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Accreditations */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Accreditations
            </CardTitle>
            <Badge variant="outline">
              {accreditations?.filter((a) => a.verified).length || 0}/{accreditations?.length || 0} verified
            </Badge>
          </div>
          <CardDescription>Verify claimed accreditations by checking the boxes below.</CardDescription>
        </CardHeader>
        <CardContent>
          {accreditations && accreditations.length > 0 ? (
            <div className="space-y-3">
              {accreditations.map((acc) => {
                const lookupUrl = lookupUrls[acc.accreditation_type];
                return (
                  <div key={acc.id} className="p-3 border rounded-lg hover:bg-muted/30 transition-colors space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={!!acc.verified}
                          onCheckedChange={(checked) => updateAccreditationVerification.mutate({ accreditationId: acc.id, verified: !!checked })}
                        />
                        <div>
                          <p className="font-medium">{acc.accreditation_type}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {acc.expiry_date && <span>Expires: {format(new Date(acc.expiry_date), "PPP")}</span>}
                            {showFacilityCol && <span>• {facilityName(acc.facility_id)}</span>}
                          </div>
                        </div>
                      </div>
                      {acc.verified ? (
                        <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                      )}
                    </div>
                    {(acc.verification_number || acc.document_url) && (
                      <div className="pl-9 pt-2 border-t border-dashed space-y-1.5 text-sm">
                        {acc.verification_number && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">ID:</span>
                            <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">{acc.verification_number}</span>
                            {lookupUrl && (
                              <Button size="sm" variant="ghost" className="h-6 px-2" asChild>
                                <a href={lookupUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 mr-1" />Verify</a>
                              </Button>
                            )}
                          </div>
                        )}
                        {acc.document_url && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Doc:</span>
                            <Button size="sm" variant="outline" className="h-7" asChild>
                              <a href={acc.document_url} target="_blank" rel="noopener noreferrer">
                                <FileText className="h-3 w-3 mr-1" />{acc.document_name || "View Certificate"}
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Award className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No accreditations listed</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credential Documents */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Uploaded Documents
            </CardTitle>
            <Badge variant="outline">{documents?.filter((d) => d.status === "verified").length || 0}/{documents?.length || 0} verified</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {documents && documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{doc.document_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.document_type} • {format(new Date(doc.uploaded_at), "PPP")}
                        {showFacilityCol && ` • ${facilityName(doc.facility_id)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <a href={doc.document_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />View
                      </a>
                    </Button>
                    {doc.status === "pending" && (
                      <>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={async () => {
                          const { data: { user } } = await supabase.auth.getUser();
                          const { error } = await supabase.from("facility_credential_documents").update({ status: "verified", verified_at: new Date().toISOString(), verified_by: user?.id }).eq("id", doc.id);
                          if (error) toast.error("Failed"); else { toast.success("Verified"); refetchDocuments(); }
                        }}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />Verify
                        </Button>
                        <Button size="sm" variant="destructive" onClick={async () => {
                          const reason = window.prompt("Enter rejection reason:");
                          if (reason) {
                            const { error } = await supabase.from("facility_credential_documents").update({ status: "rejected", rejection_reason: reason }).eq("id", doc.id);
                            if (error) toast.error("Failed"); else { toast.success("Rejected"); refetchDocuments(); }
                          }
                        }}>
                          <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                        </Button>
                      </>
                    )}
                    {doc.status === "verified" && <Badge className="bg-success/10 text-success border-success/20"><BadgeCheck className="h-3 w-3 mr-1" />Verified</Badge>}
                    {doc.status === "rejected" && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No documents uploaded</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
