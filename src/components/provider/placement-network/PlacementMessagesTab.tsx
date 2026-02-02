import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Loader2, User, Building2, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PlacementMessagesTabProps {
  facilityId: string;
}

export function PlacementMessagesTab({ facilityId }: PlacementMessagesTabProps) {
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

  // Fetch all threads for this facility
  const { data: threads, isLoading: threadsLoading } = useQuery({
    queryKey: ["placement-threads", facilityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_threads")
        .select(`
          *,
          concierge_inquiries (
            id, user_name, status
          )
        `)
        .eq("facility_id", facilityId)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!facilityId,
  });

  // Fetch messages for selected thread
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["thread-messages", selectedThreadId],
    queryFn: async () => {
      if (!selectedThreadId) return [];
      const { data, error } = await supabase
        .from("concierge_messages")
        .select("*")
        .eq("thread_id", selectedThreadId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedThreadId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedThreadId || !newMessage.trim()) throw new Error("No message");

      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("concierge_messages").insert({
        thread_id: selectedThreadId,
        sender_id: session.session.user.id,
        sender_type: "provider",
        content: newMessage.trim(),
      });

      if (error) throw error;

      // Update thread last_message_at
      await supabase
        .from("concierge_threads")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", selectedThreadId);
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["thread-messages", selectedThreadId] });
      queryClient.invalidateQueries({ queryKey: ["placement-threads"] });
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });

  // Mark thread as read
  const markReadMutation = useMutation({
    mutationFn: async (threadId: string) => {
      const { error } = await supabase
        .from("concierge_threads")
        .update({ facility_last_read_at: new Date().toISOString() })
        .eq("id", threadId);

      if (error) throw error;
    },
  });

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    markReadMutation.mutate(threadId);
  };

  const selectedThread = threads?.find((t) => t.id === selectedThreadId);

  // Check for unread messages in thread
  const hasUnreadMessages = (thread: any) => {
    if (!thread.facility_last_read_at) return !!thread.last_message_at;
    if (!thread.last_message_at) return false;
    return new Date(thread.last_message_at) > new Date(thread.facility_last_read_at);
  };

  if (threadsLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!threads || threads.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground mb-1">No messages yet</p>
          <p className="text-sm text-muted-foreground">
            Messages with seekers will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-4 min-h-[500px]">
      {/* Thread List */}
      <Card className="lg:col-span-1">
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversations
          </CardTitle>
        </CardHeader>
        <ScrollArea className="h-[450px]">
          <div className="p-2 space-y-1">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => handleSelectThread(thread.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors",
                  selectedThreadId === thread.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {thread.concierge_inquiries?.user_name || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Case #{thread.inquiry_id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  {hasUnreadMessages(thread) && (
                    <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full" />
                  )}
                </div>
                {thread.last_message_at && (
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(thread.last_message_at), "MMM d, h:mm a")}
                  </p>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Message View */}
      <Card className="lg:col-span-2 flex flex-col">
        {selectedThread ? (
          <>
            <CardHeader className="py-3 px-4 border-b shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">
                    {selectedThread.concierge_inquiries?.user_name || "Conversation"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Case #{selectedThread.inquiry_id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize text-xs">
                  {selectedThread.concierge_inquiries?.status || "active"}
                </Badge>
              </div>
            </CardHeader>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messagesLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : messages && messages.length > 0 ? (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-3",
                        msg.sender_type === "provider" ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.sender_type !== "provider" && (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg p-3",
                          msg.sender_type === "provider"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p
                          className={cn(
                            "text-[10px] mt-1",
                            msg.sender_type === "provider"
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          )}
                        >
                          {format(new Date(msg.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                      {msg.sender_type === "provider" && (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No messages yet. Start the conversation!
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t shrink-0">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={2}
                  className="resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (newMessage.trim()) {
                        sendMessageMutation.mutate();
                      }
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="shrink-0 h-auto"
                  onClick={() => sendMessageMutation.mutate()}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center text-center">
            <div>
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Select a conversation to view messages
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
