import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, Mail, Phone, MessageSquare, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { Facility } from "../ProviderListItem";

interface ProviderContactTabProps {
  provider: Facility;
  providerProfile: any;
}

export function ProviderContactTab({ provider, providerProfile }: ProviderContactTabProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendInApp, setSendInApp] = useState(true);

  const sendNotification = useMutation({
    mutationFn: async () => {
      if (!subject || !message) throw new Error("Missing fields");
      const { error } = await supabase.functions.invoke("send-admin-notification", {
        body: {
          providerUserId: provider.user_id,
          facilityId: provider.id,
          subject,
          message,
          sendEmail,
          sendInApp,
          providerEmail: providerProfile?.email || provider.email,
          providerName: providerProfile?.first_name || provider.name,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message sent");
      setSubject("");
      setMessage("");
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4" />Send Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input placeholder="Enter subject..." value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea placeholder="Write your message..." value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className="resize-none" />
          </div>
          <div className="flex flex-col gap-3">
            <Label>Delivery Method</Label>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="send-email" checked={sendEmail} onCheckedChange={(c) => setSendEmail(!!c)} />
                <Label htmlFor="send-email" className="text-sm font-normal flex items-center gap-1"><Mail className="h-4 w-4" />Email</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="send-inapp" checked={sendInApp} onCheckedChange={(c) => setSendInApp(!!c)} />
                <Label htmlFor="send-inapp" className="text-sm font-normal flex items-center gap-1"><MessageSquare className="h-4 w-4" />In-App</Label>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => sendNotification.mutate()} disabled={!subject || !message || (!sendEmail && !sendInApp) || sendNotification.isPending}>
              {sendNotification.isPending ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <><Send className="h-4 w-4 mr-2" />Send Message</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Quick Contact</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(providerProfile?.email || provider.email) && (
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href={`mailto:${providerProfile?.email || provider.email}`}>
                <Mail className="h-4 w-4 mr-2" />Email: {providerProfile?.email || provider.email}
              </a>
            </Button>
          )}
          {provider.phone && (
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href={`tel:${provider.phone}`}>
                <Phone className="h-4 w-4 mr-2" />Call: {provider.phone}
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
