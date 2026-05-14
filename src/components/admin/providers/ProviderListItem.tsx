import { formatDistanceToNow } from "date-fns";
import {
  Building2,
  CheckCircle,
  XCircle,
  Star,
  Ban,
  BadgeCheck,
  Users,
  Clock,
  MapPin,
  Calendar,
  MoreHorizontal,
  Eye,
  ExternalLink,
  RefreshCw,
  Trash2,
  Shield,
  Crown,
  Handshake,
  Database,
  UserPlus,
  Unlock,
  Lock,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Facility = {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  zip_code: string;
  phone: string;
  email: string | null;
  website: string | null;
  description: string | null;
  facility_type: string;
  bed_count: string | null;
  gender_served: string | null;
  status: string;
  featured: boolean;
  verified: boolean | null;
  suspended: boolean | null;
  logo_url: string | null;
  gallery_urls: string[] | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  slug: string | null;
  user_id: string | null;
  concierge_network_opted_in: boolean | null;
  concierge_terms_accepted_at: string | null;
  // Source / claim provenance — used to differentiate listings imported in bulk
  // from SAMHSA (data_source = "samhsa_import") from ones submitted directly by
  // a provider (data_source = "provider") or added by an admin (data_source =
  // "manual"). claimed_at is set when an unclaimed listing transitions to a
  // provider's ownership through the facility_claim_requests workflow.
  data_source: string | null;
  claimed_at: string | null;
  samhsa_facility_id: string | null;
};

export type ProSubscription = {
  id: string;
  facility_id: string;
  status: string;
  unlock_discount_percent: number;
  current_period_end: string | null;
};

interface ProviderListItemProps {
  provider: Facility;
  isPro: boolean;
  leadCount: number;
  // Count of currently-pending facility_claim_requests for this facility. When
  // > 0 the list row surfaces a bell badge so admins can act on the claim
  // queue without leaving the providers list.
  pendingClaimCount?: number;
  canModerate?: boolean;
  onOpenDetail: (provider: Facility) => void;
  onStatusChange: (id: string, status: string) => void;
  onToggleVerified: (id: string, currentValue: boolean | null) => void;
  onToggleFeatured: (id: string, currentValue: boolean) => void;
  onSuspend: (provider: Facility) => void;
  onReactivate: (provider: Facility) => void;
  onDelete: (provider: Facility) => void;
}

export function getStatusIcon(provider: Facility) {
  if (provider.suspended) return <Ban className="h-4 w-4 text-destructive" />;
  if (provider.status === "approved") return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  if (provider.status === "pending") return <Clock className="h-4 w-4 text-amber-500" />;
  return <XCircle className="h-4 w-4 text-destructive" />;
}

/**
 * Source badge — visually distinguishes SAMHSA-imported facilities from
 * provider-submitted ones in the admin list. SAMHSA imports are bulk-uploaded
 * unclaimed listings; provider-submitted come through the signup flow with an
 * owning user_id from day one; manual entries are admin-created. Knowing
 * which is which prevents admins from accidentally treating a SAMHSA stub
 * (no verified contact email, no provider relationship) the same as a
 * paying provider's first-party listing.
 */
export function getSourceBadge(provider: Facility) {
  const src = provider.data_source;
  if (src === "samhsa_import") {
    return (
      <Badge variant="outline" className="gap-1 text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30">
        <Database className="h-3 w-3" />
        SAMHSA
      </Badge>
    );
  }
  if (src === "provider") {
    return (
      <Badge variant="outline" className="gap-1 text-violet-600 border-violet-200 bg-violet-50 dark:bg-violet-950/30">
        <UserPlus className="h-3 w-3" />
        Provider
      </Badge>
    );
  }
  if (src === "manual") {
    return (
      <Badge variant="outline" className="gap-1 text-slate-600 border-slate-200 bg-slate-50 dark:bg-slate-900/40">
        <Shield className="h-3 w-3" />
        Manual
      </Badge>
    );
  }
  return null;
}

/**
 * Claim status badge — green "Claimed" if user_id is set, amber "Unclaimed"
 * otherwise. claimed_at carries the takeover date if available.
 */
export function getClaimBadge(provider: Facility) {
  if (provider.user_id) {
    return (
      <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30">
        <Lock className="h-3 w-3" />
        Claimed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30">
      <Unlock className="h-3 w-3" />
      Unclaimed
    </Badge>
  );
}

export function getStatusBadge(provider: Facility) {
  if (provider.suspended) {
    return <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" />Suspended</Badge>;
  }
  if (provider.status === "approved") {
    return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1"><CheckCircle className="h-3 w-3" />Approved</Badge>;
  }
  if (provider.status === "pending") {
    return <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-600 border-amber-200"><Clock className="h-3 w-3" />Pending</Badge>;
  }
  return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
}

export function ProviderListItem({
  provider,
  isPro,
  leadCount,
  pendingClaimCount = 0,
  canModerate = true,
  onOpenDetail,
  onStatusChange,
  onToggleVerified,
  onToggleFeatured,
  onSuspend,
  onReactivate,
  onDelete,
}: ProviderListItemProps) {
  const isPlacement = provider.concierge_network_opted_in;
  const sourceBadge = getSourceBadge(provider);
  const claimBadge = getClaimBadge(provider);

  return (
    <div
      className="flex items-center justify-between p-4 hover:bg-muted/30 focus-within:bg-muted/20 transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1 rounded-md"
      onClick={() => onOpenDetail(provider)}
      role="button"
      tabIndex={0}
      aria-label={`Open details for ${provider.name}, ${provider.city}, ${provider.state}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail(provider);
        }
      }}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="relative">
          <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
            <AvatarImage src={provider.logo_url || undefined} />
            <AvatarFallback className="bg-primary/5 text-primary font-semibold">
              {provider.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1">
            {getStatusIcon(provider)}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {provider.name}
            </p>
            {provider.verified && (
              <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />
            )}
            {provider.featured && (
              <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
            )}
            {isPro && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs h-5 px-1.5">
                <Crown className="h-3 w-3 mr-0.5" />
                Pro
              </Badge>
            )}
            {isPlacement && (
              <Badge variant="outline" className="text-chart-3 border-chart-3/30 text-xs h-5 px-1.5">
                <Handshake className="h-3 w-3 mr-0.5" />
                Placement
              </Badge>
            )}
            {sourceBadge}
            {claimBadge}
            {pendingClaimCount > 0 && (
              <Badge variant="outline" className="gap-1 text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/30">
                <Bell className="h-3 w-3" />
                {pendingClaimCount} pending claim{pendingClaimCount === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {provider.city}, {provider.state}
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <Users className="h-3 w-3" />
              {leadCount} leads
            </span>
            <span className="hidden md:flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(provider.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {getStatusBadge(provider)}

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => onOpenDetail(provider)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {provider.slug && (
              <DropdownMenuItem onClick={() => window.open(`/center/${provider.slug}`, "_blank")}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Public Profile
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            
            {canModerate && provider.status === "pending" && (
              <DropdownMenuItem onClick={() => onStatusChange(provider.id, "approved")} className="text-emerald-600">
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Provider
              </DropdownMenuItem>
            )}
            {canModerate && provider.status === "approved" && !provider.suspended && (
              <DropdownMenuItem onClick={() => onStatusChange(provider.id, "pending")} className="text-amber-600">
                <Clock className="h-4 w-4 mr-2" />
                Set to Pending
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onToggleVerified(provider.id, provider.verified)}>
              <Shield className="h-4 w-4 mr-2" />
              {provider.verified ? "Remove Verification" : "Mark as Verified"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleFeatured(provider.id, provider.featured)}>
              <Star className="h-4 w-4 mr-2" />
              {provider.featured ? "Remove Featured" : "Mark as Featured"}
            </DropdownMenuItem>
            
            {canModerate && (
              <>
                <DropdownMenuSeparator />
                {provider.suspended ? (
                  <DropdownMenuItem onClick={() => onReactivate(provider)} className="text-emerald-600">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reactivate Provider
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onSuspend(provider)} className="text-destructive">
                    <Ban className="h-4 w-4 mr-2" />
                    Suspend Provider
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(provider)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Provider
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function ProviderListEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
      <p className="text-muted-foreground font-medium">No providers found</p>
      <p className="text-sm text-muted-foreground/70">Try adjusting your search or filters</p>
    </div>
  );
}
