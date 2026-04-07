import { useState } from "react";
import { Copy, Mail, MessageSquare, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { leadResponseTemplates, templateCategories, type ResponseTemplate } from "@/data/leadResponseTemplates";
import { toast } from "sonner";

interface ResponseTemplatesDrawerProps {
  trigger?: React.ReactNode;
  leadName?: string;
  facilityName?: string;
}

export function ResponseTemplatesDrawer({ trigger, leadName, facilityName }: ResponseTemplatesDrawerProps) {
  const [activeCategory, setActiveCategory] = useState<string>("initial");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredTemplates = leadResponseTemplates.filter(t => t.category === activeCategory);

  const fillTemplate = (template: ResponseTemplate) => {
    let text = template.body;
    if (leadName) text = text.replace(/\{\{name\}\}/g, leadName);
    if (facilityName) text = text.replace(/\{\{facility_name\}\}/g, facilityName);
    text = text.replace(/\{\{your_name\}\}/g, "[Your Name]");
    text = text.replace(/\{\{phone\}\}/g, "[Your Phone]");
    return text;
  };

  const copyTemplate = (template: ResponseTemplate) => {
    const text = fillTemplate(template);
    const full = template.subject
      ? `Subject: ${template.subject.replace(/\{\{facility_name\}\}/g, facilityName || "[Facility]")}\n\n${text}`
      : text;
    navigator.clipboard.writeText(full);
    setCopiedId(template.id);
    toast.success("Template copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const channelIcon = (channel: string) => {
    if (channel === "sms") return <MessageSquare className="h-3 w-3" />;
    if (channel === "email") return <Mail className="h-3 w-3" />;
    return <FileText className="h-3 w-3" />;
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Templates
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Response Templates</SheetTitle>
          <SheetDescription>
            Pre-written messages to help you respond quickly and professionally.
          </SheetDescription>
        </SheetHeader>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {templateCategories.map((cat) => (
            <Button
              key={cat.key}
              variant={activeCategory === cat.key ? "default" : "outline"}
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Templates */}
        <div className="space-y-3">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="rounded-lg border border-border bg-muted/30 p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h4 className="text-sm font-medium text-foreground truncate">{template.title}</h4>
                  <Badge variant="outline" className="gap-1 text-[10px] shrink-0 h-5">
                    {channelIcon(template.channel)}
                    {template.channel === "both" ? "SMS/Email" : template.channel.toUpperCase()}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 shrink-0"
                  onClick={() => copyTemplate(template)}
                >
                  {copiedId === template.id ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              {template.subject && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Subject:</span> {template.subject.replace(/\{\{facility_name\}\}/g, facilityName || "[Facility]")}
                </p>
              )}
              <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed line-clamp-4">
                {fillTemplate(template)}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs gap-1"
                onClick={() => copyTemplate(template)}
              >
                <Copy className="h-3 w-3" />
                Copy to Clipboard
              </Button>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
