import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Users,
  Star,
  Headphones,
  BarChart3,
  ChevronRight,
  Info,
} from "lucide-react";

/**
 * Advisor dashboard — directory model.
 *
 * This role was originally a placement-advisor workspace: it claimed
 * Concierge cases, assigned itself as the advisor, wrote
 * `concierge_case_events` rows, and drove a match → introduce → tour →
 * admit pipeline. RehabLookup is a directory, not a placement or advisor
 * service, so that entire workflow was removed from the active product in
 * the Stage-3 cutover — along with every write this dashboard used to make.
 *
 * The `advisor` role itself (its DB enum value, its `placements` permission,
 * and the concierge tables it read) is Stage-4 debt. Until then this surface
 * shows only directory facts and routes to the surfaces the signed-in admin
 * actually has permission to reach, so nothing here dead-ends on
 * <AccessDenied/>.
 *
 * See docs/directory-cutover-stage-03-provider-admin.md.
 */
export function AdvisorDashboard() {
  const { hasPermission, adminProfile } = useAdminAuth();

  // Directory-health facts. `public_facilities` is the same published view the
  // consumer directory reads, so this count is the live directory size rather
  // than a raw table total that includes unapproved rows.
  const { data: directoryStats, isLoading } = useQuery({
    queryKey: ["advisor-directory-stats"],
    queryFn: async () => {
      const [published, pendingReviews] = await Promise.all([
        supabase.from("public_facilities").select("id", { count: "exact", head: true }),
        supabase
          .from("facility_reviews")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);
      return {
        published: published.count ?? 0,
        pendingReviews: pendingReviews.count ?? 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const firstName = adminProfile?.first_name;

  // Only surface destinations this admin can actually open. Visibility must
  // match the route gate in useAdminAuth.canAccessRoute.
  const links = [
    {
      to: "/admin/reviews",
      icon: Star,
      label: "Reviews",
      description: "Moderate facility reviews",
      permission: "reviews",
    },
    {
      to: "/admin/support",
      icon: Headphones,
      label: "Support Inbox",
      description: "Respond to provider and seeker tickets",
      permission: "support",
    },
    {
      to: "/admin/leads",
      icon: Users,
      label: "Inquiries",
      description: "Inquiries sent to a selected facility",
      permission: "leads",
    },
    {
      to: "/admin/analytics",
      icon: BarChart3,
      label: "Analytics",
      description: "Directory traffic and performance",
      permission: "analytics",
    },
  ].filter((link) => hasPermission(link.permission));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:h-10 sm:w-10">
          <Building2 className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-2xl">
            {firstName ? `Welcome back, ${firstName}` : "Dashboard"}
          </h1>
          <p className="hidden text-xs text-muted-foreground sm:block sm:text-sm">
            Directory operations overview
          </p>
        </div>
      </div>

      {/* Directory facts */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
            <CardTitle className="truncate pr-1 text-[10px] font-medium text-muted-foreground sm:text-sm">
              Published Facilities
            </CardTitle>
            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground sm:h-4 sm:w-4" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            {isLoading ? (
              <Skeleton className="h-6 w-16 sm:h-8 sm:w-20" />
            ) : (
              <div className="text-lg font-bold tabular-nums sm:text-2xl">
                {directoryStats?.published.toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
            <CardTitle className="truncate pr-1 text-[10px] font-medium text-muted-foreground sm:text-sm">
              Reviews Awaiting Moderation
            </CardTitle>
            <Star className="h-3.5 w-3.5 shrink-0 text-muted-foreground sm:h-4 sm:w-4" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            {isLoading ? (
              <Skeleton className="h-6 w-16 sm:h-8 sm:w-20" />
            ) : (
              <div className="text-lg font-bold tabular-nums sm:text-2xl">
                {directoryStats?.pendingReviews.toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Where to go next */}
      {links.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Your workspace</CardTitle>
            <CardDescription>Directory surfaces available to your account</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Button
                  key={link.to}
                  variant="ghost"
                  className="h-auto justify-start px-3 py-2.5"
                  asChild
                >
                  <Link to={link.to}>
                    <Icon className="mr-3 h-5 w-5 shrink-0 text-primary" />
                    <div className="flex min-w-0 flex-col items-start">
                      <span className="text-sm font-medium">{link.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {link.description}
                      </span>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </Button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Factual note about the retired workflow, so an advisor who used to
          live in the placement workspace understands why it is gone rather
          than assuming the page is broken. */}
      <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 text-sm">
          <p className="font-medium text-foreground">
            The placement workspace has been retired
          </p>
          <p className="mt-1 text-muted-foreground">
            RehabLookup is a directory. Seekers search, compare, and contact the
            facility they choose, and their inquiry goes to that one facility and
            stays there. Historical case records are preserved and reachable by an
            administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
