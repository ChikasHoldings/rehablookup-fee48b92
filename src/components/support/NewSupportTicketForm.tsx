import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SupportAttachmentPicker } from "@/components/support/SupportAttachments";
import {
  useCreateSupportTicket,
  type SupportPanel,
} from "@/lib/support/useSupportTickets";

const SUBJECT_MAX = 200;
const MESSAGE_MAX = 5000;

export interface SupportCategoryOption {
  value: string;
  label: string;
}

interface NewSupportTicketFormProps {
  panel: SupportPanel;
  facilityId?: string | null;
  categories: SupportCategoryOption[];
  onCreated: (ticketId: string) => void;
  senderName?: string;
  /** Optional cancel affordance (e.g. inside a dialog). */
  onCancel?: () => void;
}

export function NewSupportTicketForm({
  panel,
  facilityId,
  categories,
  onCreated,
  senderName,
  onCancel,
}: NewSupportTicketFormProps) {
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const createTicket = useCreateSupportTicket();
  const pending = createTicket.isPending;

  const trimmedSubject = subject.trim();
  const trimmedMessage = message.trim();
  const missingFacility = panel === "provider" && !facilityId;
  const isValid = !!category && trimmedMessage.length >= 10 && !missingFacility;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    if (missingFacility) {
      toast.error("Select a facility before submitting your request.");
      return;
    }
    if (!isValid) {
      toast.error("Please choose a category and describe your issue (at least 10 characters).");
      return;
    }

    try {
      const ticketId = await createTicket.mutateAsync({
        panel,
        category,
        subject: trimmedSubject || undefined,
        message: trimmedMessage,
        facilityId: facilityId ?? undefined,
        files,
        senderName,
      });
      // Clear only on confirmed success.
      setCategory("");
      setSubject("");
      setMessage("");
      setFiles([]);
      toast.success("Support request sent. We'll reply here and notify you.");
      onCreated(ticketId);
    } catch (err) {
      // Draft text is preserved (state untouched on failure).
      toast.error(err instanceof Error ? err.message : "Couldn't submit your request. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div className="space-y-1.5">
        <Label htmlFor="support-category" className="text-sm">
          Category <span className="text-destructive">*</span>
        </Label>
        <Select value={category} onValueChange={setCategory} disabled={pending}>
          <SelectTrigger id="support-category" className="h-9">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="support-subject" className="text-sm">
            Subject
          </Label>
          <span
            className={cn(
              "text-xs tabular-nums",
              subject.length > SUBJECT_MAX * 0.9 ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {subject.length}/{SUBJECT_MAX}
          </span>
        </div>
        <Input
          id="support-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value.slice(0, SUBJECT_MAX))}
          placeholder="Brief description (optional)"
          className="h-9"
          maxLength={SUBJECT_MAX}
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="support-message" className="text-sm">
            Message <span className="text-destructive">*</span>
          </Label>
          <span
            className={cn(
              "text-xs tabular-nums",
              message.length > MESSAGE_MAX * 0.9 ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {message.length}/{MESSAGE_MAX}
          </span>
        </div>
        <Textarea
          id="support-message"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
          placeholder="Describe your issue in detail..."
          rows={5}
          maxLength={MESSAGE_MAX}
          className="resize-none"
          disabled={pending}
        />
        {trimmedMessage.length > 0 && trimmedMessage.length < 10 && (
          <p className="text-xs text-destructive">Please provide at least 10 characters.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm">Attachments</Label>
        <SupportAttachmentPicker
          files={files}
          onChange={setFiles}
          onError={(msg) => toast.error(msg)}
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">Up to 10 files, 15 MB each.</p>
      </div>

      {missingFacility && (
        <p className="text-xs text-destructive">
          Select a facility from the header before submitting a provider request.
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending || !isValid} className="gap-2">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {pending ? "Sending..." : "Send request"}
        </Button>
      </div>
    </form>
  );
}
