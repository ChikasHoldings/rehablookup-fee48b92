import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Send, Loader2, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Lead {
  id: string;
  name: string;
  email: string;
}

interface EmailLeadDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMAIL_TEMPLATES = [
  {
    id: "thanks_reaching_out",
    name: "Thanks for Reaching Out",
    description: "Thank the lead for their inquiry and express your availability to help.",
  },
  {
    id: "next_steps",
    name: "Next Steps for Treatment",
    description: "Outline the admission process and what they can expect.",
  },
  {
    id: "insurance_availability",
    name: "Insurance & Availability Follow-up",
    description: "Discuss insurance verification and current program availability.",
  },
  {
    id: "scheduling_call",
    name: "Scheduling a Call",
    description: "Request a phone call to discuss their needs in detail.",
  },
];

const MAX_CUSTOM_NOTE_LENGTH = 500;

export function EmailLeadDialog({ lead, open, onOpenChange }: EmailLeadDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customNote, setCustomNote] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendEmail = useMutation({
    mutationFn: async () => {
      if (!lead || !selectedTemplate) throw new Error("Missing required data");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("send-lead-email", {
        body: {
          leadId: lead.id,
          templateId: selectedTemplate,
          customNote: customNote.trim() || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send email");
      }

      return response.data;
    },
    onSuccess: (data) => {
      setEmailSent(true);
      queryClient.invalidateQueries({ queryKey: ["lead-emails"] });
      toast({
        title: "Email sent!",
        description: data.message || `Email sent to ${lead?.name}`,
      });
      // Reset after showing success
      setTimeout(() => {
        onOpenChange(false);
        setEmailSent(false);
        setSelectedTemplate("");
        setCustomNote("");
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!selectedTemplate) {
      toast({
        title: "Select a template",
        description: "Please choose an email template before sending.",
        variant: "destructive",
      });
      return;
    }
    sendEmail.mutate();
  };

  const handleClose = () => {
    if (!sendEmail.isPending) {
      onOpenChange(false);
      setSelectedTemplate("");
      setCustomNote("");
      setEmailSent(false);
    }
  };

  if (!lead) return null;

  const selectedTemplateInfo = EMAIL_TEMPLATES.find(t => t.id === selectedTemplate);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Email Lead
          </DialogTitle>
          <DialogDescription>
            Send a professional follow-up email to {lead.name}
          </DialogDescription>
        </DialogHeader>

        {emailSent ? (
          <div className="py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Email Sent!</h3>
            <p className="text-muted-foreground mt-1">
              Your message has been delivered to {lead.email}
            </p>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Recipient */}
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient</Label>
              <Input
                id="recipient"
                value={lead.email}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <Label htmlFor="template">Email Template *</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplateInfo && (
                <p className="text-sm text-muted-foreground">
                  {selectedTemplateInfo.description}
                </p>
              )}
            </div>

            {/* Custom Note */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="customNote">Personal Note (optional)</Label>
                <span className={`text-xs ${customNote.length > MAX_CUSTOM_NOTE_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {customNote.length}/{MAX_CUSTOM_NOTE_LENGTH}
                </span>
              </div>
              <Textarea
                id="customNote"
                placeholder="Add a personalized message that will be included in the email..."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value.slice(0, MAX_CUSTOM_NOTE_LENGTH))}
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This note will be inserted into the template. Keep it professional.
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="text-muted-foreground">
                <strong>Note:</strong> Emails are sent from RehabLookup on your behalf. 
                Replies will go to your facility's email address. A copy of this email 
                will be logged in the lead's history.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={sendEmail.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={!selectedTemplate || sendEmail.isPending}
                className="gap-2"
              >
                {sendEmail.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
