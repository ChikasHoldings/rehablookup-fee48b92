import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, Loader2, Mail, Trash2, AlertCircle, Lock, Sparkles, ArrowRight, Crown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useProStatus } from "@/hooks/useProStatus";
import { useAuthSync } from "@/hooks/useAuthSync";
import { useFacilityTeam, type TeamMember, type TeamRole } from "@/hooks/useFacilityTeam";

const ROLE_BLURB: Record<Exclude<TeamRole, "owner">, string> = {
  manager: "Edit the listing, respond to inquiries & reviews, manage marketing.",
  viewer: "Read-only access across the panel.",
};

function isLikelyEmail(s: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim());
}

/**
 * Provider team / RBAC management. Owner-only, Pro-gated. Free providers
 * see a locked preview with an upgrade CTA. Roles + access are enforced
 * server-side (facility_team_members RLS + facility_role helpers).
 */
export function TeamManagementTab() {
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const { data: proStatus } = useProStatus(facilityId);
  const isPro = proStatus?.isPro ?? false;
  const { user } = useAuthSync();

  const { members, isLoading, isError, refetch, invite, changeRole, remove } = useFacilityTeam(facilityId);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<TeamRole, "owner">>("manager");
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null);

  // Only the facility owner can manage the team. Managers/viewers who reach
  // this tab get a read-only roster. RLS is the real backstop (the
  // owner-only write policy rejects everyone else), this just keeps us from
  // showing controls that would only fail.
  const ownerRow = members.find((m) => m.isOwner);
  const isOwnerViewer = !!ownerRow && !!user?.id && ownerRow.userId === user.id;

  if (!facilityId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Select a facility from the header to manage its team.
        </CardContent>
      </Card>
    );
  }

  if (!isPro) {
    return (
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              <Lock className="h-2.5 w-2.5" aria-hidden /> Pro feature
            </span>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Invite your team</h3>
          <p className="mt-1 max-w-md text-sm text-slate-600">
            Add managers and viewers to this facility so your staff can respond to
            inquiries, keep the listing fresh, and watch performance — each with the
            right level of access. Available on Pro.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
            {[
              "Managers edit the listing, inquiries, reviews & marketing",
              "Viewers get read-only access",
              "Unlimited seats — owner keeps full control of billing",
            ].map((b) => (
              <li key={b} className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <Button asChild className="mt-4 gap-1.5 bg-[#1B365D] hover:bg-[#142a4a]">
            <Link to="/provider/billing?upgrade=pro">
              Upgrade to Pro <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Invite — owner only */}
      {isOwnerViewer && (
      <Card>
        <CardHeader className="border-b py-3.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Add a team member
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="team-email">Email</Label>
              <Input
                id="team-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@facility.com"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5 sm:w-40">
              <Label htmlFor="team-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Exclude<TeamRole, "owner">)}>
                <SelectTrigger id="team-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="gap-1.5 bg-[#1B365D] hover:bg-[#142a4a]"
              disabled={!isLikelyEmail(email) || invite.isPending}
              onClick={() => invite.mutate({ email, role }, { onSuccess: () => setEmail("") })}
            >
              {invite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Invite
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-500">{ROLE_BLURB[role]}</p>
        </CardContent>
      </Card>
      )}

      {/* Roster */}
      <Card>
        <CardHeader className="border-b py-3.5">
          <CardTitle className="text-base">Team</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <AlertCircle className="h-6 w-6 text-destructive" aria-hidden />
              <p className="text-sm text-slate-600">Couldn't load your team.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {members.map((m) => (
                <li key={m.memberId ?? `owner-${m.userId}`} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {(m.displayName || m.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {m.displayName || m.email || "Pending invite"}
                    </p>
                    <p className="truncate text-xs text-slate-500">{m.email}</p>
                  </div>
                  {m.status === "pending" && (
                    <Badge variant="outline" className="text-[11px] text-amber-700 border-amber-300">Pending</Badge>
                  )}
                  {m.isOwner ? (
                    <Badge variant="outline" className="gap-1 text-[11px]">
                      <Crown className="h-3 w-3 text-amber-500" aria-hidden /> Owner
                    </Badge>
                  ) : isOwnerViewer ? (
                    <>
                      <Select
                        value={m.role}
                        onValueChange={(v) =>
                          m.memberId && changeRole.mutate({ memberId: m.memberId, role: v as Exclude<TeamRole, "owner"> })
                        }
                      >
                        <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setConfirmRemove(m)}
                        aria-label={`Remove ${m.email}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Badge variant="secondary" className="text-[11px] capitalize">{m.role}</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-slate-500">
        {isOwnerViewer
          ? "The owner keeps full control of billing, the team, and account deletion. Roles are enforced server-side — managers can't touch billing or the team, and viewers are read-only."
          : "Only the facility owner can invite teammates or change roles. Your access level is shown above."}
      </p>

      <AlertDialog open={!!confirmRemove} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRemove?.email} will immediately lose access to this facility. You can
              re-invite them any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (confirmRemove?.memberId) remove.mutate(confirmRemove.memberId);
                setConfirmRemove(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
