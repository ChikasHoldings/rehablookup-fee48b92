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
  DialogTrigger,
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
  created: number;
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
          <div className="grid gap-4 md:grid-cols-3">
            {/* Basic Plan */}
            <div className="rounded-lg border p-4 bg-slate-50/50">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">Basic</Badge>
                <span className="text-2xl font-bold">Free</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• {PLAN_DETAILS.basic.qualified_lead_limit} qualified leads/month</li>
                <li>• {PLAN_DETAILS.basic.direct_lead_limit === -1 ? "Unlimited" : PLAN_DETAILS.basic.direct_lead_limit} direct inquiry</li>
                <li>• Basic profile listing</li>
                <li>• Hidden phone/website</li>
              </ul>
            </div>

            {/* Professional Plan */}
            <div className="rounded-lg border p-4 bg-blue-50/50 border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">Professional</Badge>
                <span className="text-2xl font-bold">${getPriceNumber(PLAN_DETAILS.professional.price)}<span className="text-sm font-normal">/mo</span></span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• {PLAN_DETAILS.professional.qualified_lead_limit} exclusive qualified leads/month</li>
                <li>• Unlimited direct inquiries</li>
                <li>• Full contact visibility</li>
                <li>• Standard search placement</li>
              </ul>
            </div>

            {/* Featured Plan */}
            <div className="rounded-lg border p-4 bg-amber-50/50 border-amber-200">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">Featured</Badge>
                <span className="text-2xl font-bold">${getPriceNumber(PLAN_DETAILS.featured.price)}<span className="text-sm font-normal">/mo</span></span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• {PLAN_DETAILS.featured.qualified_lead_limit} exclusive qualified leads/month</li>
                <li>• Unlimited direct inquiries</li>
                <li>• Homepage featured placement</li>
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
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Promo Code
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Promo Code</DialogTitle>
                    <DialogDescription>
                      Create a new discount code for subscriptions
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Code Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., SUMMER2024"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                      />
                      <p className="text-xs text-muted-foreground">
                        This will be the promo code users enter
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Discount Type</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={formData.discountType === "percent" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFormData({ ...formData, discountType: "percent", amountOff: "" })}
                        >
                          <Percent className="h-4 w-4 mr-1" />
                          Percentage
                        </Button>
                        <Button
                          type="button"
                          variant={formData.discountType === "amount" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFormData({ ...formData, discountType: "amount", percentOff: "" })}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Fixed Amount
                        </Button>
                      </div>
                    </div>

                    {formData.discountType === "percent" ? (
                      <div className="space-y-2">
                        <Label htmlFor="percentOff">Percentage Off</Label>
                        <div className="relative">
                          <Input
                            id="percentOff"
                            type="number"
                            min="1"
                            max="100"
                            placeholder="25"
                            value={formData.percentOff}
                            onChange={(e) => setFormData({ ...formData, percentOff: e.target.value })}
                            className="pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="amountOff">Amount Off (USD)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="amountOff"
                            type="number"
                            min="1"
                            placeholder="50"
                            value={formData.amountOff}
                            onChange={(e) => setFormData({ ...formData, amountOff: e.target.value })}
                            className="pl-7"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration</Label>
                      <Select
                        value={formData.duration}
                        onValueChange={(value: "once" | "repeating" | "forever") =>
                          setFormData({ ...formData, duration: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="once">One-time (first payment only)</SelectItem>
                          <SelectItem value="repeating">Multiple months</SelectItem>
                          <SelectItem value="forever">Forever (all payments)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.duration === "repeating" && (
                      <div className="space-y-2">
                        <Label htmlFor="durationInMonths">Number of Months</Label>
                        <Input
                          id="durationInMonths"
                          type="number"
                          min="1"
                          max="36"
                          placeholder="3"
                          value={formData.durationInMonths}
                          onChange={(e) => setFormData({ ...formData, durationInMonths: e.target.value })}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="maxRedemptions">Max Redemptions (optional)</Label>
                      <Input
                        id="maxRedemptions"
                        type="number"
                        min="1"
                        placeholder="Unlimited"
                        value={formData.maxRedemptions}
                        onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave empty for unlimited uses
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Expiration Date (optional)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.expiresAt && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.expiresAt ? format(formData.expiresAt, "PPP") : "No expiration"}
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
                      <p className="text-xs text-muted-foreground">
                        Leave empty for no expiration
                      </p>
                    </div>
                  </div>

                  <DialogFooter>
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
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Code"
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
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {couponData.promoCodes.map((promo) => {
                  const coupon = couponData.coupons.find((c) => c.id === promo.coupon.id);
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
