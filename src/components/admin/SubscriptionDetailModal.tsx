import { useState, forwardRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Receipt,
  Clock,
  ChevronUp,
  ChevronDown,
  Minus,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  User,
  Building,
  Mail,
  MoreVertical,
  Pause,
  Play,
  Ban,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type EnrichedSubscription = {
  customer_id: string;
  customer_email: string;
  customer_name: string;
  plan: string;
  status: string;
  current_period_end: string;
  created: string;
  cancel_at_period_end: boolean;
  monthly_amount: number;
  facility_name: string;
  facility_city?: string;
  facility_state?: string;
  leads_used: number;
  location_limit: number;
  subscription_id?: string;
  pause_collection?: { behavior: string } | null;
};

type PaymentIntent = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  payment_method_type: string;
  description?: string;
};

type Invoice = {
  id: string;
  number: string;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: string;
  created: number;
  period_start: number;
  period_end: number;
  hosted_invoice_url?: string;
  pdf?: string;
};

type SubscriptionEvent = {
  type: "created" | "updated" | "canceled" | "reactivated" | "plan_changed" | "payment_succeeded" | "payment_failed";
  date: string;
  description: string;
  metadata?: Record<string, string>;
};

type SubscriptionDetail = {
  subscription: {
    id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    canceled_at?: string;
    created: string;
    plan: string;
    monthly_amount: number;
    pause_collection?: { behavior: string } | null;
  };
  customer: {
    id: string;
    email: string;
    name?: string;
    created: string;
  };
  payment_history: PaymentIntent[];
  invoices: Invoice[];
  timeline: SubscriptionEvent[];
};

interface SubscriptionDetailModalProps {
  subscription: EnrichedSubscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PlanBadge = forwardRef<HTMLDivElement, { plan: string }>(
  function PlanBadge({ plan }, ref) {
    const config: Record<string, { label: string; className: string }> = {
      free: { label: "Free", className: "bg-muted text-muted-foreground border-border" },
      pro: { label: "Pro", className: "bg-warning/10 text-warning border-warning/30" },
    };
    const { label, className } = config[plan] || { label: plan, className: "bg-muted text-muted-foreground" };
    return <Badge ref={ref} variant="outline" className={className}>{label}</Badge>;
  }
);

const StatusBadge = forwardRef<HTMLDivElement, { status: string; isPaused?: boolean }>(
  function StatusBadge({ status, isPaused }, ref) {
    if (isPaused) {
      return (
        <Badge ref={ref} variant="outline" className="bg-info/10 text-info border-info/30 flex items-center gap-1">
          <Pause className="h-3 w-3" />
          Paused
        </Badge>
      );
    }

    const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      active: { label: "Active", className: "bg-success/10 text-success border-success/30", icon: <CheckCircle2 className="h-3 w-3" /> },
      canceled: { label: "Canceled", className: "bg-destructive/10 text-destructive border-destructive/30", icon: <XCircle className="h-3 w-3" /> },
      past_due: { label: "Past Due", className: "bg-destructive/10 text-destructive border-destructive/30", icon: <AlertCircle className="h-3 w-3" /> },
      trialing: { label: "Trial", className: "bg-info/10 text-info border-info/30", icon: <Clock className="h-3 w-3" /> },
      incomplete: { label: "Incomplete", className: "bg-muted text-muted-foreground border-border", icon: <AlertCircle className="h-3 w-3" /> },
      paid: { label: "Paid", className: "bg-success/10 text-success border-success/30", icon: <CheckCircle2 className="h-3 w-3" /> },
      open: { label: "Open", className: "bg-info/10 text-info border-info/30", icon: <Clock className="h-3 w-3" /> },
      void: { label: "Void", className: "bg-muted text-muted-foreground border-border", icon: <XCircle className="h-3 w-3" /> },
      uncollectible: { label: "Uncollectible", className: "bg-destructive/10 text-destructive border-destructive/30", icon: <XCircle className="h-3 w-3" /> },
      succeeded: { label: "Succeeded", className: "bg-success/10 text-success border-success/30", icon: <CheckCircle2 className="h-3 w-3" /> },
      failed: { label: "Failed", className: "bg-destructive/10 text-destructive border-destructive/30", icon: <XCircle className="h-3 w-3" /> },
      pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/30", icon: <Clock className="h-3 w-3" /> },
    };
    const { label, className, icon } = config[status] || { label: status, className: "bg-muted text-muted-foreground", icon: null };
    return (
      <Badge ref={ref} variant="outline" className={`${className} flex items-center gap-1`}>
        {icon}
        {label}
      </Badge>
    );
  }
);

function TimelineIcon({ type }: { type: string }) {
  switch (type) {
    case "created":
      return <ArrowUpRight className="h-4 w-4 text-success" />;
    case "plan_changed":
      return <ChevronUp className="h-4 w-4 text-info" />;
    case "canceled":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "reactivated":
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case "payment_succeeded":
      return <DollarSign className="h-4 w-4 text-success" />;
    case "payment_failed":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

export function SubscriptionDetailModal({
  subscription,
  open,
  onOpenChange,
}: SubscriptionDetailModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [confirmAction, setConfirmAction] = useState<"cancel" | "cancel_immediately" | "pause" | "resume" | "reactivate" | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data: details, isLoading, refetch } = useQuery({
    queryKey: ["subscription-detail", subscription?.customer_email],
    queryFn: async () => {
      if (!subscription?.customer_email) return null;
      const { data, error } = await supabase.functions.invoke("get-provider-subscription", {
        body: { providerEmail: subscription.customer_email },
      });
      if (error) throw error;
      return data as SubscriptionDetail;
    },
    enabled: open && !!subscription?.customer_email,
  });

  const manageMutation = useMutation({
    mutationFn: async ({ action, reason }: { action: string; reason?: string }) => {
      const subscriptionId = details?.subscription?.id;
      if (!subscriptionId) throw new Error("No subscription ID found");

      const { data, error } = await supabase.functions.invoke("manage-subscription", {
        body: { action, subscriptionId, reason },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Action completed successfully");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-stats"] });
      setConfirmAction(null);
      setCancelReason("");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to perform action");
    },
  });

  const handleAction = (action: "cancel" | "cancel_immediately" | "pause" | "resume" | "reactivate") => {
    if (action === "cancel" || action === "cancel_immediately") {
      setConfirmAction(action);
    } else {
      manageMutation.mutate({ action });
    }
  };

  const confirmActionHandler = () => {
    if (confirmAction) {
      manageMutation.mutate({ action: confirmAction, reason: cancelReason });
    }
  };

  if (!subscription) return null;

  const isPaused = details?.subscription?.pause_collection !== null && details?.subscription?.pause_collection !== undefined;
  const isCanceling = subscription.cancel_at_period_end;
  const isActive = subscription.status === "active" && !isCanceling;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] p-0">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <DialogTitle className="text-lg sm:text-xl truncate">{subscription.facility_name}</DialogTitle>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{subscription.customer_email}</p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <PlanBadge plan={subscription.plan} />
                <StatusBadge 
                  status={isCanceling ? "canceled" : subscription.status} 
                  isPaused={isPaused}
                />
                
                {/* Actions Menu */}
                {details?.subscription?.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                        {manageMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                        ) : (
                          <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isPaused ? (
                        <DropdownMenuItem onClick={() => handleAction("resume")} className="text-xs sm:text-sm">
                          <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                          Resume Subscription
                        </DropdownMenuItem>
                      ) : isActive ? (
                        <>
                          <DropdownMenuItem onClick={() => handleAction("pause")} className="text-xs sm:text-sm">
                            <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                            Pause Subscription
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleAction("cancel")}
                            className="text-warning focus:text-warning text-xs sm:text-sm"
                          >
                            <Ban className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                            Cancel at Period End
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleAction("cancel_immediately")}
                            className="text-destructive focus:text-destructive text-xs sm:text-sm"
                          >
                            <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                            Cancel Immediately
                          </DropdownMenuItem>
                        </>
                      ) : isCanceling ? (
                        <DropdownMenuItem onClick={() => handleAction("reactivate")} className="text-xs sm:text-sm">
                          <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                          Reactivate Subscription
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <div className="px-4 sm:px-6 border-b overflow-x-auto scrollbar-hide">
              <TabsList className="h-9 sm:h-10 bg-transparent p-0 w-auto inline-flex sm:w-full sm:justify-start gap-3 sm:gap-4">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2 sm:pb-3 text-xs sm:text-sm whitespace-nowrap"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="payments" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2 sm:pb-3 text-xs sm:text-sm whitespace-nowrap"
                >
                  Payments
                </TabsTrigger>
                <TabsTrigger 
                  value="invoices" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2 sm:pb-3 text-xs sm:text-sm whitespace-nowrap"
                >
                  Invoices
                </TabsTrigger>
                <TabsTrigger 
                  value="timeline" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-2 sm:pb-3 text-xs sm:text-sm whitespace-nowrap"
                >
                  Timeline
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="h-[400px] sm:h-[500px]">
              <div className="p-4 sm:p-6">
                {/* Overview Tab */}
                <TabsContent value="overview" className="m-0 space-y-4 sm:space-y-6">
                  {isLoading ? (
                    <div className="space-y-3 sm:space-y-4">
                      <Skeleton className="h-20 sm:h-24 w-full" />
                      <Skeleton className="h-20 sm:h-24 w-full" />
                    </div>
                  ) : (
                    <>
                      {/* Status Alerts */}
                      {isPaused && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border border-info/30 bg-info/5">
                          <div className="flex items-center gap-2 flex-1">
                            <Pause className="h-4 w-4 sm:h-5 sm:w-5 text-info shrink-0" />
                            <div>
                              <p className="font-medium text-foreground text-sm sm:text-base">Subscription Paused</p>
                              <p className="text-xs sm:text-sm text-muted-foreground">Billing is paused. No charges will be made until resumed.</p>
                            </div>
                          </div>
                          <Button size="sm" onClick={() => handleAction("resume")} disabled={manageMutation.isPending} className="self-start sm:self-auto text-xs sm:text-sm h-8">
                            Resume
                          </Button>
                        </div>
                      )}

                      {isCanceling && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border border-warning/30 bg-warning/5">
                          <div className="flex items-center gap-2 flex-1">
                            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-warning shrink-0" />
                            <div>
                              <p className="font-medium text-foreground text-sm sm:text-base">Cancellation Scheduled</p>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                Will cancel on {format(new Date(subscription.current_period_end), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleAction("reactivate")} disabled={manageMutation.isPending} className="self-start sm:self-auto text-xs sm:text-sm h-8">
                            Reactivate
                          </Button>
                        </div>
                      )}

                      {/* Subscription Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                            <div className="p-2 rounded-full bg-primary/10">
                              <Building className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Facility</p>
                              <p className="font-medium">{subscription.facility_name}</p>
                              {subscription.facility_city && (
                                <p className="text-xs text-muted-foreground">
                                  {subscription.facility_city}, {subscription.facility_state}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                            <div className="p-2 rounded-full bg-success/10">
                              <DollarSign className="h-5 w-5 text-success" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                              <p className="font-medium">${subscription.monthly_amount}/mo</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                            <div className="p-2 rounded-full bg-info/10">
                              <Calendar className="h-5 w-5 text-info" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Current Period</p>
                              <p className="font-medium">
                                {isCanceling ? "Ends" : "Renews"} {format(new Date(subscription.current_period_end), "MMM d, yyyy")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(subscription.current_period_end), { addSuffix: true })}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                            <div className="p-2 rounded-full bg-warning/10">
                              <User className="h-5 w-5 text-warning" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Leads Unlocked This Month</p>
                              <p className="font-medium">{subscription.leads_used}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Up to {subscription.location_limit} facilities
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="p-4 rounded-lg border bg-card">
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Customer Details
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Email</p>
                            <p className="font-medium">{subscription.customer_email}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Customer Since</p>
                            <p className="font-medium">{format(new Date(subscription.created), "MMM d, yyyy")}</p>
                          </div>
                          {details?.customer?.name && (
                            <div>
                              <p className="text-muted-foreground">Name</p>
                              <p className="font-medium">{details.customer.name}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-muted-foreground">Stripe Customer ID</p>
                            <p className="font-mono text-xs">{subscription.customer_id}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* Payments Tab */}
                <TabsContent value="payments" className="m-0">
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : details?.payment_history && details.payment_history.length > 0 ? (
                    <div className="space-y-3">
                      {details.payment_history.map((payment) => (
                        <div 
                          key={payment.id} 
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${
                              payment.status === "succeeded" ? "bg-success/10" : "bg-destructive/10"
                            }`}>
                              <CreditCard className={`h-4 w-4 ${
                                payment.status === "succeeded" ? "text-success" : "text-destructive"
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium">
                                ${(payment.amount / 100).toFixed(2)} {payment.currency.toUpperCase()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(payment.created * 1000), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground capitalize">
                              {payment.payment_method_type?.replace("_", " ") || "Card"}
                            </span>
                            <StatusBadge status={payment.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No payment history found</p>
                    </div>
                  )}
                </TabsContent>

                {/* Invoices Tab */}
                <TabsContent value="invoices" className="m-0">
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : details?.invoices && details.invoices.length > 0 ? (
                    <div className="space-y-3">
                      {details.invoices.map((invoice) => (
                        <div 
                          key={invoice.id} 
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-info/10">
                              <Receipt className="h-4 w-4 text-info" />
                            </div>
                            <div>
                              <p className="font-medium">{invoice.number || `Invoice ${invoice.id.slice(-8)}`}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(invoice.created * 1000), "MMM d, yyyy")}
                                {" • "}
                                Period: {format(new Date(invoice.period_start * 1000), "MMM d")} - {format(new Date(invoice.period_end * 1000), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-medium">
                              ${(invoice.amount_paid / 100).toFixed(2)}
                            </span>
                            <StatusBadge status={invoice.status} />
                            {invoice.hosted_invoice_url && (
                              <a 
                                href={invoice.hosted_invoice_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                View
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Receipt className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No invoices found</p>
                    </div>
                  )}
                </TabsContent>

                {/* Timeline Tab */}
                <TabsContent value="timeline" className="m-0">
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : details?.timeline && details.timeline.length > 0 ? (
                    <div className="relative">
                      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
                      <div className="space-y-4">
                        {details.timeline.map((event, i) => (
                          <div key={i} className="flex gap-4 relative">
                            <div className="w-10 h-10 rounded-full border-2 border-background bg-card flex items-center justify-center z-10 shadow-sm">
                              <TimelineIcon type={event.type} />
                            </div>
                            <div className="flex-1 pb-4">
                              <p className="font-medium">{event.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(event.date), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                              {event.metadata && Object.keys(event.metadata).length > 0 && (
                                <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                                  {Object.entries(event.metadata).map(([key, value]) => (
                                    <div key={key} className="flex gap-2">
                                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>
                                      <span>{value}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No timeline events found</p>
                    </div>
                  )}
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "cancel" && "Cancel Subscription at Period End"}
              {confirmAction === "cancel_immediately" && "Cancel Subscription Immediately"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "cancel" && (
                <>
                  The subscription will remain active until {format(new Date(subscription.current_period_end), "MMM d, yyyy")}, 
                  then automatically cancel. The provider will retain access until then.
                </>
              )}
              {confirmAction === "cancel_immediately" && (
                <>
                  The subscription will be canceled immediately and the provider will lose access. 
                  A prorated refund may be issued based on the remaining time.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Label htmlFor="cancel-reason" className="text-sm font-medium">
              Reason for cancellation (optional)
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="Enter reason for cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mt-2"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={manageMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmActionHandler}
              disabled={manageMutation.isPending}
              className={confirmAction === "cancel_immediately" ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}
            >
              {manageMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
