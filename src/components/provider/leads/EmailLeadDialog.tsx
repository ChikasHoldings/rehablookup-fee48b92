import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Mail, 
  Send, 
  Loader2, 
  CheckCircle, 
  Clock, 
  PhoneCall, 
  FileText, 
  Heart,
  Calendar,
  Sparkles,
  Info
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
    name: "Welcome & Thank You",
    category: "Initial Outreach",
    icon: Heart,
    iconColor: "text-rose-500",
    description: "A warm introduction thanking them for reaching out and expressing your commitment to helping them on their recovery journey.",
    preview: "Thank you for taking this important step toward recovery. Our team is here to support you every step of the way...",
  },
  {
    id: "next_steps",
    name: "Getting Started Guide",
    category: "Initial Outreach",
    icon: FileText,
    iconColor: "text-blue-500",
    description: "Outline the admission process clearly with next steps, what to expect, and how you'll support them through intake.",
    preview: "We're excited to help you begin your recovery journey. Here's what you can expect from our admission process...",
  },
  {
    id: "insurance_availability",
    name: "Insurance & Availability",
    category: "Logistics",
    icon: Calendar,
    iconColor: "text-emerald-500",
    description: "Discuss insurance verification status and current program availability with reassurance about the process.",
    preview: "Great news! We've reviewed your insurance information and wanted to share some updates about your coverage and our current availability...",
  },
  {
    id: "scheduling_call",
    name: "Schedule a Consultation",
    category: "Follow-up",
    icon: PhoneCall,
    iconColor: "text-violet-500",
    description: "Request a phone consultation to discuss their needs in detail and answer any questions they may have.",
    preview: "I'd love to speak with you personally to better understand your situation and answer any questions you may have...",
  },
  {
    id: "gentle_followup",
    name: "Gentle Follow-up",
    category: "Follow-up",
    icon: Clock,
    iconColor: "text-amber-500",
    description: "A caring follow-up for leads who haven't responded, reiterating your availability and support.",
    preview: "I wanted to check in and see how you're doing. Recovery is a journey, and we're here whenever you're ready to take the next step...",
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
        title: "Email sent successfully!",
        description: data.message || `Your message has been delivered to ${lead?.name}`,
      });
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
  const firstName = lead.name.split(" ")[0];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">Compose Email</DialogTitle>
              <DialogDescription className="text-sm">
                Send a professional follow-up to <span className="font-medium text-foreground">{firstName}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {emailSent ? (
          <div className="py-16 px-6 text-center">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5 animate-in zoom-in-50 duration-300">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Email Sent!</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
              Your message has been delivered to {lead.email}. 
              It will appear in the Communications tab.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Recipient Badge */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
              <span className="text-sm text-muted-foreground">To:</span>
              <Badge variant="secondary" className="font-normal">
                {lead.email}
              </Badge>
            </div>

            {/* Template Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Choose Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="h-auto py-3">
                  {selectedTemplateInfo ? (
                    <div className="flex items-center gap-3 text-left">
                      <div className={`h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0`}>
                        <selectedTemplateInfo.icon className={`h-4 w-4 ${selectedTemplateInfo.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{selectedTemplateInfo.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedTemplateInfo.category}</p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select an email template...</span>
                  )}
                </SelectTrigger>
                <SelectContent className="max-h-[320px]">
                  {EMAIL_TEMPLATES.map((template) => (
                    <SelectItem 
                      key={template.id} 
                      value={template.id}
                      className="py-3 cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <template.icon className={`h-4 w-4 ${template.iconColor}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{template.name}</p>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                              {template.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template Preview */}
            {selectedTemplateInfo && (
              <div className="space-y-2 animate-in fade-in-50 duration-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Email Preview
                  </Label>
                </div>
                <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-100 text-sm text-muted-foreground italic">
                  "{selectedTemplateInfo.preview}"
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Info className="h-3 w-3" />
                  This is a preview. The actual email includes your facility name and contact details.
                </p>
              </div>
            )}

            {/* Custom Note */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="customNote" className="text-sm font-medium">
                  Add Personal Touch <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <span className={`text-xs ${customNote.length > MAX_CUSTOM_NOTE_LENGTH * 0.9 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {customNote.length}/{MAX_CUSTOM_NOTE_LENGTH}
                </span>
              </div>
              <Textarea
                id="customNote"
                placeholder={`Add a personalized note for ${firstName}. This appears in the email body and makes your message more genuine...`}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value.slice(0, MAX_CUSTOM_NOTE_LENGTH))}
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Info Box */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border text-sm">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-muted-foreground space-y-1">
                <p>
                  Emails are sent from <span className="font-medium text-foreground">RehabLookup</span> on your behalf.
                </p>
                <p>
                  Replies will be delivered to your facility's email. All communications are logged for your records.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t">
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
                className="gap-2 min-w-[120px]"
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
