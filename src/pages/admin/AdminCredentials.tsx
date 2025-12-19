import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  FileCheck,
  FileX,
  Download,
  Eye,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  FileText,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type CredentialDocument = {
  id: string;
  facility_id: string;
  document_type: string;
  document_name: string;
  document_url: string;
  status: string;
  uploaded_at: string;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  facility?: {
    name: string;
    city: string;
    state: string;
  };
};

const ITEMS_PER_PAGE = 20;

export default function AdminCredentials() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDocument, setSelectedDocument] = useState<CredentialDocument | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch status counts
  const { data: statusCounts } = useQuery({
    queryKey: ["admin-credentials-counts"],
    queryFn: async () => {
      const [pending, verified, rejected] = await Promise.all([
        supabase.from("facility_credential_documents").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("facility_credential_documents").select("id", { count: "exact", head: true }).eq("status", "verified"),
        supabase.from("facility_credential_documents").select("id", { count: "exact", head: true }).eq("status", "rejected"),
      ]);
      return {
        pending: pending.count || 0,
        verified: verified.count || 0,
        rejected: rejected.count || 0,
      };
    },
  });

  // Fetch credential documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ["admin-credentials", activeTab, searchQuery, currentPage],
    queryFn: async () => {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("facility_credential_documents")
        .select(`
          *,
          facility:facilities!facility_credential_documents_facility_id_fkey(name, city, state)
        `)
        .order("uploaded_at", { ascending: false })
        .range(from, to);

      if (activeTab !== "all") {
        query = query.eq("status", activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by search after query (facility name search)
      let filtered = data as CredentialDocument[];
      if (searchQuery) {
        const lowerSearch = searchQuery.toLowerCase();
        filtered = filtered.filter(doc => 
          doc.facility?.name?.toLowerCase().includes(lowerSearch) ||
          doc.document_name.toLowerCase().includes(lowerSearch) ||
          doc.document_type.toLowerCase().includes(lowerSearch)
        );
      }

      return filtered;
    },
  });

  // Verify document mutation
  const verifyMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("facility_credential_documents")
        .update({
          status: "verified",
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
        })
        .eq("id", documentId);

      if (error) throw error;

      // Get document details for email
      const { data: doc } = await supabase
        .from("facility_credential_documents")
        .select(`
          *,
          facility:facilities!facility_credential_documents_facility_id_fkey(name, user_id)
        `)
        .eq("id", documentId)
        .single();

      if (doc?.facility) {
        await supabase.functions.invoke("send-credential-notification", {
          body: {
            facilityId: doc.facility_id,
            facilityName: doc.facility.name,
            userId: doc.facility.user_id,
            documentName: doc.document_name,
            documentType: doc.document_type,
            status: "verified",
          },
        });
      }

      // Log audit
      if (user?.id) {
        await supabase.from("admin_audit_log").insert({
          admin_user_id: user.id,
          action_type: "credential_verified",
          target_type: "credential_document",
          target_id: documentId,
          details: { document_name: doc?.document_name },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-credentials"] });
      queryClient.invalidateQueries({ queryKey: ["admin-credentials-counts"] });
      toast.success("Document verified successfully");
    },
    onError: () => {
      toast.error("Failed to verify document");
    },
  });

  // Reject document mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ documentId, reason }: { documentId: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("facility_credential_documents")
        .update({
          status: "rejected",
          rejection_reason: reason,
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
        })
        .eq("id", documentId);

      if (error) throw error;

      // Get document details for email
      const { data: doc } = await supabase
        .from("facility_credential_documents")
        .select(`
          *,
          facility:facilities!facility_credential_documents_facility_id_fkey(name, user_id)
        `)
        .eq("id", documentId)
        .single();

      if (doc?.facility) {
        await supabase.functions.invoke("send-credential-notification", {
          body: {
            facilityId: doc.facility_id,
            facilityName: doc.facility.name,
            userId: doc.facility.user_id,
            documentName: doc.document_name,
            documentType: doc.document_type,
            status: "rejected",
            rejectionReason: reason,
          },
        });
      }

      // Log audit
      if (user?.id) {
        await supabase.from("admin_audit_log").insert({
          admin_user_id: user.id,
          action_type: "credential_rejected",
          target_type: "credential_document",
          target_id: documentId,
          details: { document_name: doc?.document_name, reason },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-credentials"] });
      queryClient.invalidateQueries({ queryKey: ["admin-credentials-counts"] });
      setShowRejectDialog(false);
      setRejectionReason("");
      setSelectedDocument(null);
      toast.success("Document rejected");
    },
    onError: () => {
      toast.error("Failed to reject document");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" /> Verified</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
  };

  const handleVerify = (doc: CredentialDocument) => {
    verifyMutation.mutate(doc.id);
  };

  const handleReject = (doc: CredentialDocument) => {
    setSelectedDocument(doc);
    setShowRejectDialog(true);
  };

  const confirmReject = () => {
    if (selectedDocument && rejectionReason.trim()) {
      rejectMutation.mutate({ documentId: selectedDocument.id, reason: rejectionReason });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Credential Documents</h1>
          <p className="text-muted-foreground">Review and verify provider credential documents</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-amber-600">{statusCounts?.pending || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts?.verified || 0}</p>
              </div>
              <FileCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{statusCounts?.rejected || 0}</p>
              </div>
              <FileX className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Tabs */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by facility or document name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1); }}>
          <TabsList>
            <TabsTrigger value="pending">Pending ({statusCounts?.pending || 0})</TabsTrigger>
            <TabsTrigger value="verified">Verified</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : documents?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No documents found</p>
                  </TableCell>
                </TableRow>
              ) : (
                documents?.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.facility?.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.facility?.city}, {doc.facility?.state}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{doc.document_name}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.document_type}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(doc.uploaded_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewUrl(doc.document_url)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a href={doc.document_url} target="_blank" rel="noopener noreferrer" download>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        {doc.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleVerify(doc)}
                              disabled={verifyMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleReject(doc)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Reject Document
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this document. The provider will receive an email notification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document</Label>
              <p className="text-sm text-muted-foreground">{selectedDocument?.document_name}</p>
            </div>
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Document is expired, image is unreadable, missing required information..."
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              Reject Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[400px] bg-muted rounded-lg overflow-hidden">
            {previewUrl?.toLowerCase().endsWith(".pdf") ? (
              <iframe
                src={previewUrl}
                className="w-full h-[600px]"
                title="Document Preview"
              />
            ) : (
              <img
                src={previewUrl || ""}
                alt="Document"
                className="max-w-full max-h-[600px] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
