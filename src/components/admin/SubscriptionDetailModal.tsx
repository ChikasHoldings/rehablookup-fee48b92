import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  lead_limit: number;
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

function PlanBadge({ plan }: { plan: string }) {
  const config: Record<string, { label: string; className: string }> = {
    basic: { label: "Basic", className: "bg-slate-100 text-slate-700 border-slate-200" },
    professional: { label: "Professional", className: "bg-blue-100 text-blue-700 border-blue-200" },
    featured: { label: "Featured", className: "bg-amber-100 text-amber-700 border-amber-200" },
  };
  const { label, className } = config[plan] || { label: plan, className: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={className}>{label}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    active: { label: "Active", className: "bg-green-50 text-green-700 border-green-200", icon: <CheckCircle2 className="h-3 w-3" /> },
    canceled: { label: "Canceled", className: "bg-red-50 text-red-700 border-red-200", icon: <XCircle className="h-3 w-3" /> },
    past_due: { label: "Past Due", className: "bg-red-50 text-red-700 border-red-200", icon: <AlertCircle className="h-3 w-3" /> },
    trialing: { label: "Trial", className: "bg-purple-50 text-purple-700 border-purple-200", icon: <Clock className="h-3 w-3" /> },
    incomplete: { label: "Incomplete", className: "bg-slate-50 text-slate-600 border-slate-200", icon: <AlertCircle className="h-3 w-3" /> },
    paid: { label: "Paid", className: "bg-green-50 text-green-700 border-green-200", icon: <CheckCircle2 className="h-3 w-3" /> },
    open: { label: "Open", className: "bg-blue-50 text-blue-700 border-blue-200", icon: <Clock className="h-3 w-3" /> },
    void: { label: "Void", className: "bg-slate-50 text-slate-600 border-slate-200", icon: <XCircle className="h-3 w-3" /> },
    uncollectible: { label: "Uncollectible", className: "bg-red-50 text-red-700 border-red-200", icon: <XCircle className="h-3 w-3" /> },
    succeeded: { label: "Succeeded", className: "bg-green-50 text-green-700 border-green-200", icon: <CheckCircle2 className="h-3 w-3" /> },
    failed: { label: "Failed", className: "bg-red-50 text-red-700 border-red-200", icon: <XCircle className="h-3 w-3" /> },
    pending: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock className="h-3 w-3" /> },
  };
  const { label, className, icon } = config[status] || { label: status, className: "bg-muted text-muted-foreground", icon: null };
  return (
    <Badge variant="outline" className={`${className} flex items-center gap-1`}>
      {icon}
      {label}
    </Badge>
  );
}

function TimelineIcon({ type }: { type: string }) {
  switch (type) {
    case "created":
      return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    case "plan_changed":
      return <ChevronUp className="h-4 w-4 text-blue-500" />;
    case "canceled":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "reactivated":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "payment_succeeded":
      return <DollarSign className="h-4 w-4 text-green-500" />;
    case "payment_failed":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

export function SubscriptionDetailModal({
  subscription,
  open,
  onOpenChange,
}: SubscriptionDetailModalProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: details, isLoading } = useQuery({
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

  if (!subscription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{subscription.facility_name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{subscription.customer_email}</p>
            </div>
            <div className="flex items-center gap-2">
              <PlanBadge plan={subscription.plan} />
              <StatusBadge status={subscription.cancel_at_period_end ? "canceled" : subscription.status} />
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="px-6 border-b">
            <TabsList className="h-10 bg-transparent p-0 w-full justify-start gap-4">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-3"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="payments" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-3"
              >
                Payments
              </TabsTrigger>
              <TabsTrigger 
                value="invoices" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-3"
              >
                Invoices
              </TabsTrigger>
              <TabsTrigger 
                value="timeline" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-3"
              >
                Timeline
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="p-6">
              {/* Overview Tab */}
              <TabsContent value="overview" className="m-0 space-y-6">
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : (
                  <>
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
                          <div className="p-2 rounded-full bg-green-500/10">
                            <DollarSign className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                            <p className="font-medium">${subscription.monthly_amount}/mo</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                          <div className="p-2 rounded-full bg-blue-500/10">
                            <Calendar className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Current Period</p>
                            <p className="font-medium">
                              Renews {format(new Date(subscription.current_period_end), "MMM d, yyyy")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(subscription.current_period_end), { addSuffix: true })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                          <div className="p-2 rounded-full bg-amber-500/10">
                            <User className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Lead Usage</p>
                            <p className="font-medium">{subscription.leads_used} / {subscription.lead_limit} this month</p>
                            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                              <div 
                                className={`h-full rounded-full ${
                                  subscription.leads_used >= subscription.lead_limit ? "bg-red-500" : 
                                  subscription.leads_used >= subscription.lead_limit * 0.8 ? "bg-amber-500" : "bg-green-500"
                                }`}
                                style={{ width: `${Math.min((subscription.leads_used / subscription.lead_limit) * 100, 100)}%` }}
                              />
                            </div>
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
                            payment.status === "succeeded" ? "bg-green-500/10" : "bg-red-500/10"
                          }`}>
                            <CreditCard className={`h-4 w-4 ${
                              payment.status === "succeeded" ? "text-green-600" : "text-red-600"
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
                          <div className="p-2 rounded-full bg-blue-500/10">
                            <Receipt className="h-4 w-4 text-blue-600" />
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
  );
}
