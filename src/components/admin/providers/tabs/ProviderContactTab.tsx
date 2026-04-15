import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Send, Mail, Phone, MessageSquare, RefreshCw, History, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { Facility } from "../ProviderListItem";

interface ProviderContactTabProps {
  provider: Facility;
  providerProfile: any;
}

const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;

export function ProviderContactTab({ provider, providerProfile }: ProviderContactTabProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendInApp, setSendInApp] = useState(true);
  const queryClient = useQueryClient();

  const recipientEmail = providerProfile?.email || provider.email;
  const recipientName = providerProfile?.first_name
    ? `${providerProfile.first_name} ${providerProfile.last_name || ""}`.trim()
    : provider.name;

  // Fetch past admin contact audit logs for this provider
  const { data: contactHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ["admin-provider-contact-history", provider.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_audit_log")
        .select("id, admin_user_id, action_type, details, created_at")
        .eq("target_type", "provider")
        .eq("target_id", provider.user_id)
        .eq("action_type", "contact_provider")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  // Fetch in-app notifications sent to this provider
  const { data: inAppNotifications, isLoading: loadingNotifs } = useQuery({
    queryKey: ["admin-provider-notifications", provider.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("provider_notifications")
        .select("id, title, message, type, read, created_at")
        .eq("user_id", provider.user_id)
        .eq("type", "admin_message")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const sendNotification = useMutation({
    mutationFn: async () => {
      const trimmedSubject = subject.trim();
      const trimmedMessage = message.trim();
      if (!trimmedSubject || !trimmedMessage) throw new Error("Subject and message are required");
      if (trimmedSubject.length > MAX_SUBJECT_LENGTH) throw new Error("Subject is too long");
      if (trimmedMessage.length > MAX_MESSAGE_LENGTH) throw new Error("Message is too long");
      if (!sendEmail && !sendInApp) throw new Error("Select at least one delivery method");
      if (sendEmail && !recipientEmail) throw new Error("No email address available for this provider");

      const { error } = await supabase.functions.invoke("send-admin-notification", {
        body: {
          providerUserId: provider.user_id,
          facilityId: provider.id,
          subject: trimmedSubject,
          message: trimmedMessage,
          sendEmail,
          sendInApp,
          providerEmail: recipientEmail,
          providerName: recipientName,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message sent successfully");
      setSubject("");
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["admin-provider-contact-history", provider.user_id] });
      queryClient.invalidateQueries({ queryKey: ["admin-provider-notifications", provider.user_id] });
    },
    onError: (err) => toast.error(`Failed to send: ${err.message}`),
  });

  return (
    <div className="p-6 space-y-6">
      {/* Recipient Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Recipient</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{recipientName}</p>
              {recipientEmail && <p className="text-sm text-muted-foreground">{recipientEmail}</p>}
              {provider.phone && <p className="text-sm text-muted-foreground">{provider.phone}</p>}
            </div>
            <div className="flex gap-2">
              {recipientEmail && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${recipientEmail}`}>
                    <Mail className="h-3.5 w-3.5 mr-1" />Email
                  </a>
                </Button>
              )}
              {provider.phone && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`tel:${provider.phone}`}>
                    <Phone className="h-3.5 w-3.5 mr-1" />Call
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Send Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4" />Send Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              placeholder="Enter subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value.slice(0, MAX_SUBJECT_LENGTH))}
              maxLength={MAX_SUBJECT_LENGTH}
            />
            <p className="text-xs text-muted-foreground text-right">{subject.length}/{MAX_SUBJECT_LENGTH}</p>
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              placeholder="Write your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              rows={5}
              maxLength={MAX_MESSAGE_LENGTH}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/{MAX_MESSAGE_LENGTH}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Label>Delivery Method</Label>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="send-email" checked={sendEmail} onCheckedChange={(c) => setSendEmail(!!c)} />
                <Label htmlFor="send-email" className="text-sm font-normal flex items-center gap-1">
                  <Mail className="h-4 w-4" />Email
                  {!recipientEmail && <span className="text-destructive text-xs">(no email)</span>}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="send-inapp" checked={sendInApp} onCheckedChange={(c) => setSendInApp(!!c)} />
                <Label htmlFor="send-inapp" className="text-sm font-normal flex items-center gap-1"><MessageSquare className="h-4 w-4" />In-App</Label>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => sendNotification.mutate()}
              disabled={!subject.trim() || !message.trim() || (!sendEmail && !sendInApp) || (sendEmail && !recipientEmail) || sendNotification.isPending}
            >
              {sendNotification.isPending ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <><Send className="h-4 w-4 mr-2" />Send Message</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Message History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Message History ({inAppNotifications?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingNotifs ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : inAppNotifications && inAppNotifications.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {inAppNotifications.map((notif) => (
                <div key={notif.id} className="p-3 rounded-lg border bg-muted/20">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{notif.title}</p>
                    <div className="flex items-center gap-2">
                      {notif.read ? (
                        <Badge variant="outline" className="text-[10px] h-4 text-emerald-600 border-emerald-200">
                          <CheckCircle className="h-2.5 w-2.5 mr-0.5" />Read
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-4 text-amber-600 border-amber-200">
                          <Clock className="h-2.5 w-2.5 mr-0.5" />Unread
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {format(new Date(notif.created_at), "PPp")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No messages sent yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
