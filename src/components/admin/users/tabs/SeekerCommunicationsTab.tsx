import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, MessageSquare, User, Shield, Send } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface SeekerCommunicationsTabProps {
  userId: string;
}

export function SeekerCommunicationsTab({ userId }: SeekerCommunicationsTabProps) {
  const { data: threads, isLoading: threadsLoading } = useQuery({
    queryKey: ["admin-seeker-threads", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("concierge_threads")
        .select("id, thread_type, created_at, last_message_at, facility_id, inquiry_id")
        .eq("user_id", userId)
        .order("last_message_at", { ascending: false });
      return data || [];
    },
  });

  const { data: messages, isLoading: msgsLoading } = useQuery({
    queryKey: ["admin-seeker-messages", threads?.map((t: any) => t.id)],
    queryFn: async () => {
      if (!threads?.length) return [];
      const threadIds = threads.map((t: any) => t.id);
      const { data } = await supabase
        .from("concierge_messages")
        .select("id, thread_id, sender_type, sender_id, content, created_at, read_at, attachment_name")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: (threads?.length || 0) > 0,
  });

  const { data: emailEvents, isLoading: emailsLoading } = useQuery({
    queryKey: ["admin-seeker-emails", userId],
    queryFn: async () => {
      const { data: emailsData } = await supabase.rpc("get_seeker_emails_for_admin");
      const userEmail = emailsData?.find((e: any) => e.user_id === userId)?.email;
      if (!userEmail) return [];

      const { data } = await supabase
        .from("email_tracking_events")
        .select("id, email_type, event_type, recipient_email, created_at, event_data")
        .eq("recipient_email", userEmail)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const loading = threadsLoading || msgsLoading || emailsLoading;

  if (loading) {
    return (
      <div className="p-5 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  const hasContent = (messages?.length || 0) > 0 || (emailEvents?.length || 0) > 0;

  if (!hasContent) {
    return (
      <div className="p-5 text-center py-16">
        <Mail className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-muted-foreground font-medium">No communications</p>
        <p className="text-xs text-muted-foreground mt-1">No messages or emails found for this seeker.</p>
      </div>
    );
  }

  const allComms = [
    ...(messages || []).map((m: any) => ({
      id: m.id,
      type: "message" as const,
      content: m.content,
      senderType: m.sender_type,
      date: m.created_at,
      read: !!m.read_at,
      threadId: m.thread_id,
      attachment: m.attachment_name,
    })),
    ...(emailEvents || []).map((e: any) => ({
      id: e.id,
      type: "email" as const,
      content: `${e.email_type} — ${e.event_type}`,
      senderType: "system",
      date: e.created_at,
      read: e.event_type === "delivered" || e.event_type === "opened",
      emailType: e.email_type,
      eventType: e.event_type,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-5 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border bg-card text-center">
          <p className="text-xl font-bold tabular-nums">{allComms.length}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
        </div>
        <div className="p-3 rounded-xl border bg-card text-center">
          <p className="text-xl font-bold tabular-nums text-primary">{messages?.length || 0}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Messages</p>
        </div>
        <div className="p-3 rounded-xl border bg-card text-center">
          <p className="text-xl font-bold tabular-nums text-chart-3">{emailEvents?.length || 0}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Emails</p>
        </div>
      </div>

      {/* Timeline */}
      {allComms.map((comm) => (
        <div key={comm.id} className="p-4 rounded-xl border bg-card flex items-start gap-3 hover:bg-muted/30 transition-colors">
          <div className={cn(
            "h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0",
            comm.type === "email" ? "bg-primary/10 text-primary" :
            comm.senderType === "user" ? "bg-chart-3/10 text-chart-3" :
            comm.senderType === "admin" ? "bg-warning/10 text-warning" :
            "bg-muted text-muted-foreground"
          )}>
            {comm.type === "email" ? <Mail className="h-4 w-4" /> :
             comm.senderType === "user" ? <User className="h-4 w-4" /> :
             comm.senderType === "admin" ? <Shield className="h-4 w-4" /> :
             <Send className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold capitalize">
                {comm.type === "email" ? "Email" : comm.senderType}
              </span>
              {comm.type === "email" && (
                <Badge variant="outline" className="text-[10px] h-4">{(comm as any).eventType}</Badge>
              )}
              {!comm.read && comm.type === "message" && (
                <Badge variant="secondary" className="text-[10px] h-4">Unread</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{comm.content}</p>
            {comm.type === "message" && (comm as any).attachment && (
              <p className="text-xs text-primary mt-0.5">📎 {(comm as any).attachment}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(comm.date), { addSuffix: true })}
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {format(new Date(comm.date), "MMM d, h:mm a")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
