import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, User, Building2, HeadphonesIcon, Loader2 } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

interface Thread {
  id: string;
  inquiry_id: string;
  thread_type: string;
  facility_id: string | null;
  user_id: string;
  last_message_at: string | null;
  user_last_read_at: string | null;
  created_at: string;
  facility?: {
    name: string;
  } | null;
}

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  created_at: string;
}

interface ConciergeMessagingProps {
  inquiryId: string;
  matchedFacilityIds?: string[];
}

export function ConciergeMessaging({ inquiryId, matchedFacilityIds = [] }: ConciergeMessagingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch threads
  const { data: threads, isLoading: threadsLoading } = useQuery({
    queryKey: ["concierge-threads", inquiryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_threads")
        .select(`
          id, inquiry_id, thread_type, facility_id, user_id,
          last_message_at, user_last_read_at, created_at,
          facility:facilities(name)
        `)
        .eq("inquiry_id", inquiryId)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      return (data || []) as unknown as Thread[];
    },
  });

  // Select first thread by default
  useEffect(() => {
    if (threads?.length && !selectedThreadId) {
      setSelectedThreadId(threads[0].id);
    }
  }, [threads, selectedThreadId]);

  const selectedThread = threads?.find(t => t.id === selectedThreadId);

  // Fetch messages for selected thread
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["concierge-messages", selectedThreadId],
    queryFn: async () => {
      if (!selectedThreadId) return [];
      
      const { data, error } = await supabase
        .from("concierge_messages")
        .select("id, thread_id, sender_id, sender_type, content, created_at")
        .eq("thread_id", selectedThreadId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!selectedThreadId,
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!selectedThreadId) return;

    const channel = supabase
      .channel(`messages-${selectedThreadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "concierge_messages",
          filter: `thread_id=eq.${selectedThreadId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["concierge-messages", selectedThreadId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedThreadId, queryClient]);

  // Create thread if needed
  const createThreadMutation = useMutation({
    mutationFn: async ({ threadType, facilityId }: { threadType: string; facilityId?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("concierge_threads")
        .insert({
          inquiry_id: inquiryId,
          thread_type: threadType,
          facility_id: facilityId || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["concierge-threads", inquiryId] });
      setSelectedThreadId(data.id);
    },
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedThreadId || !messageContent.trim()) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const trimmedContent = messageContent.trim();

      const { error } = await supabase.from("concierge_messages").insert({
        thread_id: selectedThreadId,
        sender_id: user.id,
        sender_type: "seeker",
        content: trimmedContent,
      });

      if (error) throw error;

      // Update thread last_message_at and user_last_read_at
      await supabase
        .from("concierge_threads")
        .update({ 
          last_message_at: new Date().toISOString(),
          user_last_read_at: new Date().toISOString(),
        })
        .eq("id", selectedThreadId);

      // Send notification to recipient
      const notificationType = selectedThread?.thread_type === "advisor" 
        ? "message_to_advisor" 
        : "message_to_facility";

      try {
        await supabase.functions.invoke("send-message-notifications", {
          body: {
            notificationType,
            threadId: selectedThreadId,
            messageContent: trimmedContent,
            senderType: "seeker",
          },
        });
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
      }
    },
    onSuccess: () => {
      setMessageContent("");
      queryClient.invalidateQueries({ queryKey: ["concierge-messages", selectedThreadId] });
      queryClient.invalidateQueries({ queryKey: ["concierge-threads", inquiryId] });
      queryClient.invalidateQueries({ queryKey: ["unread-message-count", inquiryId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`;
    return format(date, "MMM d, h:mm a");
  };

  const getThreadIcon = (thread: Thread) => {
    if (thread.thread_type === "advisor") {
      return <HeadphonesIcon className="h-4 w-4" />;
    }
    return <Building2 className="h-4 w-4" />;
  };

  const getThreadName = (thread: Thread) => {
    if (thread.thread_type === "advisor") {
      return "Placement Advisor";
    }
    return thread.facility?.name || "Facility";
  };

  if (threadsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // No threads yet - show start buttons
  if (!threads?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Start a conversation with your placement advisor or matched facilities.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => createThreadMutation.mutate({ threadType: "advisor" })}
              disabled={createThreadMutation.isPending}
              className="gap-2"
            >
              <HeadphonesIcon className="h-4 w-4" />
              Message Advisor
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[500px]">
      {/* Thread Tabs */}
      <div className="flex border-b overflow-x-auto">
        {threads.map((thread) => {
          const isSelected = selectedThreadId === thread.id;
          return (
            <button
              key={thread.id}
              onClick={() => setSelectedThreadId(thread.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isSelected
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {getThreadIcon(thread)}
              {getThreadName(thread)}
            </button>
          );
        })}
        {/* Add new thread button */}
        {matchedFacilityIds.length > (threads?.filter(t => t.thread_type === "facility").length || 0) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              // Find a facility that doesn't have a thread yet
              const existingFacilityIds = threads
                .filter(t => t.thread_type === "facility")
                .map(t => t.facility_id);
              const newFacilityId = matchedFacilityIds.find(id => !existingFacilityIds.includes(id));
              if (newFacilityId) {
                createThreadMutation.mutate({ threadType: "facility", facilityId: newFacilityId });
              }
            }}
          >
            + New
          </Button>
        )}
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {messagesLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-16 w-3/4 ml-auto" />
          </div>
        ) : messages?.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No messages yet</p>
            <p className="text-sm">Send a message to start the conversation</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages?.map((message) => {
              const isOwn = message.sender_type === "seeker";
              return (
                <div
                  key={message.id}
                  className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={isOwn ? "bg-primary text-white" : "bg-muted"}>
                      {isOwn ? <User className="h-4 w-4" /> : getThreadIcon(selectedThread!)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[70%] ${isOwn ? "text-right" : ""}`}>
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatMessageDate(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessageMutation.mutate();
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Type a message..."
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            disabled={sendMessageMutation.isPending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!messageContent.trim() || sendMessageMutation.isPending}
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}
