import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Building2,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Star,
  Shield,
  MoreHorizontal,
  Eye,
  Ban,
  BadgeCheck,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type Facility = {
  id: string;
  name: string;
  city: string;
  state: string;
  status: string;
  featured: boolean;
  verified: boolean;
  suspended: boolean;
  logo_url: string | null;
  admin_notes: string | null;
  created_at: string;
  lead_limit_override: number | null;
};

export default function AdminProviders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [selectedProvider, setSelectedProvider] = useState<Facility | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Fetch providers
  const { data: providers, isLoading } = useQuery({
    queryKey: ["admin-providers", statusFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("facilities")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as Facility[];
    },
  });

  // Fetch lead counts for each provider
  const { data: leadCounts } = useQuery({
    queryKey: ["admin-provider-lead-counts"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("leads")
        .select("facility_id")
        .gte("created_at", startOfMonth.toISOString());

      const counts: Record<string, number> = {};
      data?.forEach((lead) => {
        if (lead.facility_id) {
          counts[lead.facility_id] = (counts[lead.facility_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  // Update provider mutation
  const updateProvider = useMutation({
    mutationFn: async ({
      id,
      updates,
      actionType,
    }: {
      id: string;
      updates: Partial<Facility>;
      actionType: string;
    }) => {
      const { error } = await supabase.from("facilities").update(updates).eq("id", id);
      if (error) throw error;

      // Log admin action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user?.id,
        action_type: actionType,
        target_type: "facility",
        target_id: id,
        details: updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
      toast.success("Provider updated successfully");
    },
    onError: () => {
      toast.error("Failed to update provider");
    },
  });

  const handleStatusChange = (id: string, newStatus: string) => {
    updateProvider.mutate({
      id,
      updates: { status: newStatus },
      actionType: `status_changed_to_${newStatus}`,
    });
  };

  const handleToggleVerified = (id: string, currentValue: boolean) => {
    updateProvider.mutate({
      id,
      updates: { verified: !currentValue },
      actionType: currentValue ? "unverified" : "verified",
    });
  };

  const handleToggleFeatured = (id: string, currentValue: boolean) => {
    updateProvider.mutate({
      id,
      updates: { featured: !currentValue },
      actionType: currentValue ? "unfeatured" : "featured",
    });
  };

  const handleToggleSuspended = (id: string, currentValue: boolean) => {
    updateProvider.mutate({
      id,
      updates: { suspended: !currentValue },
      actionType: currentValue ? "unsuspended" : "suspended",
    });
  };

  const handleSaveNotes = () => {
    if (!selectedProvider) return;
    updateProvider.mutate({
      id: selectedProvider.id,
      updates: { admin_notes: adminNotes },
      actionType: "notes_updated",
    });
    setShowDetailDialog(false);
  };

  const openProviderDetail = (provider: Facility) => {
    setSelectedProvider(provider);
    setAdminNotes(provider.admin_notes || "");
    setShowDetailDialog(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Providers Management</h1>
        <p className="text-muted-foreground">Manage all facility listings</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Providers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Providers ({providers?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : providers && providers.length > 0 ? (
            <div className="space-y-2">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={provider.logo_url || undefined} />
                      <AvatarFallback className="bg-slate-100 text-slate-600">
                        {provider.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{provider.name}</p>
                        {provider.verified && (
                          <BadgeCheck className="h-4 w-4 text-blue-500" />
                        )}
                        {provider.featured && (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        )}
                        {provider.suspended && (
                          <Ban className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {provider.city}, {provider.state}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {leadCounts?.[provider.id] || 0} leads
                      </span>
                    </div>

                    <Badge
                      variant={
                        provider.status === "approved"
                          ? "default"
                          : provider.status === "pending"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {provider.status}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openProviderDetail(provider)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {provider.status === "pending" && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(provider.id, "approved")}
                          >
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                            Approve
                          </DropdownMenuItem>
                        )}
                        {provider.status === "approved" && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(provider.id, "pending")}
                          >
                            <XCircle className="h-4 w-4 mr-2 text-amber-500" />
                            Set to Pending
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleToggleVerified(provider.id, provider.verified)}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          {provider.verified ? "Remove Verified" : "Mark as Verified"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleFeatured(provider.id, provider.featured)}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          {provider.featured ? "Remove Featured" : "Mark as Featured"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleToggleSuspended(provider.id, provider.suspended)}
                          className={provider.suspended ? "text-green-600" : "text-red-600"}
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          {provider.suspended ? "Unsuspend" : "Suspend"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No providers found</p>
          )}
        </CardContent>
      </Card>

      {/* Provider Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedProvider?.name}
              {selectedProvider?.verified && (
                <BadgeCheck className="h-5 w-5 text-blue-500" />
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedProvider?.city}, {selectedProvider?.state}
            </DialogDescription>
          </DialogHeader>

          {selectedProvider && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant={
                      selectedProvider.status === "approved" ? "default" : "secondary"
                    }
                  >
                    {selectedProvider.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Leads This Month</p>
                  <p className="font-medium">{leadCounts?.[selectedProvider.id] || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Featured</p>
                  <p className="font-medium">{selectedProvider.featured ? "Yes" : "No"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Verified</p>
                  <p className="font-medium">{selectedProvider.verified ? "Yes" : "No"}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this provider..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveNotes}>Save Notes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
