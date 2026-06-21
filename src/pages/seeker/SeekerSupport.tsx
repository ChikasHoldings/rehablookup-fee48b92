import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { HelpCircle, Plus, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSeekerSession } from "@/hooks/useSeekerSession";
import { SupportTicketList } from "@/components/support/SupportTicketList";
import { SupportTicketThread } from "@/components/support/SupportTicketThread";
import { NewSupportTicketForm } from "@/components/support/NewSupportTicketForm";
import { useSupportTickets } from "@/lib/support/useSupportTickets";

const SEEKER_CATEGORIES = [
  { value: "account", label: "Account" },
  { value: "request_help", label: "Placement / inquiry help" },
  { value: "technical", label: "Technical issue" },
  { value: "feedback", label: "Feedback" },
  { value: "other", label: "Other" },
];

export default function SeekerSupport() {
  const { user, isReady } = useSeekerSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTicketId = searchParams.get("ticket");
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    data: tickets,
    isLoading,
    isError,
    refetch,
  } = useSupportTickets("seeker", { enabled: isReady && !!user });

  const senderName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    undefined;

  const selectTicket = (ticketId: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (ticketId) next.set("ticket", ticketId);
        else next.delete("ticket");
        return next;
      },
      { replace: true },
    );
  };

  const handleCreated = (ticketId: string) => {
    setDialogOpen(false);
    refetch();
    selectTicket(ticketId);
  };

  return (
    <>
      <Helmet>
        <title>Support | RehabLookup</title>
        <meta name="description" content="Get help from the RehabLookup support team and track your requests." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background pb-24">
        <div className="px-4 py-6 space-y-6 max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-display font-bold text-foreground truncate">Support</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Message our team and track your requests</p>
              </div>
            </div>
            {!selectedTicketId && (
              <Button onClick={() => setDialogOpen(true)} className="gap-1.5 shrink-0">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New request</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}
          </div>

          {selectedTicketId ? (
            <div className="space-y-3">
              <Button variant="ghost" size="sm" className="-ml-2 gap-1.5" onClick={() => selectTicket(null)}>
                <ArrowLeft className="h-4 w-4" />
                All requests
              </Button>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="h-[70vh] min-h-[420px]">
                    <SupportTicketThread
                      ticketId={selectedTicketId}
                      panel="seeker"
                      onBack={() => selectTicket(null)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your requests</CardTitle>
              </CardHeader>
              <CardContent>
                {isError ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-amber-600 mx-auto mb-2" aria-hidden />
                    <p className="text-sm font-medium text-foreground">Couldn't load your requests</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">Please try again.</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      Try again
                    </Button>
                  </div>
                ) : (
                  <SupportTicketList
                    tickets={tickets}
                    onSelect={(id) => selectTicket(id)}
                    isLoading={isLoading}
                    emptyHint="Open a request and our team will reply right here."
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New support request</DialogTitle>
            <DialogDescription>
              Send us a message — we'll reply here and notify you when support responds.
            </DialogDescription>
          </DialogHeader>
          <NewSupportTicketForm
            panel="seeker"
            categories={SEEKER_CATEGORIES}
            senderName={senderName}
            onCreated={handleCreated}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
