import { useState } from "react";
import { ListingPreviewModal } from "./listing/ListingPreviewModal";
import logoDarkBg from "@/assets/logo-dark-bg.webp";
import { Link, useNavigate } from "react-router-dom";
import { useProviderCredits } from "@/hooks/useProviderCredits";
import { formatDistanceToNow } from "date-fns";
import { 
  ChevronDown, 
  LogOut, 
  Settings, 
  CreditCard, 
  Building2, 
  ExternalLink,
  Eye,
  Bell,
  Search,
  X,
  UserPlus,
  MessageSquare,
  Shield,
  AlertTriangle,
  BellOff,
  HelpCircle,
  Crown,
  Star,
  Sparkles,
  MapPin,
  Check,
  Plus,
  Lock,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { useFacilityLimits } from "@/hooks/useFacilityLimits";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProviderNotifications } from "@/hooks/useProviderNotifications";
import { ProviderSearchCommand } from "./ProviderSearchCommand";
import { useProviderFacilities, type ProviderFacility } from "@/hooks/useProviderFacilities";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { cn } from "@/lib/utils";

interface ProviderHeaderProps {
  facilityName?: string;
  facilityId?: string;
  facilitySlug?: string | null;
  facilityLogo?: string | null;
  userName?: string;
  onLogout: () => void;
}

const notificationIcons: Record<string, React.ReactNode> = {
  // Lead types
  new_lead: <UserPlus className="h-4 w-4 text-primary" />,
  high_intent_lead: <UserPlus className="h-4 w-4 text-orange-500" />,
  lead_received: <UserPlus className="h-4 w-4 text-primary" />,
  lead_reminder: <Bell className="h-4 w-4 text-amber-500" />,
  lead_expired: <AlertTriangle className="h-4 w-4 text-destructive" />,
  lead_status_changed: <MessageSquare className="h-4 w-4 text-primary" />,
  lead_redistributed: <UserPlus className="h-4 w-4 text-primary" />,
  lead_unlocked: <Check className="h-4 w-4 text-green-500" />,
  // Billing types
  credits_added: <CreditCard className="h-4 w-4 text-green-500" />,
  subscription_updated: <CreditCard className="h-4 w-4 text-accent-foreground" />,
  subscription_active: <Crown className="h-4 w-4 text-amber-500" />,
  subscription_renewal: <CreditCard className="h-4 w-4 text-purple-500" />,
  subscription_cancelled: <AlertTriangle className="h-4 w-4 text-destructive" />,
  payment_failed: <AlertCircle className="h-4 w-4 text-destructive" />,
  low_credits_warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  lead_limit_warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  concierge_invoice_issued: <CreditCard className="h-4 w-4 text-purple-500" />,
  concierge_invoice_paid: <CreditCard className="h-4 w-4 text-green-500" />,
  // Listing types
  listing_approved: <Shield className="h-4 w-4 text-green-500" />,
  listing_rejected: <AlertCircle className="h-4 w-4 text-destructive" />,
  listing_needs_edits: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  featured_activated: <Star className="h-4 w-4 text-amber-500" />,
  featured_expired: <Star className="h-4 w-4 text-muted-foreground" />,
  image_flagged: <AlertTriangle className="h-4 w-4 text-destructive" />,
  credential_verified: <Shield className="h-4 w-4 text-green-500" />,
  credential_rejected: <AlertCircle className="h-4 w-4 text-destructive" />,
  // Placement types
  placement_introduction: <UserPlus className="h-4 w-4 text-indigo-500" />,
  concierge_seeker_confirmed: <Check className="h-4 w-4 text-green-500" />,
  concierge_placement_complete: <Check className="h-4 w-4 text-green-500" />,
  tour_request: <MessageSquare className="h-4 w-4 text-blue-500" />,
  tour_confirmed: <Check className="h-4 w-4 text-green-500" />,
  tour_cancelled: <AlertTriangle className="h-4 w-4 text-destructive" />,
  // Review & system
  review_received: <MessageSquare className="h-4 w-4 text-yellow-500" />,
  system: <Settings className="h-4 w-4 text-muted-foreground" />,
};

// Facility limits now handled by useFacilityLimits hook

export function ProviderHeader({ facilityName, facilityId, facilitySlug, facilityLogo, userName, onLogout }: ProviderHeaderProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const navigate = useNavigate();
  
  const { notifications, unreadCount, markAsRead, isLoading: notificationsLoading } = useProviderNotifications();
  const { facilities, isLoading: facilitiesLoading } = useProviderFacilities();
  const { 
    selectedFacility, 
    requestFacilitySwitch, 
    pendingFacilitySwitch, 
    confirmFacilitySwitch, 
    cancelFacilitySwitch 
  } = useSelectedFacility();
  const { canAddMore, planTier, limit: locationLimit } = useFacilityLimits();
  const { data: creditsData, isLoading: creditsLoading } = useProviderCredits(facilityId);
  
  const recentNotifications = notifications.slice(0, 5);
  const isPro = planTier === "pro";
  const approvedFacilities = facilities.filter(f => f.status === "approved" && !f.suspended);
  const pendingFacilities = facilities.filter(f => f.status === "pending" && !f.suspended);
  const suspendedFacilities = facilities.filter(f => f.suspended);

  const getPlanConfig = (isPro: boolean) => {
    if (isPro) {
      return {
        label: "Pro",
        icon: Crown,
        gradient: "from-amber-500 to-yellow-400",
        textColor: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
      };
    }
    return {
      label: "Free",
      icon: Sparkles,
      gradient: "from-slate-400 to-slate-500",
      textColor: "text-muted-foreground",
      bgColor: "bg-muted/50",
      borderColor: "border-border",
    };
  };

  const planConfig = getPlanConfig(isPro);
  const PlanIcon = planConfig.icon;
  
  const initials = userName
    ?.split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2) || "P";

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    const metadata = notification.metadata as Record<string, any> | null;
    if (metadata?.link) {
      navigate(metadata.link);
      return;
    }
    
    // Lead-related notification types — route to inquiries
    const leadTypes = [
      "new_lead", "high_intent_lead", "lead_received", "lead_status_changed", 
      "lead_redistributed", "lead_unlocked", "lead_reminder", "lead_expired",
    ];
    const billingTypes = [
      "credits_added", "subscription_updated", "subscription_active", "subscription_renewal",
      "subscription_cancelled", "payment_failed", "low_credits_warning", "lead_limit_warning",
      "concierge_invoice_issued", "concierge_invoice_paid",
    ];
    const listingTypes = ["listing_approved", "listing_rejected", "listing_needs_edits", "featured_activated", "featured_expired", "image_flagged", "credential_verified", "credential_rejected"];
    const placementTypes = ["placement_introduction", "concierge_seeker_confirmed", "concierge_placement_complete", "tour_request", "tour_confirmed", "tour_cancelled"];

    if (leadTypes.includes(notification.type)) {
      navigate("/provider/inquiries");
    } else if (billingTypes.includes(notification.type)) {
      navigate("/provider/billing");
    } else if (listingTypes.includes(notification.type)) {
      navigate("/provider/listings");
    } else if (placementTypes.includes(notification.type)) {
      navigate("/provider/placement-network");
    } else if (notification.type === "review_received") {
      navigate("/provider/reviews");
    } else {
      navigate("/provider/notifications");
    }
  };

  const handleFacilitySelect = (facility: ProviderFacility) => {
    if (facility.id !== selectedFacility?.id) {
      requestFacilitySwitch(facility);
    }
  };

  return (
    <>
    <header className="sticky top-0 z-50 bg-primary border-b border-white/10 shadow-md">
      <div className="h-16 md:h-[72px] max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left - Logo */}
        <div className="flex items-center shrink-0">
          <img 
            src={logoDarkBg} 
            alt="RehabLookup" 
            className="h-6 sm:h-7 md:h-8 w-auto"
          />
        </div>

        {/* Center - Search (Desktop) */}
        <div className="hidden lg:flex flex-1 max-w-md">
          <ProviderSearchCommand facilityId={facilityId} />
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">

          {/* Mobile Search Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9 sm:h-10 sm:w-10 text-white hover:text-white hover:bg-white/15 transition-all duration-200 hover:scale-105 active:scale-95"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          >
            {mobileSearchOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Search className="h-4 w-4 sm:h-5 sm:w-5" />}
          </Button>

          {/* Credit Balance */}
          <Link
            to="/provider/billing"
            className="hidden lg:inline-flex items-center gap-2 h-10 px-3.5 text-sm font-medium text-white hover:bg-white/15 rounded-lg transition-all duration-200 border border-white/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <CreditCard className="h-4 w-4" />
            {creditsLoading ? (
              <span className="animate-pulse">···</span>
            ) : (
              <span className="font-bold tabular-nums">${((creditsData?.balance_cents || 0) / 100).toFixed(2)}</span>
            )}
          </Link>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="relative h-9 w-9 sm:h-10 sm:w-10 text-white hover:text-white hover:bg-white/15 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-destructive text-[9px] sm:text-xs font-bold text-white ring-2 ring-primary">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-card" sideOffset={8}>
              <div className="flex items-center justify-between py-3 px-3">
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs h-5 px-2">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              <DropdownMenuSeparator />
              {notificationsLoading ? (
                <div className="py-8 text-center">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : recentNotifications.length === 0 ? (
                <div className="py-8 text-center">
                  <BellOff className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications</p>
                </div>
              ) : (
                <div className="max-h-[320px] overflow-y-auto">
                  {recentNotifications.map((notification) => (
                    <DropdownMenuItem 
                      key={notification.id} 
                      className="flex items-start gap-3 p-3 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="mt-0.5 shrink-0">
                        {notificationIcons[notification.type] || notificationIcons.system}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between w-full gap-2">
                          <span className={`text-sm font-medium line-clamp-1 ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {notification.title}
                          </span>
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {notification.message}
                        </span>
                        <span className="text-xs text-muted-foreground/60 mt-1 block">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link 
                  to="/provider/notifications" 
                  className="justify-center text-primary text-sm cursor-pointer py-2.5 w-full"
                >
                  View all notifications
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden sm:block h-6 sm:h-7 w-px bg-white/30 mx-1 sm:mx-2" />

          {/* Account & Location Merged Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="gap-1.5 sm:gap-2 text-white hover:text-white hover:bg-white/15 h-9 sm:h-10 pl-1.5 sm:pl-2 pr-2 sm:pr-3 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/30 border border-white/30 flex items-center justify-center text-xs sm:text-sm font-semibold text-white overflow-hidden">
                  {selectedFacility?.logo_url ? (
                    <img src={selectedFacility.logo_url} alt={`${selectedFacility.name} logo`} className="h-full w-full object-cover" />
                  ) : facilityLogo ? (
                    <img src={facilityLogo} alt={`${facilityName || 'Facility'} logo`} className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="hidden sm:flex flex-col items-start min-w-0">
                  <span className="text-xs font-medium text-white/90 truncate max-w-[120px]">
                    {selectedFacility?.name || facilityName || "Select Facility"}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/70 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[280px] p-0 bg-card shadow-xl border-border/50" sideOffset={8}>
              {/* User Profile Header */}
              <div className="p-4 bg-gradient-to-br from-muted/30 to-muted/10">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-sm font-semibold text-primary overflow-hidden shadow-sm">
                    {facilityLogo ? (
                      <img src={facilityLogo} alt={`${facilityName || 'Facility'} logo`} className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate text-foreground">{userName || "Provider"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedFacility?.city && selectedFacility?.state 
                        ? `${selectedFacility.city}, ${selectedFacility.state}` 
                        : "Manage your account"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Plan Badge - Compact */}
              <Link 
                to="/provider/pro-upgrade"
                className={cn(
                  "flex items-center justify-between mx-3 my-2.5 px-3 py-2 rounded-lg transition-all",
                  planConfig.bgColor,
                  "border",
                  planConfig.borderColor,
                  "hover:opacity-80"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center bg-gradient-to-br",
                    planConfig.gradient
                  )}>
                    <PlanIcon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className={cn("text-xs font-semibold", planConfig.textColor)}>
                      {planConfig.label} Plan
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {!isPro ? 'Upgrade available' : 'Active subscription'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <DropdownMenuSeparator className="my-0" />

              {/* Locations Section */}
              <div className="py-2">
                <div className="flex items-center justify-between px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Locations</span>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {facilities.length}/{locationLimit}
                  </span>
                </div>

                {/* Location List */}
                {facilitiesLoading ? (
                  <div className="px-3 py-2 space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <div className="flex-1">
                          <Skeleton className="h-3.5 w-28" />
                          <Skeleton className="h-2.5 w-20 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : facilities.length === 0 ? (
                  <div className="px-3 py-4 text-center">
                    <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-1.5" />
                    <p className="text-xs text-muted-foreground">No facilities yet</p>
                  </div>
                ) : (
                  <div className="max-h-[140px] overflow-y-auto px-1.5">
                    {/* Approved facilities */}
                    {approvedFacilities.map((facility) => (
                      <button 
                        key={facility.id}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2 py-2 rounded-md transition-colors text-left",
                          facility.id === selectedFacility?.id 
                            ? "bg-primary/8 border border-primary/20" 
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => handleFacilitySelect(facility)}
                      >
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden",
                          facility.id === selectedFacility?.id ? "bg-primary/15" : "bg-muted"
                        )}>
                          {facility.logo_url ? (
                            <img src={facility.logo_url} alt={`${facility.name} logo`} className="h-full w-full object-cover" />
                          ) : (
                            <Building2 className={cn(
                              "h-4 w-4",
                              facility.id === selectedFacility?.id ? "text-primary" : "text-muted-foreground"
                            )} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            "truncate text-sm",
                            facility.id === selectedFacility?.id ? "font-medium text-foreground" : "text-foreground/80"
                          )}>
                            {facility.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {facility.city}, {facility.state}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          {facility.id === selectedFacility?.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </button>
                    ))}

                    {/* Pending facilities */}
                    {pendingFacilities.map((facility) => (
                      <button 
                        key={facility.id}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2 py-2 rounded-md transition-colors text-left opacity-70",
                          facility.id === selectedFacility?.id 
                            ? "bg-warning/5 border border-warning/20" 
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => handleFacilitySelect(facility)}
                      >
                        <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {facility.logo_url ? (
                            <img src={facility.logo_url} alt={`${facility.name} logo`} className="h-full w-full object-cover" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-warning" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground/80">{facility.name}</p>
                          <p className="text-xs text-muted-foreground truncate">Pending review</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                          {facility.id === selectedFacility?.id && (
                            <Check className="h-4 w-4 text-warning" />
                          )}
                        </div>
                      </button>
                    ))}

                    {/* Suspended facilities */}
                    {suspendedFacilities.map((facility) => (
                      <div 
                        key={facility.id}
                        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md opacity-50 cursor-not-allowed"
                      >
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          {facility.logo_url ? (
                            <img src={facility.logo_url} alt={`${facility.name} logo`} className="h-full w-full object-cover grayscale" />
                          ) : (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-muted-foreground">{facility.name}</p>
                          <p className="text-xs text-muted-foreground/70 truncate">Paused — upgrade to reactivate</p>
                        </div>
                        <div className="shrink-0">
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Location Link */}
                {canAddMore ? (
                  <Link 
                    to="/provider/add-location" 
                    className="flex items-center gap-2.5 mx-1.5 mt-1 px-2 py-2 rounded-md text-primary hover:bg-primary/5 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-dashed border-primary/30">
                      <Plus className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">Add Location</span>
                  </Link>
                ) : (
                  <Link 
                    to="/provider/pro-upgrade" 
                    className="flex items-center gap-2.5 mx-1.5 mt-1 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-sm text-muted-foreground">Upgrade to Pro</span>
                  </Link>
                )}
              </div>
              
              <DropdownMenuSeparator className="my-0" />
              
              {/* Quick Actions */}
              <div className="py-1.5">
                <DropdownMenuItem asChild>
                  <Link to="/provider/listings" className="flex items-center gap-3 cursor-pointer py-2 px-3 mx-1.5 rounded-md">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">My Listing</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/provider/settings" className="flex items-center gap-3 cursor-pointer py-2 px-3 mx-1.5 rounded-md">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/provider/billing" className="flex items-center gap-3 cursor-pointer py-2 px-3 mx-1.5 rounded-md">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Billing</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/provider/help" className="flex items-center gap-3 cursor-pointer py-2 px-3 mx-1.5 rounded-md">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Help</span>
                  </Link>
                </DropdownMenuItem>
              </div>
              
              <DropdownMenuSeparator className="my-0" />
              
              {/* Sign Out */}
              <div className="p-1.5">
                <DropdownMenuItem 
                  onClick={onLogout}
                  className="flex items-center gap-3 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 py-2 px-3 mx-0 rounded-md"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">Sign Out</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Search Expanded */}
      {mobileSearchOpen && (
        <div className="lg:hidden px-4 pb-3 bg-primary border-t border-white/10 animate-fade-in">
          <ProviderSearchCommand 
            facilityId={facilityId} 
            onClose={() => setMobileSearchOpen(false)} 
            variant="header"
          />
        </div>
      )}

      {/* Unsaved Changes Confirmation Dialog */}
      <AlertDialog open={!!pendingFacilitySwitch} onOpenChange={(open) => !open && cancelFacilitySwitch()}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes on this listing. Are you sure you want to switch locations? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelFacilitySwitch}>Stay Here</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFacilitySwitch} className="bg-destructive hover:bg-destructive/90">
              Discard & Switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>

      {/* Listing Preview Modal */}
      {facilitySlug && facilityName && (
        <ListingPreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          facilityName={facilityName}
          facilitySlug={facilitySlug}
        />
      )}
    </>
  );
}
