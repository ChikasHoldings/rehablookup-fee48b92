import {
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Database,
  UserPlus,
  Unlock,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Facility } from "./ProviderListItem";

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
  if (provider.status === "pending" || provider.status === "pending_review") {
    // SLA-aware badge — show the wait time on pending facilities so
    // admin scanning the list can spot ones that have been sitting
    // too long. <24h: green; <7d: amber; ≥7d: red.
    const waitHours = provider.created_at
      ? Math.floor((Date.now() - new Date(provider.created_at).getTime()) / 3_600_000)
      : 0;
    let waitLabel = "";
    let waitClass = "";
    if (waitHours >= 24 * 7) {
      waitLabel = `${Math.floor(waitHours / 24)}d`;
      waitClass = "text-red-600 font-semibold";
    } else if (waitHours >= 24) {
      waitLabel = `${Math.floor(waitHours / 24)}d`;
      waitClass = "text-amber-600 font-medium";
    } else if (waitHours >= 1) {
      waitLabel = `${waitHours}h`;
      waitClass = "text-amber-700/70";
    }
    return (
      <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-600 border-amber-200">
        <Clock className="h-3 w-3" />Pending
        {waitLabel && (
          <span className={waitClass} title={`Submitted ${waitHours}h ago`}>· {waitLabel}</span>
        )}
      </Badge>
    );
  }
  return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
}

/**
 * Public-visibility badge — derived state showing whether the facility is
 * actually live on the public directory right now. The public_facilities
 * view hides any facility that is (1) not approved, (2) suspended, or
 * (3) has a pending/under_review facility_claim_request. The two booleans
 * we can see client-side are status and suspended; we pass in the pending-
 * claim count from AdminProviders so the badge reflects all three.
 */
export function getVisibilityBadge(provider: Facility, pendingClaimCount: number) {
  if (provider.suspended) {
    return (
      <Badge variant="outline" className="gap-1 text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/30">
        <EyeOff className="h-3 w-3" />
        Hidden — suspended
      </Badge>
    );
  }
  if (provider.status !== "approved") {
    return (
      <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30">
        <EyeOff className="h-3 w-3" />
        Hidden — awaiting approval
      </Badge>
    );
  }
  if (pendingClaimCount > 0) {
    return (
      <Badge variant="outline" className="gap-1 text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/30">
        <EyeOff className="h-3 w-3" />
        Hidden — claim in review
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30">
      <Eye className="h-3 w-3" />
      Public
    </Badge>
  );
}
