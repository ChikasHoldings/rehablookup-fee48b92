import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  MapPin,
  Clock,
  Phone,
  Mail,
  User,
  FileText,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Shield,
  Heart,
  Calendar,
  Briefcase,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import facilityPlaceholder from "@/assets/facility-placeholder.jpg";

interface InquiryDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  userEmail: string;
}

interface LeadDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  status: string;
  urgency: string | null;
  preferred_contact: string;
  level_of_care: string | null;
  insurance_type: string | null;
  primary_substance: string[] | null;
  message: string | null;
  location_city_state: string | null;
  location_zip: string | null;
  who_seeking_help: string | null;
  age_range: string | null;
  gender: string | null;
  provider_responded_at: string | null;
  provider_response_status: string | null;
  facility_id: string | null;
  source: string | null;
}

interface FacilityInfo {
  id: string;
  name: string;
  slug: string | null;
  city: string;
  state: string;
  phone: string;
  logo_url: string | null;
  facility_type: string;
  verified: boolean | null;
}

interface ProviderResponse {
  unlocked_at: string;
  facility_name: string;
  facility_slug: string | null;
  notes: string[];
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusInfo(status: string) {
  switch (status) {
    case "new":
      return { label: "Pending Review", color: "bg-blue-100 text-blue-700", icon: Clock };
    case "contacted":
      return { label: "Facility Responded", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 };
    case "in_progress":
      return { label: "In Progress", color: "bg-amber-100 text-amber-700", icon: MessageSquare };
    case "scheduled":
      return { label: "Scheduled", color: "bg-purple-100 text-purple-700", icon: Calendar };
    case "admitted":
      return { label: "Admitted", color: "bg-green-100 text-green-700", icon: CheckCircle2 };
    case "closed":
      return { label: "Closed", color: "bg-gray-100 text-gray-700", icon: AlertCircle };
    case "expired":
      return { label: "Expired", color: "bg-gray-100 text-gray-500", icon: AlertCircle };
    default:
      return { label: "Submitted", color: "bg-slate-100 text-slate-600", icon: FileText };
  }
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function InquiryDetailModal({ open, onOpenChange, leadId, userEmail }: InquiryDetailModalProps) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [facility, setFacility] = useState<FacilityInfo | null>(null);
  const [providerResponse, setProviderResponse] = useState<ProviderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (!open || !leadId) return;
    setIsLoading(true);
    setError(null);
    setLead(null);
    setFacility(null);
    setProviderResponse(null);
    setLogoError(false);

    const fetchData = async () => {
      try {
        // Fetch lead details — RLS ensures only the seeker's own leads via email match
        const { data: leadData, error: leadError } = await supabase
          .from("leads")
          .select(
            "id, name, email, phone, created_at, status, urgency, preferred_contact, level_of_care, insurance_type, primary_substance, message, location_city_state, location_zip, who_seeking_help, age_range, gender, provider_responded_at, provider_response_status, facility_id, source"
          )
          .eq("id", leadId)
          .eq("email", userEmail.trim().toLowerCase())
          .maybeSingle();

        if (leadError) throw leadError;
        if (!leadData) {
          setError("Inquiry not found.");
          setIsLoading(false);
          return;
        }
        setLead(leadData);

        // Fetch facility info
        if (leadData.facility_id) {
          const { data: facilityData } = await supabase
            .from("facilities")
            .select("id, name, slug, city, state, phone, logo_url, facility_type, verified")
            .eq("id", leadData.facility_id)
            .maybeSingle();

          if (facilityData) setFacility(facilityData);

          // Check if any provider has unlocked this lead and left notes
          const { data: unlockData } = await supabase
            .from("lead_unlocks")
            .select("unlocked_at, facility_id")
            .eq("lead_id", leadId)
            .order("unlocked_at", { ascending: false })
            .limit(1);

          if (unlockData && unlockData.length > 0) {
            // Get notes left by provider
            const { data: notesData } = await supabase
              .from("lead_notes")
              .select("note, created_at")
              .eq("lead_id", leadId)
              .order("created_at", { ascending: true })
              .limit(50);

            setProviderResponse({
              unlocked_at: unlockData[0].unlocked_at,
              facility_name: facilityData?.name || "Treatment Center",
              facility_slug: facilityData?.slug || null,
              notes: (notesData || []).map((n) => n.note),
            });
          }
        }
      } catch (err: any) {
        console.error("Error fetching inquiry details:", err);
        setError("Could not load inquiry details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open, leadId, userEmail]);

  const statusInfo = lead ? getStatusInfo(lead.status) : null;
  const StatusIcon = statusInfo?.icon || FileText;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="text-lg font-display">Inquiry Details</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-60px)]">
          <div className="px-5 pb-5 space-y-5">
            {isLoading && (
              <div className="space-y-4 py-4">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            )}

            {error && (
              <div className="py-8 text-center">
                <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {!isLoading && !error && lead && (
              <>
                {/* Status & Date Header */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <Badge className={`${statusInfo?.color} border-0 gap-1.5 text-xs px-2.5 py-1`}>
                    <StatusIcon className="h-3 w-3" />
                    {statusInfo?.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(lead.created_at)}
                  </span>
                </div>

                {/* Facility Card */}
                {facility && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
                        {facility.logo_url && !logoError ? (
                          <img
                            src={facility.logo_url}
                            alt={facility.name}
                            className="h-full w-full object-contain p-1 bg-white"
                            onError={() => setLogoError(true)}
                          />
                        ) : (
                          <img
                            src={facilityPlaceholder}
                            alt={facility.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground line-clamp-1">{facility.name}</h3>
                          {facility.verified && (
                            <Shield className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>{facility.city}, {facility.state}</span>
                        </div>
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">
                          {facility.facility_type?.replace(/_/g, " ")}
                        </p>
                      </div>
                      {facility.slug && (
                        <Button variant="outline" size="sm" asChild className="shrink-0">
                          <Link to={`/center/${facility.slug}`}>
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                            View
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Provider Response Section */}
                {providerResponse && (
                  <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <h4 className="font-semibold text-emerald-800 text-sm">Facility Response</h4>
                    </div>
                    <p className="text-xs text-emerald-700">
                      {providerResponse.facility_name} reviewed your inquiry on{" "}
                      {formatShortDate(providerResponse.unlocked_at)}
                    </p>
                    {lead.provider_response_status === "responded" && lead.provider_responded_at && (
                      <p className="text-xs text-emerald-700">
                        Responded on {formatShortDate(lead.provider_responded_at)}
                      </p>
                    )}
                    {providerResponse.notes.length > 0 && (
                      <div className="space-y-2 mt-2">
                        <p className="text-xs font-medium text-emerald-800">Provider Notes:</p>
                        {providerResponse.notes.map((note, i) => (
                          <div key={i} className="rounded-lg bg-white/80 border border-emerald-100 p-3">
                            <p className="text-sm text-foreground">{note}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {providerResponse.notes.length === 0 && (
                      <p className="text-xs text-emerald-600 italic">
                        The facility has reviewed your inquiry. They may reach out via your preferred contact method.
                      </p>
                    )}
                  </div>
                )}

                {/* No Response Yet */}
                {!providerResponse && lead.status === "new" && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <h4 className="font-medium text-blue-800 text-sm">Awaiting Response</h4>
                    </div>
                    <p className="text-xs text-blue-600">
                      Your inquiry has been sent to the facility. You'll be notified when they respond.
                    </p>
                  </div>
                )}

                <Separator />

                {/* Submission Details */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Your Submission
                  </h4>
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1">
                    <DetailRow icon={User} label="Name" value={lead.name} />
                    <DetailRow icon={Mail} label="Email" value={lead.email} />
                    <DetailRow icon={Phone} label="Phone" value={lead.phone} />
                    <DetailRow icon={MapPin} label="Location" value={lead.location_city_state || lead.location_zip} />
                    <DetailRow
                      icon={Heart}
                      label="Seeking Help For"
                      value={lead.who_seeking_help === "self" ? "Myself" : lead.who_seeking_help === "loved-one" ? "A Loved One" : lead.who_seeking_help}
                    />
                    <DetailRow icon={User} label="Age Range" value={lead.age_range} />
                    <DetailRow icon={User} label="Gender" value={lead.gender} />
                    <DetailRow
                      icon={AlertCircle}
                      label="Urgency"
                      value={
                        lead.urgency === "immediate"
                          ? "Immediate"
                          : lead.urgency === "within-week"
                          ? "Within a week"
                          : lead.urgency === "flexible"
                          ? "Flexible"
                          : lead.urgency
                      }
                    />
                    <DetailRow icon={Phone} label="Preferred Contact" value={lead.preferred_contact} />
                    <DetailRow
                      icon={Building2}
                      label="Level of Care"
                      value={lead.level_of_care?.replace(/_/g, " ")}
                    />
                    <DetailRow icon={Shield} label="Insurance" value={lead.insurance_type} />
                    {lead.primary_substance && lead.primary_substance.length > 0 && (
                      <div className="flex items-start gap-3 py-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Primary Concerns</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {lead.primary_substance.map((s, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {lead.message && (
                      <div className="flex items-start gap-3 py-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Message</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{lead.message}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inquiry ID Footer */}
                <p className="text-xs text-muted-foreground text-center">
                  Inquiry ID: {lead.id.slice(0, 8)}
                </p>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
