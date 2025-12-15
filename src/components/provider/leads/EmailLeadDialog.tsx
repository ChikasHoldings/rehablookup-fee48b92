import { useState, useMemo } from "react";
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
  Eye,
  Lock
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProviderData } from "@/hooks/useProviderData";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";

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

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  icon: typeof Heart;
  iconColor: string;
  subject: string;
  body: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "thanks_reaching_out",
    name: "Welcome & Thank You",
    category: "Initial Outreach",
    icon: Heart,
    iconColor: "text-rose-500",
    subject: "Thank you for reaching out to {{provider_name}}",
    body: `Dear {{lead_first_name}},

Thank you for taking this important step toward recovery. We know how much courage it takes to reach out, and we want you to know that you're not alone on this journey.

At {{provider_name}}, our compassionate team is dedicated to providing the support and care you need. We believe in treating every individual with dignity and respect, and we're here to help you find your path to wellness.

We would love the opportunity to speak with you and learn more about how we can support you. Please don't hesitate to reach out at your convenience.

Warm regards,
{{provider_contact_name}}
{{provider_name}}`,
  },
  {
    id: "next_steps",
    name: "Getting Started Guide",
    category: "Initial Outreach",
    icon: FileText,
    iconColor: "text-blue-500",
    subject: "Your next steps with {{provider_name}}",
    body: `Dear {{lead_first_name}},

We're so glad you've chosen to explore treatment options with us. Here's what you can expect as we work together on your recovery journey:

1. Initial Assessment — We'll schedule a confidential conversation to understand your unique needs and circumstances.

2. Insurance Verification — Our team will work with your insurance provider to determine your coverage and discuss payment options.

3. Personalized Treatment Plan — Based on your assessment, we'll create a customized plan that addresses your specific goals.

4. Admission Support — We'll guide you through every step of the admission process, answering any questions along the way.

We're here to make this process as smooth and stress-free as possible. When you're ready, simply reply to this email or give us a call.

With care,
{{provider_contact_name}}
{{provider_name}}`,
  },
  {
    id: "insurance_availability",
    name: "Insurance & Availability",
    category: "Logistics",
    icon: Calendar,
    iconColor: "text-emerald-500",
    subject: "Good news about your coverage — {{provider_name}}",
    body: `Dear {{lead_first_name}},

Great news! We've had a chance to review the information you provided, and we wanted to reach out with some updates about coverage and availability.

Our admissions team is ready to:
• Verify your specific insurance benefits
• Explain your coverage options in detail
• Discuss any questions about costs or payment plans
• Review our current program availability

We understand that navigating insurance and treatment options can feel overwhelming. That's why we're here to walk you through everything step by step.

Would you like to schedule a quick call to discuss the details? We're here to help whenever you're ready.

Best regards,
{{provider_contact_name}}
{{provider_name}}`,
  },
  {
    id: "scheduling_call",
    name: "Schedule a Consultation",
    category: "Follow-up",
    icon: PhoneCall,
    iconColor: "text-violet-500",
    subject: "Let's schedule a time to talk — {{provider_name}}",
    body: `Dear {{lead_first_name}},

I hope this message finds you well. I wanted to personally reach out and see if you'd be available for a brief phone consultation.

This call would give us a chance to:
• Learn more about your situation and goals
• Answer any questions you may have about our programs
• Discuss what treatment approach might work best for you
• Address any concerns in a private, judgment-free conversation

There's absolutely no pressure or obligation. This is simply an opportunity for us to connect and see how we might be able to help.

Please let me know what time works best for you, or feel free to reply to this email with your availability.

Looking forward to speaking with you,
{{provider_contact_name}}
{{provider_name}}`,
  },
  {
    id: "gentle_followup",
    name: "Gentle Follow-up",
    category: "Follow-up",
    icon: Clock,
    iconColor: "text-amber-500",
    subject: "Checking in — {{provider_name}}",
    body: `Dear {{lead_first_name}},

I wanted to reach out and see how you're doing. Recovery is a journey that happens on your own timeline, and there's no pressure to rush into anything.

I understand that taking the first step can feel daunting, and it's completely okay to have questions or hesitations. We're here whenever you're ready to talk — whether that's today, next week, or whenever feels right for you.

If your circumstances have changed or you have new questions, please don't hesitate to reach out. Our door is always open.

Wishing you well,
{{provider_contact_name}}
{{provider_name}}`,
  },
];

const MAX_CUSTOM_NOTE_LENGTH = 300;

export function EmailLeadDialog({ lead, open, onOpenChange }: EmailLeadDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customNote, setCustomNote] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedFacility } = useSelectedFacility();
  const { data: providerData } = useProviderData(selectedFacility?.id || undefined);

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
      }, 2500);
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

  // Render template with variables
  const renderTemplate = (text: string) => {
    if (!lead || !providerData) return text;
    
    const leadFirstName = lead.name.split(" ")[0] || "there";
    const providerName = providerData.facility?.name || "Our Facility";
    const providerContactName = providerData.profile 
      ? `${providerData.profile.first_name} ${providerData.profile.last_name}`.trim() 
      : "Our Team";
    
    return text
      .replace(/\{\{lead_first_name\}\}/g, leadFirstName)
      .replace(/\{\{provider_name\}\}/g, providerName)
      .replace(/\{\{provider_contact_name\}\}/g, providerContactName);
  };

  const selectedTemplateInfo = useMemo(() => 
    EMAIL_TEMPLATES.find(t => t.id === selectedTemplate), 
    [selectedTemplate]
  );

  const renderedSubject = useMemo(() => 
    selectedTemplateInfo ? renderTemplate(selectedTemplateInfo.subject) : "",
    [selectedTemplateInfo, lead, providerData]
  );

  const renderedBody = useMemo(() => 
    selectedTemplateInfo ? renderTemplate(selectedTemplateInfo.body) : "",
    [selectedTemplateInfo, lead, providerData]
  );

  if (!lead) return null;

  const firstName = lead.name.split(" ")[0];
  const providerName = providerData?.facility?.name || "Your Facility";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden border-0 shadow-2xl max-h-[95vh] h-[680px]">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-br from-primary/8 via-primary/4 to-transparent flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-lg font-semibold tracking-tight">Email Lead</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Send a professional message to <span className="font-medium text-foreground">{firstName}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {emailSent ? (
          <div className="py-16 px-6 text-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center mx-auto mb-5 animate-in zoom-in-50 duration-500 shadow-lg shadow-green-100/50">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-foreground tracking-tight">Email Sent Successfully!</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
              Your message has been delivered to {lead.email}
            </p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
            {/* Left Panel - Controls */}
            <div className="lg:w-[340px] flex-shrink-0 border-r border-border/50 p-5 space-y-5 overflow-y-auto">
              {/* Recipient */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recipient</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 border border-border/50">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">{lead.email}</span>
                </div>
              </div>

              {/* Template Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="h-auto py-3 px-3 rounded-lg border-border/60 hover:border-primary/40 transition-colors">
                    {selectedTemplateInfo ? (
                      <div className="flex items-center gap-2.5 text-left">
                        <div className={`h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0`}>
                          <selectedTemplateInfo.icon className={`h-4 w-4 ${selectedTemplateInfo.iconColor}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{selectedTemplateInfo.name}</p>
                          <p className="text-xs text-muted-foreground">{selectedTemplateInfo.category}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Select a template...</span>
                    )}
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {EMAIL_TEMPLATES.map((template) => (
                      <SelectItem 
                        key={template.id} 
                        value={template.id}
                        className="py-3 px-2 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0`}>
                            <template.icon className={`h-4 w-4 ${template.iconColor}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{template.name}</p>
                            <p className="text-xs text-muted-foreground">{template.category}</p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Note */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Personal Note
                  </Label>
                  <span className={`text-[10px] font-medium ${customNote.length > MAX_CUSTOM_NOTE_LENGTH * 0.9 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    {customNote.length}/{MAX_CUSTOM_NOTE_LENGTH}
                  </span>
                </div>
                <Textarea
                  placeholder={`Add a brief personal note for ${firstName}...`}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value.slice(0, MAX_CUSTOM_NOTE_LENGTH))}
                  className="min-h-[80px] resize-none rounded-lg text-sm border-border/60 focus:border-primary/40"
                />
                <p className="text-[11px] text-muted-foreground">
                  Optional. Appears below the template message.
                </p>
              </div>

              {/* Template Lock Notice */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50/50 border border-amber-100 text-xs">
                <Lock className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-amber-700 leading-relaxed">
                  Templates are professionally written and cannot be edited to ensure consistent quality.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={sendEmail.isPending}
                  className="flex-1 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={!selectedTemplate || sendEmail.isPending}
                  className="flex-1 gap-2 rounded-lg shadow-md shadow-primary/20"
                >
                  {sendEmail.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Right Panel - Email Preview */}
            <div className="flex-1 bg-slate-100/80 p-5 min-h-[400px] lg:min-h-0 overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Preview</span>
              </div>

              <ScrollArea className="flex-1 rounded-lg border border-slate-200 bg-white shadow-sm">
                {selectedTemplateInfo ? (
                  <div className="max-w-[600px] mx-auto">
                    {/* Email Header - Subtle Branding */}
                    <div className="px-6 py-4 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">RehabLookup</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Sent on behalf of {providerName}</p>
                        </div>
                      </div>
                    </div>

                    {/* Email Subject */}
                    <div className="px-6 py-4 border-b border-slate-100">
                      <p className="text-xs text-slate-500 mb-1">Subject:</p>
                      <p className="text-sm font-semibold text-slate-800">{renderedSubject}</p>
                    </div>

                    {/* Email Body */}
                    <div className="px-6 py-5">
                      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                        {renderedBody}
                      </div>

                      {/* Custom Note */}
                      {customNote.trim() && (
                        <div className="mt-5 pt-4 border-t border-slate-100">
                          <p className="text-xs text-slate-500 mb-2 font-medium">Personal Note:</p>
                          <p className="text-sm text-slate-700 leading-relaxed italic">
                            {customNote}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Email Footer */}
                    <div className="px-6 py-4 mt-4 border-t border-slate-100 bg-slate-50/50">
                      <div className="text-[11px] text-slate-500 leading-relaxed space-y-2">
                        <p>
                          This email was sent to you because you submitted a contact request through RehabLookup. 
                          Your information was shared with {providerName} to help connect you with treatment options.
                        </p>
                        <Separator className="my-2 bg-slate-200" />
                        <div className="flex items-center justify-between">
                          <p className="text-slate-400">
                            Powered by <span className="font-medium">RehabLookup</span>
                          </p>
                          <p className="text-slate-400">
                            If you no longer wish to receive emails, reply with "STOP"
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6">
                    <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <Mail className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">Select a template to preview</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Choose an email template from the left panel to see how your message will appear to {firstName}
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
