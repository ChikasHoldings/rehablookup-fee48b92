import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export interface LeadMessage {
  id: string;
  lead_id: string;
  sender_type: "provider" | "seeker";
  sender_id: string | null;
  body: string;
  created_at: string;
}

// `lead_messages` isn't in the generated Database types yet, so narrow the
// escape hatch to a single typed accessor (same pattern as
// fromLeadsProviderView) instead of casting the whole chain to `any`.
const supabaseRelaxed = supabase as unknown as { from: (relation: string) => unknown };
function fromLeadMessages() {
  return supabaseRelaxed.from("lead_messages") as ReturnType<
    typeof supabase.from<"facility_reviews", LeadMessage>
  >;
}

interface LeadMessageThreadProps {
  leadId: string;
  viewerType: "provider" | "seeker";
  counterpartName?: string;
}

/**
 * Near-real-time two-way thread for a direct lead. Reads are RLS-scoped
 * (provider = facility owner, seeker = matching email); all sends go
 * through the send-lead-message edge function, which enforces the Pro gate
 * and fans out notifications. Shared by the provider InquiryDetailPanel and
 * the seeker's request detail.
 */
export function LeadMessageThread({ leadId, viewerType, counterpartName }: LeadMessageThreadProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["lead-messages", leadId],
    queryFn: async (): Promise<LeadMessage[]> => {
      const { data, error } = await fromLeadMessages()
        .select("id, lead_id, sender_type, sender_id, body, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as LeadMessage[];
    },
    enabled: !!leadId,
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (!leadId) return;
    const channel = supabase
      .channel(`lead-messages-${leadId}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lead_messages", filter: `lead_id=eq.${leadId}` },
        () => queryClient.invalidateQueries({ queryKey: ["lead-messages", leadId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [leadId, queryClient]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-lead-message", {
        body: { leadId, body },
      });
      const errMsg = (data as { error?: string } | null)?.error || error?.message;
      if (errMsg) throw new Error(errMsg);
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["lead-messages", leadId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const placeholderTarget = counterpartName || (viewerType === "provider" ? "client" : "facility");

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Messages
      </h3>
      <div className="rounded-lg border bg-muted/20 p-3 max-h-72 overflow-y-auto space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No messages yet.{" "}
            {viewerType === "provider"
              ? "Start the conversation with this client."
              : "Send a message to the facility."}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_type === viewerType;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                    mine ? "bg-primary text-primary-foreground" : "bg-white border",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={cn(
                      "mt-1 text-[10px]",
                      mine ? "text-primary-foreground/70" : "text-muted-foreground",
                    )}
                  >
                    {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      <div className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 4000))}
          placeholder={`Message ${placeholderTarget}…`}
          rows={2}
          className="resize-none text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button
          size="sm"
          onClick={() => void send()}
          disabled={!draft.trim() || sending}
          className="gap-1.5 shrink-0"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send
        </Button>
      </div>
    </div>
  );
}
