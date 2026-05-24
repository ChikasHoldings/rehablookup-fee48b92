import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Download,
  FileText,
  Image as ImageIcon,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Share2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { ProviderPageHeader } from "@/components/provider/ProviderPageHeader";
import { formatDistanceToNow } from "date-fns";
import { Helmet as _HelmetIgnore } from "react-helmet-async"; // silence unused-import lints in odd setups
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useProStatus } from "@/hooks/useProStatus";
import { useToast } from "@/hooks/use-toast";

/* react-helmet-async re-exports keep a single import — ignore the
   shim alias above; bundlers tree-shake the unused name. */
void _HelmetIgnore;

interface FacilityRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  verified: boolean | null;
  status: string;
  claimed_at: string | null;
}

interface LatestKitRow {
  name: string;
  updated_at: string;
}

interface GenerateResponse {
  ok: boolean;
  download_url: string;
  expires_in_seconds: number;
  object_path: string;
  generated_at: string;
  asset_count: number;
  /** Edge function "soft" failure surface (HTTP 200 with .error). */
  error?: string;
  reason?: "pro_required" | "verification_required";
}

const ASSET_LIST = [
  {
    icon: FileText,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-100",
    title: "Certificate of Verification",
    description:
      "One-page formal PDF you can print, frame, or share with referral partners. Confirms RehabLookup Verified status with a scope-narrowing disclaimer baked in.",
  },
  {
    icon: ShieldCheck,
    iconColor: "text-sky-600",
    iconBg: "bg-sky-100",
    title: "RehabLookup Verified badge (SVG)",
    description:
      "Drop-in SVG badge that scales from 24px to 512px without quality loss. Use on your website footer, blog author cards, intake confirmations.",
  },
  {
    icon: Mail,
    iconColor: "text-violet-600",
    iconBg: "bg-violet-100",
    title: "Email-signature snippet",
    description:
      "Inline HTML block for Gmail, Outlook, and Apple Mail signature settings. Includes the RehabLookup Verified badge, your facility name, and a link back to your profile.",
  },
  {
    icon: Share2,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-100",
    title: "Social-image set",
    description:
      "Open Graph (1200×630), Twitter/X (1200×675), Instagram square (1080×1080), and LinkedIn (1200×627). Personalised SVGs ready for export.",
  },
];

export default function CredentialKitPage() {
  const queryClient = useQueryClient();
  const { selectedFacility } = useSelectedFacility();
  const { data: proStatus, isLoading: proLoading } = useProStatus(
    selectedFacility?.id,
  );
  const { toast } = useToast();

  // Facility-level fields not in the SelectedFacilityContext payload
  // we need server-side anyway for verified status. Single small read.
  const { data: facility, isLoading: facilityLoading } = useQuery({
    queryKey: ["credential-kit-facility", selectedFacility?.id],
    enabled: !!selectedFacility?.id,
    queryFn: async (): Promise<FacilityRow | null> => {
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, slug, city, state, verified, status, claimed_at")
        .eq("id", selectedFacility!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as FacilityRow | null;
    },
    staleTime: 60 * 1000,
  });

  // Most-recent kit blob for this facility (if any) — surfaces a
  // "generated 3h ago" hint so providers know they don't need to
  // regenerate. RLS scopes the listing to the owning provider.
  const { data: latestKit, isLoading: latestLoading } = useQuery({
    queryKey: ["credential-kit-latest", selectedFacility?.id],
    enabled: !!selectedFacility?.id,
    queryFn: async (): Promise<LatestKitRow | null> => {
      const { data, error } = await supabase.storage
        .from("credential-kits")
        .list(selectedFacility!.id, {
          limit: 1,
          sortBy: { column: "updated_at", order: "desc" },
        });
      if (error) throw error;
      const top = data?.[0];
      if (!top) return null;
      return { name: top.name, updated_at: top.updated_at ?? top.created_at };
    },
    staleTime: 30 * 1000,
  });

  const generate = useMutation({
    mutationFn: async (): Promise<GenerateResponse> => {
      if (!selectedFacility?.id) throw new Error("No facility selected");
      const { data, error } = await supabase.functions.invoke<GenerateResponse>(
        "generate-credential-kit",
        { body: { facility_id: selectedFacility.id } },
      );
      if (error) throw new Error(error.message || "Failed to generate kit");
      if (data?.error) throw new Error(data.error);
      if (!data?.download_url) throw new Error("Generator returned no URL");
      return data;
    },
    onSuccess: (resp) => {
      // Auto-trigger the browser download. The signed URL already
      // has download=<filename> on it so the browser uses our slug-
      // based name and not the storage-path uuid.
      try {
        const a = document.createElement("a");
        a.href = resp.download_url;
        a.rel = "noopener";
        // Cross-origin signed URLs ignore the download attribute when
        // the response doesn't have a matching Content-Disposition,
        // but Supabase sets the header from the createSignedUrl
        // options so this works in practice.
        a.click();
      } catch {
        // Fall back to a manual link if the click was blocked (some
        // strict CSPs).
        window.open(resp.download_url, "_blank", "noopener");
      }
      queryClient.invalidateQueries({
        queryKey: ["credential-kit-latest", selectedFacility?.id],
      });
      toast({
        title: "Credential Kit ready",
        description: `Generated ${resp.asset_count} assets. Download started.`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't generate kit",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const isVerified = facility?.verified === true;
  const isApproved = facility?.status === "approved";
  const isPro = !!proStatus?.isPro;
  const loading = proLoading || facilityLoading;
  const gateOpen = isVerified && isApproved && isPro;

  const latestRelative = useMemo(() => {
    if (!latestKit?.updated_at) return null;
    try {
      return formatDistanceToNow(new Date(latestKit.updated_at), { addSuffix: true });
    } catch {
      return null;
    }
  }, [latestKit?.updated_at]);

  const verifiedSinceLabel = useMemo(() => {
    if (!facility?.claimed_at) return null;
    try {
      return new Date(facility.claimed_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return null;
    }
  }, [facility?.claimed_at]);

  return (
    <>
      <Helmet>
        <title>Credential Kit | RehabLookup Provider</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-full bg-slate-50">
        <ProviderPageHeader
          title="Credential Kit"
          description="Downloadable certificate, badge, email signature, and social images — personalised for your facility."
          icon={<Award className="h-4 w-4" />}
          backTo="/provider/marketing"
          backLabel="Marketing"
          actions={
            gateOpen ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600">Eligible</Badge>
            ) : null
          }
        />

        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 space-y-5">
          {loading ? (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-1/2" />
              </CardContent>
            </Card>
          ) : !selectedFacility ? (
            <PlaceholderState
              icon={AlertCircle}
              title="No facility selected"
              body="Pick a facility from the header dropdown to generate its Credential Kit."
            />
          ) : !isApproved ? (
            <Lockwall
              title="Facility pending approval"
              body="The Credential Kit becomes available once your facility listing is approved. We'll notify you when it's ready."
            />
          ) : !isVerified ? (
            <Lockwall
              title="Not yet RehabLookup Verified"
              body="An admin marks listings as RehabLookup Verified after reviewing the credentials documents on file. Upload any missing documents from your listing's Credentials tab — once an admin signs off, this page will unlock."
              cta={{ label: "Go to Credentials", to: "/provider/listings" }}
            />
          ) : !isPro ? (
            <Lockwall
              title="Pro required"
              body="The Credential Kit is a Pro-tier perk. Upgrade to Pro to download the Certificate of Verification, RehabLookup Verified badges, email signature, and social images."
              cta={{ label: "Upgrade to Pro", to: "/provider/billing?upgrade=pro", primary: true }}
            />
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">What's in the kit</CardTitle>
                  <CardDescription>
                    Eight files in one ZIP. Every asset is personalised with your
                    facility name, verified-since date, and profile URL.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ASSET_LIST.map((asset) => {
                    const Icon = asset.icon;
                    return (
                      <div
                        key={asset.title}
                        className="flex items-start gap-3 rounded-lg border bg-card p-3"
                      >
                        <div
                          className={cn(
                            "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center",
                            asset.iconBg,
                          )}
                        >
                          <Icon className={cn("h-4 w-4", asset.iconColor)} aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {asset.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {asset.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Download className="h-4 w-4 text-muted-foreground" aria-hidden />
                    Download
                  </CardTitle>
                  <CardDescription>
                    Each download generates a fresh ZIP with the current facility
                    data. Old downloads stay valid as long as the underlying data
                    is unchanged.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Live facility summary used for the personalisation */}
                  <div className="rounded-lg border bg-slate-50 px-4 py-3 text-sm">
                    <p className="font-medium text-foreground">{facility?.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {[facility?.city, facility?.state].filter(Boolean).join(", ")}
                    </p>
                    {verifiedSinceLabel && (
                      <p className="text-xs text-muted-foreground mt-1">
                        RehabLookup Verified since {verifiedSinceLabel}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Profile:{" "}
                      <a
                        href={`https://rehablookup.com/center/${facility?.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1B365D] underline-offset-2 hover:underline"
                      >
                        rehablookup.com/center/{facility?.slug}
                      </a>
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                      {latestLoading ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                          Checking previous downloads…
                        </span>
                      ) : latestRelative ? (
                        <span>
                          Last generated {latestRelative}. Re-generating creates a
                          fresh ZIP with the latest facility data.
                        </span>
                      ) : (
                        <span>Never generated for this facility yet.</span>
                      )}
                    </div>
                    <Button
                      onClick={() => generate.mutate()}
                      disabled={generate.isPending}
                      className="gap-2 bg-[#1B365D] hover:bg-[#142a4a]"
                    >
                      {generate.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : latestRelative ? (
                        <RefreshCw className="h-4 w-4" aria-hidden />
                      ) : (
                        <Download className="h-4 w-4" aria-hidden />
                      )}
                      {generate.isPending
                        ? "Generating…"
                        : latestRelative
                          ? "Regenerate kit"
                          : "Download Credential Kit"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Disclaimer card — explicit, repeated outside the cert so
                  providers see it before they download, not just inside
                  the README.txt. */}
              <Card className="border-amber-200/60 bg-amber-50/40">
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden />
                    <div className="text-sm text-amber-950 leading-relaxed">
                      <p className="font-semibold">What "RehabLookup Verified" means</p>
                      <p className="mt-1">
                        <strong>RehabLookup Verified</strong> confirms that
                        we've reviewed and confirmed your facility's contact
                        information, location, and basic operational details
                        as part of our directory listing review. The Credential
                        Kit is <strong>not</strong> a clinical accreditation,
                        treatment license, or endorsement of outcomes.
                      </p>
                      <p className="mt-2">
                        Please don't use these assets to imply accreditations
                        (JCAHO, CARF, state licensing) that RehabLookup did not
                        itself grant. Doing so would violate the RehabLookup
                        provider terms.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function PlaceholderState({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardContent className="py-12 text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
        </div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{body}</p>
      </CardContent>
    </Card>
  );
}

function Lockwall({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { label: string; to: string; primary?: boolean };
}) {
  return (
    <Card>
      <CardContent className="py-12 text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-amber-100 flex items-center justify-center">
          <Lock className="h-6 w-6 text-amber-600" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
            {body}
          </p>
        </div>
        {cta && (
          <Button
            asChild
            className={cn(
              "gap-2",
              cta.primary && "bg-amber-500 hover:bg-amber-600 text-white",
            )}
            variant={cta.primary ? "default" : "outline"}
          >
            <Link to={cta.to}>
              {cta.primary && <Sparkles className="h-4 w-4" aria-hidden />}
              {cta.label}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* Silence unused imports the linter occasionally trips on with React
   children in some bundler configs. Tree-shaken in production. */
void CheckCircle2;
void ImageIcon;
