import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Users,
  Heart,
  Calendar,
  Bed,
  Shield,
  Activity,
  Star,
} from "lucide-react";
import { format } from "date-fns";

interface ProviderRow {
  id: string;
  name: string;
  city: string;
  state: string;
  phone: string;
  email: string | null;
  website: string | null;
  facility_type: string;
  status: string;
  concierge_network_opted_in: boolean | null;
  concierge_availability_status: string | null;
  concierge_admissions_email: string | null;
  concierge_admissions_phone: string | null;
  logo_url: string | null;
  verified: boolean | null;
  bed_count: string | null;
}

interface ProviderDirectoryDetailModalProps {
  provider: ProviderRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProviderDirectoryDetailModal({
  provider,
  open,
  onOpenChange,
}: ProviderDirectoryDetailModalProps) {
  const [activeTab, setActiveTab] = useState("profile");

  // Fetch additional facility details
  const { data: facilityDetails } = useQuery({
    queryKey: ["provider-directory-detail", provider?.id],
    queryFn: async () => {
      if (!provider?.id) return null;
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, description, address, zip_code, gender_served, year_established, created_at, updated_at, concierge_notes, concierge_accepted_care_types, concierge_accepted_insurance, concierge_agreement_preference, concierge_terms_accepted_at")
        .eq("id", provider.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!provider?.id && open,
  });

  // Fetch insurance list
  const { data: insurance } = useQuery({
    queryKey: ["provider-directory-insurance", provider?.id],
    queryFn: async () => {
      if (!provider?.id) return [];
      const { data } = await supabase
        .from("facility_insurance")
        .select("insurance_name")
        .eq("facility_id", provider.id);
      return data?.map(i => i.insurance_name) || [];
    },
    enabled: !!provider?.id && open,
  });

  // Fetch active introductions
  const { data: introductions } = useQuery({
    queryKey: ["provider-directory-intros", provider?.id],
    queryFn: async () => {
      if (!provider?.id) return [];
      const { data } = await supabase
        .from("concierge_introductions")
        .select("id, inquiry_id, provider_response, sent_at, provider_responded_at, seeker_contacted")
        .eq("facility_id", provider.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!provider?.id && open,
  });

  // Fetch reviews summary
  const { data: reviewStats } = useQuery({
    queryKey: ["provider-directory-reviews", provider?.id],
    queryFn: async () => {
      if (!provider?.id) return { count: 0, avg: 0 };
      const { data } = await supabase
        .from("facility_reviews")
        .select("rating")
        .eq("facility_id", provider.id)
        .eq("status", "approved");
      if (!data?.length) return { count: 0, avg: 0 };
      const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      return { count: data.length, avg: Math.round(avg * 10) / 10 };
    },
    enabled: !!provider?.id && open,
  });

  if (!provider) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
              {provider.logo_url ? (
                <img src={provider.logo_url} alt={`${provider.name} logo`} className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-lg">{provider.name}</DialogTitle>
                {provider.verified && (
                  <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
                    <CheckCircle2 className="h-3 w-3 mr-0.5" />
                    Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {provider.concierge_network_opted_in ? (
                  <Badge className="text-[10px] bg-success/10 text-success border-success/20">
                    <Heart className="h-3 w-3 mr-1" />
                    Enrolled in Network
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    Not Enrolled
                  </Badge>
                )}
                {provider.concierge_availability_status && (
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {provider.concierge_availability_status}
                  </Badge>
                )}
                {reviewStats && reviewStats.count > 0 && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    {reviewStats.avg} ({reviewStats.count})
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {provider.city}, {provider.state}
                <span className="mx-1">·</span>
                <span className="capitalize">{provider.facility_type.replace(/_/g, " ")}</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-3 grid grid-cols-3 flex-shrink-0">
            <TabsTrigger value="profile" className="text-xs gap-1">
              <Building2 className="h-3.5 w-3.5" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="network" className="text-xs gap-1">
              <Heart className="h-3.5 w-3.5" />
              Network
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs gap-1">
              <Activity className="h-3.5 w-3.5" />
              Activity
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-6 pb-6">
            {/* Profile Tab */}
            <TabsContent value="profile" className="m-0 mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoCard icon={Phone} label="Phone" value={provider.phone} href={`tel:${provider.phone}`} />
                <InfoCard icon={Mail} label="Email" value={provider.email || "Not set"} href={provider.email ? `mailto:${provider.email}` : undefined} />
                <InfoCard icon={Bed} label="Bed Count" value={provider.bed_count || "Not specified"} />
                <InfoCard icon={Users} label="Gender Served" value={facilityDetails?.gender_served || "All"} />
                <InfoCard icon={Calendar} label="Established" value={facilityDetails?.year_established ? String(facilityDetails.year_established) : "Unknown"} />
                <InfoCard icon={Shield} label="Status" value={provider.status} />
              </div>

              {facilityDetails?.description && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Description</h4>
                  <p className="text-xs text-muted-foreground">{facilityDetails.description}</p>
                </div>
              )}

              {insurance && insurance.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Accepted Insurance</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {insurance.map((ins) => (
                      <Badge key={ins} variant="outline" className="text-[10px]">{ins}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {provider.website && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => window.open(provider.website!, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Visit Website
                </Button>
              )}
            </TabsContent>

            {/* Network Tab */}
            <TabsContent value="network" className="m-0 mt-4 space-y-4">
              {/* Concierge Contact */}
              <div>
                <h4 className="text-sm font-medium mb-2">Concierge Contact Info</h4>
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard
                    icon={Mail}
                    label="Admissions Email"
                    value={provider.concierge_admissions_email || "Not set"}
                    href={provider.concierge_admissions_email ? `mailto:${provider.concierge_admissions_email}` : undefined}
                  />
                  <InfoCard
                    icon={Phone}
                    label="Admissions Phone"
                    value={provider.concierge_admissions_phone || "Not set"}
                    href={provider.concierge_admissions_phone ? `tel:${provider.concierge_admissions_phone}` : undefined}
                  />
                </div>
              </div>

              {/* Agreement */}
              {facilityDetails?.concierge_agreement_preference && (
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Agreement Preference</p>
                  <p className="text-sm font-medium capitalize">{facilityDetails.concierge_agreement_preference}</p>
                  {facilityDetails.concierge_terms_accepted_at && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Terms accepted: {format(new Date(facilityDetails.concierge_terms_accepted_at), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              )}

              {/* Accepted Care Types */}
              {facilityDetails?.concierge_accepted_care_types && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Accepted Care Types</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(facilityDetails.concierge_accepted_care_types) ? facilityDetails.concierge_accepted_care_types : []).map((type: string) => (
                      <Badge key={type} variant="outline" className="text-[10px]">{type}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {facilityDetails?.concierge_notes && (
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Concierge Notes</p>
                  <p className="text-sm">{facilityDetails.concierge_notes}</p>
                </div>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="m-0 mt-4 space-y-4">
              <h4 className="text-sm font-medium">Recent Introductions</h4>
              {!introductions?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No introductions yet</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {introductions.map((intro) => (
                    <div key={intro.id} className="p-3 rounded-lg border text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium font-mono text-[11px]">
                          Case {intro.inquiry_id.slice(0, 8)}…
                        </span>
                        <Badge variant="outline" className={cn(
                          "text-[10px]",
                          intro.provider_response === "accepted" ? "bg-success/10 text-success" :
                          intro.provider_response === "declined" ? "bg-destructive/10 text-destructive" :
                          "bg-warning/10 text-warning"
                        )}>
                          {intro.provider_response || "Pending"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-muted-foreground">
                        {intro.sent_at && (
                          <span>Sent: {format(new Date(intro.sent_at), "MMM d")}</span>
                        )}
                        {intro.provider_responded_at && (
                          <span>Responded: {format(new Date(intro.provider_responded_at), "MMM d")}</span>
                        )}
                        {intro.seeker_contacted && (
                          <Badge variant="outline" className="text-[10px] bg-success/10 text-success">Contacted</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InfoCard({ icon: Icon, label, value, href }: { icon: React.ElementType; label: string; value: string; href?: string }) {
  const content = (
    <div className="p-3 rounded-lg border hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn("text-sm font-medium truncate", href && "text-primary")}>{value}</p>
    </div>
  );

  if (href && value !== "Not set") {
    return <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
  }
  return content;
}
