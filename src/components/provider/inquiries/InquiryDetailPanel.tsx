import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import {
  MapPin, Phone, Mail, MessageSquare, User, Building2,
  PhoneCall, CheckCircle, XCircle, Copy, ExternalLink, Calendar, Loader2, FileText
} from "lucide-react";
import { ResponseTemplatesDrawer } from "@/components/provider/inquiries/ResponseTemplatesDrawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InquiryTypeBadge, type InquiryType } from "@/components/provider/InquiryTypeBadge";
import { UnlockLeadButton } from "@/components/provider/UnlockLeadButton";
import { formatSourceLabel } from "@/lib/sourceLabels";

type ResponseStatus = 'pending' | 'contacted' | 'responded' | 'closed';

interface InquiryDetailPanelProps {
  inquiry: {
    id: string;
    name: string;
    email: string;
    phone: string;
    facility_id: string;
    facility_name?: string;
    facility_city?: string;
    facility_state?: string;
    location_city_state: string | null;
    location_zip: string | null;
    level_of_care: string | null;
    urgency: string | null;
    inquiry_type: InquiryType | null;
    provider_response_status: string | null;
    provider_responded_at: string | null;
    created_at: string;
    message: string | null;
    source: string | null;
    who_seeking_help: string | null;
    insurance_type: string | null;
    insurance_provider: string | null;
    primary_substance: string[] | null;
    age_range: string | null;
    gender: string | null;
    preferred_contact: string | null;
    relationship_to_patient: string | null;
    budget_preference: string | null;
    dual_diagnosis: string | null;
    previous_treatment: string | null;
    previous_treatment_details: string | null;
    readiness_level: string | null;
    best_time_to_call: string | null;
    co_occurring_conditions: string[] | null;
    special_needs: string[] | null;
  };
  isUnlocked: boolean;
  onUnlockSuccess: () => void;
}

export function InquiryDetailPanel({ inquiry, isUnlocked, onUnlockSuccess }: InquiryDetailPanelProps) {
  const queryClient = useQueryClient();
  
  const updateStatus = useMutation({
    mutationFn: async (status: ResponseStatus) => {
      const { error } = await supabase
        .from("leads")
        .update({
          provider_response_status: status === 'pending' ? null : status,
          provider_responded_at: status !== 'pending' ? new Date().toISOString() : null,
        })
        .eq("id", inquiry.id);
      if (error) throw error;
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["provider-inquiries"] });
      toast.success(`Status updated to ${status}`);
    },
    onError: (err) => {
      console.error("[InquiryDetail] Status update failed:", err);
      toast.error("Failed to update status. Please try again.");
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const currentStatus = (inquiry.provider_response_status || 'pending') as ResponseStatus;
  // Data from leads_provider_view is already masked/unmasked at the DB level
  const displayName = inquiry.name;
  const displayEmail = inquiry.email;
  const displayPhone = inquiry.phone;

  const statusButtons = [
    { status: 'contacted' as ResponseStatus, label: 'Contacted', icon: PhoneCall, activeClass: 'bg-blue-600 text-white hover:bg-blue-700' },
    { status: 'responded' as ResponseStatus, label: 'Responded', icon: CheckCircle, activeClass: 'bg-emerald-600 text-white hover:bg-emerald-700' },
    { status: 'closed' as ResponseStatus, label: 'Closed', icon: XCircle, activeClass: 'bg-slate-600 text-white hover:bg-slate-700' },
  ];

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <h2 className="text-lg font-semibold text-foreground truncate">{displayName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <InquiryTypeBadge type={inquiry.inquiry_type} size="sm" />
                {inquiry.location_city_state && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {inquiry.location_city_state}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isUnlocked && (
            <UnlockLeadButton
              leadId={inquiry.id}
              facilityId={inquiry.facility_id}
              inquiryType={inquiry.inquiry_type}
              cityState={inquiry.location_city_state}
              hidePrice
              onUnlockSuccess={onUnlockSuccess}
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5 space-y-6">
        {/* Contact Actions (only if unlocked) */}
        {isUnlocked && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Contact Information
            </h3>
            <div className="grid gap-3">
              {/* Phone */}
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{displayPhone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => copyToClipboard(displayPhone, "Phone")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" className="gap-1.5" asChild>
                    <a href={`tel:${displayPhone}`}>
                      <PhoneCall className="h-4 w-4" />
                      Call
                    </a>
                  </Button>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{displayEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => copyToClipboard(displayEmail, "Email")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" asChild>
                    <a href={`mailto:${displayEmail}`}>
                      <Mail className="h-4 w-4" />
                      Email
                    </a>
                  </Button>
                </div>
              </div>
            </div>
            {/* Response Templates */}
            <ResponseTemplatesDrawer
              leadName={displayName}
              facilityName={inquiry.facility_name}
              trigger={
                <Button variant="outline" size="sm" className="w-full gap-1.5 mt-2">
                  <FileText className="h-3.5 w-3.5" />
                  Use Response Template
                </Button>
              }
            />
          </div>
        )}

        {/* Locked Contact Preview */}
        {!isUnlocked && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Contact Information
            </h3>
            <div className="bg-muted/30 border border-dashed rounded-lg p-4 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{displayPhone}</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{displayEmail}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Unlock this inquiry to view full contact details
              </p>
            </div>
          </div>
        )}

        {/* Status Management (only if unlocked) */}
        {isUnlocked && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Response Status
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {statusButtons.map(({ status, label, icon: Icon, activeClass }) => (
                <Button
                  key={status}
                  variant={currentStatus === status ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "gap-1.5 transition-all",
                    currentStatus === status && activeClass
                  )}
                  onClick={() => updateStatus.mutate(status)}
                  disabled={updateStatus.isPending}
                >
                  {updateStatus.isPending && currentStatus !== status ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                  {label}
                </Button>
              ))}
            </div>
            {inquiry.provider_responded_at && (
              <p className="text-xs text-muted-foreground">
                Last updated {formatDistanceToNow(new Date(inquiry.provider_responded_at), { addSuffix: true })}
              </p>
            )}
          </div>
        )}

        <Separator />

        {/* Inquiry Details */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Inquiry Details
          </h3>
          <div className="grid gap-3">
            {inquiry.level_of_care && (
              <DetailRow icon={MessageSquare} label="Level of Care" value={inquiry.level_of_care} />
            )}
            {inquiry.who_seeking_help && (
              <DetailRow icon={User} label="Seeking Help For" value={inquiry.who_seeking_help} />
            )}
            {inquiry.source && (
              <DetailRow icon={ExternalLink} label="Source" value={formatSourceLabel(inquiry.source)} />
            )}
            <DetailRow 
              icon={Calendar} 
              label="Submitted" 
              value={format(new Date(inquiry.created_at), "MMM d, yyyy 'at' h:mm a")} 
            />
          </div>
        </div>

        {/* Message - only visible when unlocked */}
        {isUnlocked && inquiry.message && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Message
              </h3>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {inquiry.message}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Facility Info */}
        {inquiry.facility_name && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Inquired To
              </h3>
              <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{inquiry.facility_name}</p>
                  {inquiry.facility_city && inquiry.facility_state && (
                    <p className="text-sm text-muted-foreground">
                      {inquiry.facility_city}, {inquiry.facility_state}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
