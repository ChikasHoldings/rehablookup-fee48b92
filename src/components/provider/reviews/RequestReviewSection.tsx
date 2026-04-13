import { useState, useEffect } from 'react';
import { Mail, Send, Users, Eye, MousePointer, CheckCircle, Loader2, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useReviewRequests } from '@/hooks/useReviewRequests';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface RequestReviewSectionProps {
  facilityId: string | null;
  facilityName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestReviewSection({ facilityId, facilityName, open, onOpenChange }: RequestReviewSectionProps) {
  const { requests, isLoading, isSending, sendReviewRequest, stats } = useReviewRequests(facilityId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Reset form state when modal closes
  useEffect(() => {
    if (!open) {
      setIsFormOpen(false);
      setRecipientName('');
      setRecipientEmail('');
      setIsHistoryOpen(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sanitize name - strip HTML/JS
    const sanitizedName = recipientName.trim()
      .replace(/<[^>]*>/g, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "")
      .slice(0, 100);
    
    const sanitizedEmail = recipientEmail.trim().toLowerCase().slice(0, 255);
    
    if (!sanitizedName || !sanitizedEmail) return;

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) return;

    const result = await sendReviewRequest(sanitizedName, sanitizedEmail);
    if (!result.error) {
      setRecipientName('');
      setRecipientEmail('');
      setIsFormOpen(false);
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const canSubmit = recipientName.trim() && recipientEmail.trim() && isValidEmail(recipientEmail);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Request Reviews</DialogTitle>
              <DialogDescription className="text-sm">
                Send email invitations to past clients to leave a review
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action Button */}
          <div className="flex justify-end">
            <Button
              variant={isFormOpen ? "outline" : "default"}
              size="sm"
              onClick={() => setIsFormOpen(!isFormOpen)}
            >
              {isFormOpen ? (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  New Request
                </>
              )}
            </Button>
          </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Send className="h-3.5 w-3.5" />
              <span className="text-xs">Sent</span>
            </div>
            <p className="text-lg font-semibold">{stats.sent}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Eye className="h-3.5 w-3.5" />
              <span className="text-xs">Opened</span>
            </div>
            <p className="text-lg font-semibold">{stats.opened}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <MousePointer className="h-3.5 w-3.5" />
              <span className="text-xs">Clicked</span>
            </div>
            <p className="text-lg font-semibold">{stats.clicked}</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="text-xs">Reviews</span>
            </div>
            <p className="text-lg font-semibold text-emerald-600">{stats.converted}</p>
          </div>
        </div>

        {/* Send Review Request Form */}
        {isFormOpen && (
          <form onSubmit={handleSubmit} className="p-4 rounded-lg border bg-muted/30 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="recipient-name" className="text-sm">
                  Client Name
                </Label>
                <Input
                  id="recipient-name"
                  placeholder="John Smith"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  disabled={isSending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipient-email" className="text-sm">
                  Email Address
                </Label>
                <Input
                  id="recipient-email"
                  type="email"
                  placeholder="john@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  disabled={isSending}
                  className={cn(
                    recipientEmail && !isValidEmail(recipientEmail) && "border-destructive"
                  )}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                An email will be sent inviting them to review {facilityName || 'your facility'}
              </p>
              <Button type="submit" disabled={!canSubmit || isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Request
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Request History (Collapsible) */}
        {requests.length > 0 ? (
          <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between hover:bg-muted/50 p-3 h-auto">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Recent Requests ({requests.length})
                  </span>
                </div>
                {isHistoryOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  requests.slice(0, 10).map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-background text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{request.recipient_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {request.recipient_email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {request.review_submitted_at ? (
                          <Badge variant="default" className="bg-emerald-500 text-xs">
                            Reviewed
                          </Badge>
                        ) : request.clicked_at ? (
                          <Badge variant="secondary" className="text-xs">
                            Clicked
                          </Badge>
                        ) : request.opened_at ? (
                          <Badge variant="outline" className="text-xs">
                            Opened
                          </Badge>
                        ) : request.sent_at ? (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Sent
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Pending
                          </Badge>
                        )}
                        {request.sent_at && (
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {format(new Date(request.sent_at), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : !isFormOpen && !isLoading && (
          /* Empty state when no form and no requests */
          <div className="text-center py-6 px-4 rounded-lg bg-muted/30 border border-dashed">
            <Mail className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No review requests sent yet. Click "New Request" to invite past clients to leave a review.
            </p>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
