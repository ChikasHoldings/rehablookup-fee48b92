import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Shield,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Ban,
  TrendingDown,
  Loader2,
  RefreshCw,
  FileText,
  Users,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────
interface AdmissionVerification {
  id: string;
  inquiry_id: string;
  facility_id: string;
  verification_status: string;
  billing_status: string;
  billing_amount_cents: number | null;
  billing_due_date: string | null;
  billing_reminder_count: number;
  billing_escalation_level: number;
  provider_reported: boolean;
  provider_reported_at: string | null;
  provider_admission_date: string | null;
  seeker_verified: boolean;
  seeker_verified_at: string | null;
  admin_confirmed: boolean;
  admin_confirmed_at: string | null;
  dispute_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  facility?: { id: string; name: string; placement_compliance_score: number; placement_network_standing: string };
  inquiry?: { id: string; user_name: string; status: string };
}

interface BypassAlert {
  id: string;
  inquiry_id: string;
  facility_id: string;
  admin_disclosed_pii_at: string;
  bypass_flag: boolean;
  bypass_flagged_at: string | null;
  admission_report_reminder_count: number;
  facility?: { id: string; name: string; placement_compliance_score: number; placement_network_standing: string };
}

// ── Status Colors ──────────────────────────────────────────────────────────
const BILLING_STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  invoiced: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  escalated: "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-300",
  waived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  disputed: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

const STANDING_COLORS: Record<string, string> = {
  good: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  probation: "bg-orange-100 text-orange-800",
  suspended: "bg-red-100 text-red-800",
};

// ── Main Component ─────────────────────────────────────────────────────────
export function RevenueProtectionDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // ── Fetch admission verifications ──
  const { data: verifications, isLoading: loadingVerifications } = useQuery({
    queryKey: ["admin-admission-verifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admission_verifications")
        .select(`
          *,
          facility:facilities!inner(id, name, placement_compliance_score, placement_network_standing),
          inquiry:concierge_inquiries!inner(id, user_name, status)
        `)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as AdmissionVerification[];
    },
  });

  // ── Fetch bypass alerts ──
  const { data: bypassAlerts } = useQuery({
    queryKey: ["admin-bypass-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_introductions")
        .select(`
          id, inquiry_id, facility_id, admin_disclosed_pii_at,
          bypass_flag, bypass_flagged_at, admission_report_reminder_count,
          facility:facilities!inner(id, name, placement_compliance_score, placement_network_standing)
        `)
        .eq("bypass_flag", true)
        .order("bypass_flagged_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as BypassAlert[];
    },
  });

  // ── KPI Calculations ──
  const kpis = useMemo(() => {
    if (!verifications) return null;
    const total = verifications.length;
    const pending = verifications.filter(v => v.billing_status === "pending" || v.billing_status === "confirmed").length;
    const paid = verifications.filter(v => v.billing_status === "paid").length;
    const overdue = verifications.filter(v => v.billing_status === "overdue" || v.billing_status === "escalated").length;
    const disputed = verifications.filter(v => v.billing_status === "disputed").length;
    const totalRevenue = verifications
      .filter(v => v.billing_status === "paid")
      .reduce((sum, v) => sum + (v.billing_amount_cents || 0), 0);
    const pendingRevenue = verifications
      .filter(v => !["paid", "waived"].includes(v.billing_status))
      .reduce((sum, v) => sum + (v.billing_amount_cents || 0), 0);
    return { total, pending, paid, overdue, disputed, totalRevenue, pendingRevenue };
  }, [verifications]);

  // ── Admin Confirm Mutation ──
  const confirmMutation = useMutation({
    mutationFn: async ({ verificationId, action, notes }: { verificationId: string; action: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (action === "confirm_billing") {
        const { error } = await supabase
          .from("admission_verifications")
          .update({
            admin_confirmed: true,
            admin_confirmed_at: new Date().toISOString(),
            admin_confirmed_by: user.id,
            billing_status: "invoiced",
            admin_notes: notes || null,
            verification_status: "admin_override",
          })
          .eq("id", verificationId);
        if (error) throw error;
      } else if (action === "waive") {
        const { error } = await supabase
          .from("admission_verifications")
          .update({
            billing_status: "waived",
            admin_notes: notes || null,
            admin_confirmed_by: user.id,
          })
          .eq("id", verificationId);
        if (error) throw error;
      } else if (action === "mark_paid") {
        const { error } = await supabase
          .from("admission_verifications")
          .update({
            billing_status: "paid",
            admin_confirmed_by: user.id,
          })
          .eq("id", verificationId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-admission-verifications"] });
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Suspend Provider Mutation ──
  const suspendMutation = useMutation({
    mutationFn: async ({ facilityId, reason }: { facilityId: string; reason: string }) => {
      const { error } = await supabase
        .from("facilities")
        .update({
          placement_network_standing: "suspended",
          placement_suspended_at: new Date().toISOString(),
          placement_suspension_reason: reason,
        })
        .eq("id", facilityId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Provider suspended from placement network");
      queryClient.invalidateQueries({ queryKey: ["admin-bypass-alerts"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <KPICard icon={FileText} label="Total Cases" value={kpis.total} />
          <KPICard icon={Clock} label="Pending" value={kpis.pending} color="blue" />
          <KPICard icon={CheckCircle2} label="Paid" value={kpis.paid} color="green" />
          <KPICard icon={AlertTriangle} label="Overdue" value={kpis.overdue} color="red" />
          <KPICard icon={DollarSign} label="Revenue" value={`$${(kpis.totalRevenue / 100).toLocaleString()}`} color="green" />
          <KPICard icon={DollarSign} label="Outstanding" value={`$${(kpis.pendingRevenue / 100).toLocaleString()}`} color="amber" />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">All Cases</TabsTrigger>
          <TabsTrigger value="action_required">
            Action Required
            {kpis && kpis.overdue + kpis.disputed > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">
                {kpis.overdue + kpis.disputed}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="bypass_alerts">
            Bypass Alerts
            {bypassAlerts && bypassAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">
                {bypassAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* All Cases Tab */}
        <TabsContent value="overview" className="mt-4">
          {loadingVerifications ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-3">
              {verifications?.map(v => (
                <VerificationRow
                  key={v.id}
                  verification={v}
                  onConfirm={(action, notes) => confirmMutation.mutate({ verificationId: v.id, action, notes })}
                  isActing={confirmMutation.isPending}
                />
              ))}
              {(!verifications || verifications.length === 0) && (
                <div className="text-center py-12 text-muted-foreground">No admission verifications yet.</div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Action Required Tab */}
        <TabsContent value="action_required" className="mt-4">
          <div className="space-y-3">
            {verifications?.filter(v => ["overdue", "escalated", "disputed"].includes(v.billing_status) || (v.provider_reported && !v.admin_confirmed))
              .map(v => (
                <VerificationRow
                  key={v.id}
                  verification={v}
                  onConfirm={(action, notes) => confirmMutation.mutate({ verificationId: v.id, action, notes })}
                  isActing={confirmMutation.isPending}
                  highlight
                />
              ))}
          </div>
        </TabsContent>

        {/* Bypass Alerts Tab */}
        <TabsContent value="bypass_alerts" className="mt-4">
          <div className="space-y-3">
            {bypassAlerts?.map(alert => (
              <BypassAlertRow
                key={alert.id}
                alert={alert}
                onSuspend={(reason) => suspendMutation.mutate({ facilityId: alert.facility_id, reason })}
                isSuspending={suspendMutation.isPending}
              />
            ))}
            {(!bypassAlerts || bypassAlerts.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                <p>No bypass alerts. All providers are in compliance.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="mt-4">
          <ComplianceOverview />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color?: string }) {
  const colorClasses = {
    green: "text-emerald-600",
    red: "text-red-600",
    blue: "text-blue-600",
    amber: "text-amber-600",
  };
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", color ? colorClasses[color as keyof typeof colorClasses] : "text-muted-foreground")} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-xl font-bold mt-1", color ? colorClasses[color as keyof typeof colorClasses] : "")}>
        {value}
      </p>
    </Card>
  );
}

function VerificationRow({
  verification: v,
  onConfirm,
  isActing,
  highlight,
}: {
  verification: AdmissionVerification;
  onConfirm: (action: string, notes?: string) => void;
  isActing: boolean;
  highlight?: boolean;
}) {
  const [notes, setNotes] = useState("");
  const facility = v.facility as any;
  const inquiry = v.inquiry as any;

  return (
    <Card className={cn("p-4", highlight && "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm truncate">{facility?.name || "Unknown"}</span>
            <Badge className={cn("text-[10px]", BILLING_STATUS_COLORS[v.billing_status])}>
              {v.billing_status}
            </Badge>
            {v.billing_amount_cents && (
              <span className="text-xs font-medium text-muted-foreground">
                ${(v.billing_amount_cents / 100).toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {inquiry?.user_name?.split(" ")[0] || "Client"}
            </span>
            {v.provider_reported && (
              <span className="flex items-center gap-1 text-blue-600">
                <CheckCircle2 className="h-3 w-3" />
                Provider reported {v.provider_admission_date}
              </span>
            )}
            {v.seeker_verified && (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                Seeker verified
              </span>
            )}
            {v.admin_confirmed && (
              <span className="flex items-center gap-1 text-purple-600">
                <Shield className="h-3 w-3" />
                Admin confirmed
              </span>
            )}
            {v.billing_due_date && (
              <span className={cn("flex items-center gap-1", new Date(v.billing_due_date) < new Date() ? "text-red-600" : "")}>
                <Clock className="h-3 w-3" />
                Due: {format(new Date(v.billing_due_date), "MMM d")}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {v.provider_reported && !v.admin_confirmed && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="default" className="h-7 text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Confirm & Bill
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Admission & Generate Invoice</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will confirm the admission reported by {facility?.name} and generate a placement fee invoice.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                  placeholder="Optional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-2"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onConfirm("confirm_billing", notes)} disabled={isActing}>
                    Confirm & Invoice
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {v.billing_status === "invoiced" && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onConfirm("mark_paid")} disabled={isActing}>
              <DollarSign className="h-3 w-3" /> Mark Paid
            </Button>
          )}
          {!["paid", "waived"].includes(v.billing_status) && (
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => onConfirm("waive", "Admin waived")} disabled={isActing}>
              Waive
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function BypassAlertRow({
  alert,
  onSuspend,
  isSuspending,
}: {
  alert: BypassAlert;
  onSuspend: (reason: string) => void;
  isSuspending: boolean;
}) {
  const facility = alert.facility as any;
  const daysSinceDisclosure = alert.admin_disclosed_pii_at
    ? Math.floor((Date.now() - new Date(alert.admin_disclosed_pii_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Card className="p-4 border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="font-medium text-sm">{facility?.name || "Unknown Facility"}</span>
            <Badge className={cn("text-[10px]", STANDING_COLORS[facility?.placement_network_standing || "good"])}>
              {facility?.placement_network_standing || "good"}
            </Badge>
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground space-y-0.5">
            <p>PII disclosed <strong>{daysSinceDisclosure} days ago</strong> — no admission reported</p>
            <p>Reminders sent: {alert.admission_report_reminder_count} | Compliance score: {facility?.placement_compliance_score}/100</p>
            {alert.bypass_flagged_at && <p>Flagged: {format(new Date(alert.bypass_flagged_at), "MMM d, yyyy")}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {facility?.placement_network_standing !== "suspended" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" disabled={isSuspending}>
                  <Ban className="h-3 w-3" /> Suspend
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Suspend {facility?.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove the provider from the placement network. They will not receive new introductions until reinstated.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onSuspend(`Bypass detected: PII disclosed ${daysSinceDisclosure} days ago with no admission report`)}
                    className="bg-destructive text-destructive-foreground"
                  >
                    Suspend Provider
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </Card>
  );
}

function ComplianceOverview() {
  const { data: facilities, isLoading } = useQuery({
    queryKey: ["admin-provider-compliance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, placement_compliance_score, placement_network_standing, placement_total_introductions, placement_total_admissions, placement_total_bypasses, placement_suspended_at, placement_suspension_reason")
        .not("placement_network_standing", "eq", "good")
        .order("placement_compliance_score", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const reinstateMutation = useMutation({
    mutationFn: async (facilityId: string) => {
      const { error } = await supabase
        .from("facilities")
        .update({
          placement_network_standing: "good",
          placement_compliance_score: 75,
          placement_suspended_at: null,
          placement_suspension_reason: null,
        })
        .eq("id", facilityId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Provider reinstated");
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (!facilities || facilities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Shield className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
        <p>All providers are in good standing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {facilities.map(f => (
        <Card key={f.id} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{f.name}</span>
                <Badge className={cn("text-[10px]", STANDING_COLORS[f.placement_network_standing || "good"])}>
                  {f.placement_network_standing}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span>Score: {f.placement_compliance_score}/100</span>
                <span>Intros: {f.placement_total_introductions}</span>
                <span>Admissions: {f.placement_total_admissions}</span>
                <span className="text-red-600">Bypasses: {f.placement_total_bypasses}</span>
                {f.placement_suspension_reason && <span>Reason: {f.placement_suspension_reason}</span>}
              </div>
            </div>
            {f.placement_network_standing === "suspended" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => reinstateMutation.mutate(f.id)}
                disabled={reinstateMutation.isPending}
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Reinstate
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
