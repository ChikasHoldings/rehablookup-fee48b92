import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Ticket,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  Percent,
  DollarSign,
  RefreshCw,
  Tag,
  XCircle,
  Users,
  CalendarIcon,
  AlertTriangle,
  Clock,
  BarChart3,
  TrendingUp,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PLAN_DETAILS } from "@/hooks/useSubscription";

type Coupon = {
  id: string;
  name: string;
  percent_off: number | null;
  amount_off: number | null;
  currency: string;
  duration: "once" | "repeating" | "forever";
  duration_in_months: number | null;
  max_redemptions: number | null;
  times_redeemed: number;
  valid: boolean;
  created: number;
};

type PromoCode = {
  id: string;
  code: string;
  coupon: { id: string; name: string };
  active: boolean;
  times_redeemed: number;
  max_redemptions: number | null;
  expires_at: number | null;
  created: number;
};

type PromoRedemption = {
  customerId: string;
  customerEmail: string;
  customerName: string;
  redeemedAt: number;
  subscriptionId?: string;
};

type PromoAnalytics = {
  promoCodeId: string;
  code: string;
  totalRedemptions: number;
  redemptions: PromoRedemption[];
};

export function PlanSettingsTab() {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const previousPromoCodesRef = useRef<string[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    discountType: "percent" as "percent" | "amount",
    percentOff: "",
    amountOff: "",
    duration: "once" as "once" | "repeating" | "forever",
    durationInMonths: "",
    maxRedemptions: "",
    expiresAt: undefined as Date | undefined,
  });

  // Fetch promo code analytics
  const { data: analyticsData, isLoading: isLoadingAnalytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ["admin-promo-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-subscription", {
        body: { action: "get_promo_analytics" },
      });
      if (error) throw error;
      return data as { analytics: PromoAnalytics[] };
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fetch coupons and promo codes with auto-refresh
  const { data: couponData, isLoading, refetch } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-subscription", {
        body: { action: "list_coupons" },
      });
      if (error) throw error;
      return data as { coupons: Coupon[]; promoCodes: PromoCode[] };
    },
    refetchInterval: 15000, // Auto-refresh every 15 seconds for real-time updates
  });

  // Detect new promo codes and show notification
  useEffect(() => {
    if (couponData?.promoCodes) {
      const currentCodes = couponData.promoCodes.map(p => p.id);
      const previousCodes = previousPromoCodesRef.current;
      
      // Only check if we have previous data (not initial load)
      if (previousCodes.length > 0) {
        const newCodes = currentCodes.filter(id => !previousCodes.includes(id));
        if (newCodes.length > 0) {
          const newPromo = couponData.promoCodes.find(p => newCodes.includes(p.id));
          if (newPromo) {
            toast.info(`New promo code detected: ${newPromo.code}`, {
              description: "The list has been updated automatically",
            });
          }
        }
      }
      
      previousPromoCodesRef.current = currentCodes;
    }
  }, [couponData?.promoCodes]);

  // Create coupon mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        action: "create_coupon",
        name: formData.name,
        duration: formData.duration,
      };

      if (formData.discountType === "percent") {
        body.percent_off = parseFloat(formData.percentOff);
      } else {
        body.amount_off = Math.round(parseFloat(formData.amountOff) * 100); // Convert to cents
        body.currency = "usd";
      }

      if (formData.duration === "repeating" && formData.durationInMonths) {
        body.duration_in_months = parseInt(formData.durationInMonths);
      }

      if (formData.maxRedemptions) {
        body.max_redemptions = parseInt(formData.maxRedemptions);
      }

      if (formData.expiresAt) {
        // Set to end of day in UTC
        const expiresDate = new Date(formData.expiresAt);
        expiresDate.setHours(23, 59, 59, 999);
        body.expires_at = Math.floor(expiresDate.getTime() / 1000); // Convert to Unix timestamp
      }

      const { data, error } = await supabase.functions.invoke("manage-subscription", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Promo code created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create promo code");
    },
  });

  // Delete coupon mutation
  const deleteMutation = useMutation({
    mutationFn: async (couponId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-subscription", {
        body: { action: "delete_coupon", couponId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Coupon deleted successfully");
      setDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete coupon");
    },
  });

  // Deactivate promo code mutation
  const deactivateMutation = useMutation({
    mutationFn: async (promoCodeId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-subscription", {
        body: { action: "deactivate_promo_code", promoCodeId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Promo code deactivated");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to deactivate promo code");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      discountType: "percent",
      percentOff: "",
      amountOff: "",
      duration: "once",
      durationInMonths: "",
      maxRedemptions: "",
      expiresAt: undefined,
    });
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.percent_off) {
      return `${coupon.percent_off}% off`;
    }
    if (coupon.amount_off) {
      return `$${(coupon.amount_off / 100).toFixed(2)} off`;
    }
    return "Unknown";
  };

  const formatDuration = (coupon: Coupon) => {
    switch (coupon.duration) {
      case "once":
        return "One-time";
      case "forever":
        return "Forever";
      case "repeating":
        return `${coupon.duration_in_months} months`;
      default:
        return coupon.duration;
    }
  };

  // Extract numeric price from PLAN_DETAILS (remove $ sign)
  const getPriceNumber = (price: string) => {
    return price.replace(/[^0-9,]/g, "");
  };

  return (
    <div className="space-y-6">
      {/* Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Subscription Plans
          </CardTitle>
          <CardDescription>Current plan pricing and features (managed via Stripe)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Free Plan */}
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline">Free</Badge>
                <span className="text-2xl font-bold">Free</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• {PLAN_DETAILS.free.location_limit} facility listing</li>
                <li>• Receive locked leads</li>
                <li>• Pay per unlock ($25-39)</li>
              </ul>
            </div>

            {/* Pro Plan */}
            <div className="rounded-lg border p-4 bg-warning/5 border-warning/20">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Pro</Badge>
                <span className="text-2xl font-bold">{PLAN_DETAILS.pro.price}<span className="text-sm font-normal">{PLAN_DETAILS.pro.period}</span></span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Up to {PLAN_DETAILS.pro.location_limit} facility listings</li>
                <li>• {PLAN_DETAILS.pro.unlock_discount}% off lead unlocks</li>
                <li>• Featured homepage placement</li>
                <li>• Priority search ranking</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            To modify plan pricing, go to the Stripe Dashboard → Products
          </p>
        </CardContent>
      </Card>

      {/* Promo Codes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Promo Codes
              </CardTitle>
              <CardDescription>Create and manage discount codes</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Promo Code
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader className="pb-4 border-b">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Ticket className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <DialogTitle className="text-lg">Create Promo Code</DialogTitle>
                        <DialogDescription className="text-sm">
                          Create a discount code for provider subscriptions
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    {/* Code Name Section */}
                    <div className="space-y-3">
                      <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        Promo Code
                      </Label>
                      <Input
                        id="name"
                        placeholder="e.g., SUMMER2026"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                        className="font-mono text-base tracking-wider"
                      />
                      {formData.name && (
                        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                          <span className="text-xs text-muted-foreground">Preview:</span>
                          <Badge variant="outline" className="font-mono tracking-wider">
                            {formData.name}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Discount Section */}
                    <div className="space-y-3 p-4 rounded-lg border bg-card">
                      <Label className="text-sm font-medium">Discount Amount</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={formData.discountType === "percent" ? "default" : "outline"}
                          className="h-12 flex-col gap-1"
                          onClick={() => setFormData({ ...formData, discountType: "percent", amountOff: "" })}
                        >
                          <Percent className="h-4 w-4" />
                          <span className="text-xs">Percentage</span>
                        </Button>
                        <Button
                          type="button"
                          variant={formData.discountType === "amount" ? "default" : "outline"}
                          className="h-12 flex-col gap-1"
                          onClick={() => setFormData({ ...formData, discountType: "amount", percentOff: "" })}
                        >
                          <DollarSign className="h-4 w-4" />
                          <span className="text-xs">Fixed Amount</span>
                        </Button>
                      </div>

                      {formData.discountType === "percent" ? (
                        <div className="space-y-2 pt-2">
                          <Label htmlFor="percentOff" className="text-xs text-muted-foreground">Percentage Off</Label>
                          <div className="relative">
                            <Input
                              id="percentOff"
                              type="number"
                              min="1"
                              max="100"
                              placeholder="25"
                              value={formData.percentOff}
                              onChange={(e) => setFormData({ ...formData, percentOff: e.target.value })}
                              className="pr-10 text-lg font-semibold"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-2">
                          <Label htmlFor="amountOff" className="text-xs text-muted-foreground">Amount Off (USD)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                            <Input
                              id="amountOff"
                              type="number"
                              min="1"
                              placeholder="50"
                              value={formData.amountOff}
                              onChange={(e) => setFormData({ ...formData, amountOff: e.target.value })}
                              className="pl-8 text-lg font-semibold"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Duration Section */}
                    <div className="space-y-3">
                      <Label htmlFor="duration" className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        Duration
                      </Label>
                      <Select
                        value={formData.duration}
                        onValueChange={(value: "once" | "repeating" | "forever") =>
                          setFormData({ ...formData, duration: value })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="once">
                            <div className="flex flex-col items-start">
                              <span>One-time</span>
                              <span className="text-xs text-muted-foreground">First payment only</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="repeating">
                            <div className="flex flex-col items-start">
                              <span>Multiple months</span>
                              <span className="text-xs text-muted-foreground">Specify number of months</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="forever">
                            <div className="flex flex-col items-start">
                              <span>Forever</span>
                              <span className="text-xs text-muted-foreground">All future payments</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {formData.duration === "repeating" && (
                        <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                          <Label htmlFor="durationInMonths" className="text-xs text-muted-foreground">Number of Months</Label>
                          <Input
                            id="durationInMonths"
                            type="number"
                            min="1"
                            max="36"
                            placeholder="3"
                            value={formData.durationInMonths}
                            onChange={(e) => setFormData({ ...formData, durationInMonths: e.target.value })}
                            className="w-24"
                          />
                        </div>
                      )}
                    </div>

                    {/* Limits Section */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maxRedemptions" className="text-sm font-medium flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          Max Uses
                        </Label>
                        <Input
                          id="maxRedemptions"
                          type="number"
                          min="1"
                          placeholder="Unlimited"
                          value={formData.maxRedemptions}
                          onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave empty for unlimited
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          Expires
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal h-10",
                                !formData.expiresAt && "text-muted-foreground"
                              )}
                            >
                              {formData.expiresAt ? format(formData.expiresAt, "MMM d, yyyy") : "Never"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={formData.expiresAt}
                              onSelect={(date) => setFormData({ ...formData, expiresAt: date })}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        {formData.expiresAt && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setFormData({ ...formData, expiresAt: undefined })}
                          >
                            Clear expiration
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Summary Preview */}
                    {formData.name && (formData.percentOff || formData.amountOff) && (
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-xs font-medium text-primary mb-2">Code Summary</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="font-mono">{formData.name}</Badge>
                          <span className="text-sm text-muted-foreground">→</span>
                          <span className="text-sm font-medium">
                            {formData.discountType === "percent"
                              ? `${formData.percentOff}% off`
                              : `$${formData.amountOff} off`}
                          </span>
                          <span className="text-sm text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">
                            {formData.duration === "once" && "First payment"}
                            {formData.duration === "forever" && "All payments"}
                            {formData.duration === "repeating" && `${formData.durationInMonths || "?"} months`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => createMutation.mutate()}
                      disabled={
                        createMutation.isPending ||
                        !formData.name ||
                        (formData.discountType === "percent" && !formData.percentOff) ||
                        (formData.discountType === "amount" && !formData.amountOff) ||
                        (formData.duration === "repeating" && !formData.durationInMonths)
                      }
                      className="min-w-[120px]"
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Code
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : couponData?.promoCodes && couponData.promoCodes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {couponData.promoCodes.map((promo) => {
                  const coupon = couponData.coupons.find((c) => c.id === promo.coupon.id);
                  const now = Date.now();
                  const expiresAt = promo.expires_at ? promo.expires_at * 1000 : null;
                  const isExpired = expiresAt && expiresAt < now;
                  const isExpiringSoon = expiresAt && !isExpired && expiresAt < now + 7 * 24 * 60 * 60 * 1000; // 7 days
                  return (
                    <TableRow key={promo.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                            {promo.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(promo.code)}
                          >
                            {copiedCode === promo.code ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {coupon ? (
                          <span className="font-medium">{formatDiscount(coupon)}</span>
                        ) : (
                          promo.coupon.name
                        )}
                      </TableCell>
                      <TableCell>
                        {coupon ? formatDuration(coupon) : "—"}
                      </TableCell>
                      <TableCell>
                        {expiresAt ? (
                          <div className={cn(
                            "flex items-center gap-1.5 text-sm",
                            isExpired && "text-red-600",
                            isExpiringSoon && !isExpired && "text-amber-600"
                          )}>
                            {isExpired ? (
                              <XCircle className="h-3.5 w-3.5" />
                            ) : isExpiringSoon ? (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            ) : (
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <span className={cn(
                              isExpired && "line-through",
                            )}>
                              {format(new Date(expiresAt), "MMM d, yyyy")}
                            </span>
                            {isExpired && (
                              <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 bg-red-50 text-red-600 border-red-200">
                                Expired
                              </Badge>
                            )}
                            {isExpiringSoon && !isExpired && (
                              <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 bg-amber-50 text-amber-600 border-amber-200">
                                Soon
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>
                            {promo.times_redeemed}
                            {promo.max_redemptions ? ` / ${promo.max_redemptions}` : ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {promo.active ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(promo.created * 1000), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {promo.active && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              onClick={() => deactivateMutation.mutate(promo.id)}
                              disabled={deactivateMutation.isPending}
                              title="Deactivate promo code"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteConfirm(coupon?.id || promo.coupon.id)}
                            title="Delete coupon"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Ticket className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No promo codes created yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create your first promo code
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Promo Code Analytics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Promo Code Usage Analytics
              </CardTitle>
              <CardDescription>See which codes are being redeemed and by which providers</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchAnalytics()} disabled={isLoadingAnalytics}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingAnalytics ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingAnalytics ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : analyticsData?.analytics && analyticsData.analytics.length > 0 ? (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4 bg-muted/30">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    Total Redemptions
                  </div>
                  <p className="text-2xl font-bold">
                    {analyticsData.analytics.reduce((sum, a) => sum + a.totalRedemptions, 0)}
                  </p>
                </div>
                <div className="rounded-lg border p-4 bg-muted/30">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Ticket className="h-4 w-4" />
                    Codes Used
                  </div>
                  <p className="text-2xl font-bold">
                    {analyticsData.analytics.length}
                  </p>
                </div>
                <div className="rounded-lg border p-4 bg-muted/30">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    Unique Providers
                  </div>
                  <p className="text-2xl font-bold">
                    {new Set(analyticsData.analytics.flatMap(a => a.redemptions.map(r => r.customerId))).size}
                  </p>
                </div>
              </div>

              {/* Usage Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Promo Code</TableHead>
                    <TableHead className="text-center">Redemptions</TableHead>
                    <TableHead>Redeemed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsData.analytics.map((item) => (
                    <TableRow key={item.promoCodeId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono bg-emerald-50 text-emerald-700 border-emerald-200">
                            {item.code}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-medium">
                          {item.totalRedemptions}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {item.redemptions.slice(0, 5).map((redemption, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <User className="h-3 w-3 text-muted-foreground" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate text-xs">{redemption.customerName}</p>
                                <p className="text-xs text-muted-foreground truncate">{redemption.customerEmail}</p>
                              </div>
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                {format(new Date(redemption.redeemedAt * 1000), "MMM d")}
                              </span>
                            </div>
                          ))}
                          {item.redemptions.length > 5 && (
                            <p className="text-xs text-muted-foreground pl-8">
                              +{item.redemptions.length - 5} more
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No promo code redemptions yet</p>
              <p className="text-sm mt-1">Analytics will appear here when providers use your promo codes</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this coupon? This will also deactivate any associated promo codes. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
