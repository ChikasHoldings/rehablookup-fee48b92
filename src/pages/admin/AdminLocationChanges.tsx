import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { format, formatDistanceToNow } from "date-fns";
import {
  MapPin,
  Phone,
  Globe,
  Building2,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  ChevronDown,
  AlertCircle,
  FileText,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";
import { cn } from "@/lib/utils";
import type { Json } from "@/integrations/supabase/types";

// Fields that require verification
const VERIFIED_FIELDS = [
  "name",
  "address",
  "city",
  "state",
  "zip_code",
  "phone",
  "website",
  "email",
];

const FIELD_LABELS: Record<string, string> = {
  name: "Facility Name",
  address: "Street Address",
  city: "City",
  state: "State",
  zip_code: "ZIP Code",
  phone: "Phone Number",
  website: "Website URL",
  email: "Email Address",
};

interface PendingChange {
  id: string;
  facility_id: string;
  provider_id: string;
  pending_payload: Json;
  pending_status: string;
  changed_fields: string[];
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by_admin_id: string | null;
  review_notes: string | null;
  facility: {
    id: string;
    name: string;
    city: string;
    state: string;
    address: string;
    phone: string;
    website: string | null;
    email: string | null;
    zip_code: string;
  };
  provider_profile: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

function getChangeTypeBadges(changedFields: string[]) {
  const badges: { label: string; variant: "default" | "secondary" | "outline" }[] = [];
  
  if (changedFields.some(f => ["address", "city", "state", "zip_code"].includes(f))) {
    badges.push({ label: "Address", variant: "default" });
  }
  if (changedFields.includes("phone")) {
    badges.push({ label: "Phone", variant: "secondary" });
  }
  if (changedFields.includes("website")) {
    badges.push({ label: "Website", variant: "outline" });
  }
  if (changedFields.includes("name")) {
    badges.push({ label: "Name", variant: "default" });
  }
  if (changedFields.includes("email")) {
    badges.push({ label: "Email", variant: "outline" });
  }
  
  return badges;
}

export default function AdminLocationChanges() {
  const queryClient = useQueryClient();
  const { logError } = useAdminErrorHandler("AdminLocationChanges");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChange, setSelectedChange] = useState<PendingChange | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch pending changes with facility and provider info
  const { data: pendingChanges, isLoading, refetch } = useQuery({
    queryKey: ["admin-location-changes", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("facility_pending_changes")
        .select(`
          *,
          facility:facilities!facility_id (
            id,
            name,
            city,
            state,
            address,
            phone,
            website,
            email,
            zip_code
          )
        `)
        .order("submitted_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("pending_status", statusFilter);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Fetch provider profiles separately
      const providerIds = [...new Set((data || []).map((d) => d.provider_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", providerIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      return (data || []).map((change) => ({
        ...change,
        provider_profile: profileMap.get(change.provider_id) || null,
      })) as PendingChange[];
    },
  });

  // Filter by search query
  const filteredChanges = (pendingChanges || []).filter((change) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      change.facility?.name?.toLowerCase().includes(query) ||
      change.facility?.city?.toLowerCase().includes(query) ||
      change.provider_profile?.first_name?.toLowerCase().includes(query) ||
      change.provider_profile?.last_name?.toLowerCase().includes(query) ||
      change.provider_profile?.email?.toLowerCase().includes(query)
    );
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (change: PendingChange) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = change.pending_payload as Record<string, unknown>;

      // Update the facility with the pending changes
      const { error: facilityError } = await supabase
        .from("facilities")
        .update(payload)
        .eq("id", change.facility_id);

      if (facilityError) throw facilityError;

      // Update the pending change status
      const { error: changeError } = await supabase
        .from("facility_pending_changes")
        .update({
          pending_status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by_admin_id: user.id,
          review_notes: reviewNotes || null,
        })
        .eq("id", change.id);

      if (changeError) throw changeError;

      // Log audit action
      await logAdminAction({
        actionType: "location_change_approved",
        targetType: "facility",
        targetId: change.facility_id,
        details: {
          pending_change_id: change.id,
          changed_fields: change.changed_fields,
          review_notes: reviewNotes || null,
        } as Json,
      });

      // Create notification for provider
      await supabase.from("provider_notifications").insert({
        user_id: change.provider_id,
        facility_id: change.facility_id,
        type: "location_change_approved",
        title: "Location Changes Approved",
        message: `Your changes to ${change.facility?.name} have been approved and are now live.`,
        metadata: {
          changed_fields: change.changed_fields,
        },
      });
    },
    onSuccess: () => {
      toast.success("Changes approved and applied to live listing");
      setSelectedChange(null);
      setReviewNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-location-changes"] });
    },
    onError: (error) => {
      toast.error("Failed to approve changes: " + error.message);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (change: PendingChange) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!reviewNotes.trim()) {
        throw new Error("Review notes are required when rejecting changes");
      }

      // Update the pending change status
      const { error: changeError } = await supabase
        .from("facility_pending_changes")
        .update({
          pending_status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by_admin_id: user.id,
          review_notes: reviewNotes,
        })
        .eq("id", change.id);

      if (changeError) throw changeError;

      // Log audit action
      await logAdminAction({
        actionType: "location_change_rejected",
        targetType: "facility",
        targetId: change.facility_id,
        details: {
          pending_change_id: change.id,
          changed_fields: change.changed_fields,
          review_notes: reviewNotes,
        } as Json,
      });

      // Create notification for provider
      await supabase.from("provider_notifications").insert({
        user_id: change.provider_id,
        facility_id: change.facility_id,
        type: "location_change_rejected",
        title: "Location Changes Require Revision",
        message: `Your changes to ${change.facility?.name} were not approved. ${reviewNotes}`,
        metadata: {
          changed_fields: change.changed_fields,
          review_notes: reviewNotes,
        },
      });
    },
    onSuccess: () => {
      toast.success("Changes rejected and provider notified");
      setSelectedChange(null);
      setReviewNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-location-changes"] });
    },
    onError: (error) => {
      toast.error("Failed to reject changes: " + error.message);
    },
  });

  const handleApprove = useCallback(async () => {
    if (!selectedChange) return;
    setIsProcessing(true);
    try {
      await approveMutation.mutateAsync(selectedChange);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedChange, approveMutation]);

  const handleReject = useCallback(async () => {
    if (!selectedChange) return;
    if (!reviewNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setIsProcessing(true);
    try {
      await rejectMutation.mutateAsync(selectedChange);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedChange, rejectMutation, reviewNotes]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Count stats
  const pendingCount = pendingChanges?.filter(c => c.pending_status === "pending").length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Location Changes</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve provider location edits before they go live
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved Today</p>
                <p className="text-3xl font-bold text-green-600">
                  {pendingChanges?.filter(c => 
                    c.pending_status === "approved" && 
                    c.reviewed_at && 
                    new Date(c.reviewed_at).toDateString() === new Date().toDateString()
                  ).length || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected Today</p>
                <p className="text-3xl font-bold text-red-600">
                  {pendingChanges?.filter(c => 
                    c.pending_status === "rejected" && 
                    c.reviewed_at && 
                    new Date(c.reviewed_at).toDateString() === new Date().toDateString()
                  ).length || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by provider name, facility, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="pending" className="gap-2">
                  Pending
                  {pendingCount > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5">{pendingCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Queue Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredChanges.length === 0 ? (
            <div className="p-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No Changes Found</h3>
              <p className="text-muted-foreground">
                {statusFilter === "pending" 
                  ? "No pending location changes require review."
                  : `No ${statusFilter} location changes to display.`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider / Location</TableHead>
                  <TableHead>Change Types</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChanges.map((change) => (
                  <TableRow key={change.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedChange(change)}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{change.facility?.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {change.facility?.city}, {change.facility?.state}
                          </div>
                          {change.provider_profile && (
                            <div className="text-xs text-muted-foreground mt-1">
                              by {change.provider_profile.first_name} {change.provider_profile.last_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getChangeTypeBadges(change.changed_fields).map((badge, i) => (
                          <Badge key={i} variant={badge.variant} className="text-xs">
                            {badge.label}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDistanceToNow(new Date(change.submitted_at), { addSuffix: true })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(change.submitted_at), "MMM d, yyyy h:mm a")}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(change.pending_status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedChange(change); }}>
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedChange} onOpenChange={(open) => { if (!open) { setSelectedChange(null); setReviewNotes(""); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Review Location Changes
            </DialogTitle>
            <DialogDescription>
              {selectedChange?.facility?.name} • {selectedChange?.facility?.city}, {selectedChange?.facility?.state}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Provider Info */}
              {selectedChange?.provider_profile && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Submitted by</div>
                  <div className="font-medium">
                    {selectedChange.provider_profile.first_name} {selectedChange.provider_profile.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground">{selectedChange.provider_profile.email}</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(selectedChange.submitted_at), { addSuffix: true })}
                  </div>
                </div>
              )}

              {/* Diff View */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  Changed Fields ({selectedChange?.changed_fields.length})
                </h4>
                
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-3 bg-muted/50 p-3 border-b">
                    <div className="font-medium text-sm">Field</div>
                    <div className="font-medium text-sm text-red-600">Current (Live)</div>
                    <div className="font-medium text-sm text-green-600">Proposed Change</div>
                  </div>
                  
                  {selectedChange?.changed_fields.map((field) => {
                    const currentValue = selectedChange.facility?.[field as keyof typeof selectedChange.facility] || "—";
                    const pendingPayload = selectedChange.pending_payload as Record<string, unknown>;
                    const newValue = pendingPayload?.[field] || "—";
                    
                    return (
                      <div key={field} className="grid grid-cols-3 p-3 border-b last:border-0 hover:bg-muted/30">
                        <div className="font-medium text-sm flex items-center gap-2">
                          {field === "address" && <MapPin className="h-4 w-4 text-muted-foreground" />}
                          {field === "phone" && <Phone className="h-4 w-4 text-muted-foreground" />}
                          {field === "website" && <Globe className="h-4 w-4 text-muted-foreground" />}
                          {field === "name" && <Building2 className="h-4 w-4 text-muted-foreground" />}
                          {FIELD_LABELS[field] || field}
                        </div>
                        <div className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
                          {String(currentValue)}
                        </div>
                        <div className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded flex items-center gap-2">
                          <ArrowRight className="h-3 w-3 shrink-0" />
                          {String(newValue)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review Notes */}
              {selectedChange?.pending_status === "pending" && (
                <div className="space-y-2">
                  <Label htmlFor="review-notes">
                    Review Notes {selectedChange?.pending_status === "pending" && "(Required for rejection)"}
                  </Label>
                  <Textarea
                    id="review-notes"
                    placeholder="Add notes about this review..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Previous Review Info */}
              {selectedChange?.pending_status !== "pending" && selectedChange?.review_notes && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Review Notes</div>
                  <div className="text-sm">{selectedChange.review_notes}</div>
                  {selectedChange.reviewed_at && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Reviewed {formatDistanceToNow(new Date(selectedChange.reviewed_at), { addSuffix: true })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {selectedChange?.pending_status === "pending" && (
            <DialogFooter className="border-t pt-4 mt-4">
              <Button
                variant="outline"
                onClick={() => { setSelectedChange(null); setReviewNotes(""); }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isProcessing || !reviewNotes.trim()}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isProcessing}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve & Publish
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}