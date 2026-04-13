import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSeekerSession } from "@/hooks/useSeekerSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useFileAttachment } from "@/hooks/useFileAttachment";
import { MessageAttachment } from "@/components/shared/MessageAttachment";
import { RefreshableAttachment } from "@/components/shared/RefreshableAttachment";
import { MessageCircle, Send, User, HeadphonesIcon, Loader2, Paperclip, ShieldCheck } from "lucide-react";
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
}

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  created_at: string;
  attachment_url: string | null;
  attachment_name: string | null;
}

interface ConciergeMessagingProps {
  inquiryId: string;
  matchedFacilityIds?: string[];
}

/**
 * Seeker-facing messaging component for concierge placement cases.
 * 
 * BROKERAGE MODEL ENFORCEMENT:
 * Seekers can ONLY message their placement advisor.
 * All facility communication is coordinated through the advisor.
 * Direct seeker-to-facility messaging is prohibited.
 */
export function ConciergeMessaging({ inquiryId }: ConciergeMessagingProps) {
  const { userId: currentUserId } = useSeekerSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messageContent, setMessageContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    attachment,
    uploading,
    fileInputRef,
    handleFileSelect,
    uploadFile,
    clearAttachment,
    openFilePicker,
  } = useFileAttachment({ inquiryId });

  // Fetch advisor thread ONLY - no facility threads for seekers
  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ["concierge-advisor-thread", inquiryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_threads")
        .select("id, inquiry_id, thread_type, user_id, last_message_at, user_last_read_at, created_at")
        .eq("inquiry_id", inquiryId)
        .eq("thread_type", "advisor")
        .maybeSingle();

      if (error) throw error;
      return data as Thread | null;
    },
  });

  // Fetch messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["concierge-messages", thread?.id],
    queryFn: async () => {
      if (!thread?.id) return [];
      
      const { data, error } = await supabase
        .from("concierge_messages")
        .select("id, thread_id, sender_id, sender_type, content, created_at, attachment_url, attachment_name")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!thread?.id,
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark thread as read when seeker views messages
  useEffect(() => {
    if (!thread?.id || !messages || messages.length === 0) return;
    
    const markAsRead = async () => {
      await supabase
        .from("concierge_threads")
        .update({ user_last_read_at: new Date().toISOString() })
        .eq("id", thread.id);
    };
    
    markAsRead();
  }, [thread?.id, messages?.length]);

  // Realtime updates
  useEffect(() => {
    if (!thread?.id) return;

    const channel = supabase
      .channel(`messages-${thread.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "concierge_messages", filter: `thread_id=eq.${thread.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["concierge-messages", thread.id] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [thread?.id, queryClient]);

  // Create advisor thread
  const createThreadMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("concierge_threads")
        .insert({
          inquiry_id: inquiryId,
          thread_type: "advisor", // ONLY advisor threads
          user_id: currentUserId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concierge-advisor-thread", inquiryId] });
    },
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      let threadId = thread?.id;
      
      if (!threadId) {
        const newThread = await createThreadMutation.mutateAsync();
        threadId = newThread.id;
      }

      if (!threadId || (!messageContent.trim() && !attachment)) return;

      if (!currentUserId) throw new Error("Not authenticated");

      const trimmedContent = messageContent.trim();
      
      let attachmentData: { url: string; name: string } | null = null;
      if (attachment) {
        attachmentData = await uploadFile();
        if (!attachmentData && !trimmedContent) {
          throw new Error("Failed to upload attachment");
        }
      }

      const { error } = await supabase.from("concierge_messages").insert({
        thread_id: threadId,
        sender_id: currentUserId,
        sender_type: "seeker",
        content: trimmedContent || (attachmentData ? `Sent an attachment: ${attachmentData.name}` : ""),
        attachment_url: attachmentData?.url || null,
        attachment_name: attachmentData?.name || null,
      });

      if (error) throw error;

      await supabase
        .from("concierge_threads")
        .update({ 
          last_message_at: new Date().toISOString(),
          user_last_read_at: new Date().toISOString(),
        })
        .eq("id", threadId);

      try {
        await supabase.functions.invoke("send-message-notifications", {
          body: {
            notificationType: "message_to_advisor",
            threadId,
            messageContent: trimmedContent || `Sent an attachment: ${attachmentData?.name}`,
            senderType: "seeker",
          },
        });
      } catch {
        // Best-effort
      }
    },
    onSuccess: () => {
      setMessageContent("");
      clearAttachment();
      queryClient.invalidateQueries({ queryKey: ["concierge-messages", thread?.id] });
      queryClient.invalidateQueries({ queryKey: ["concierge-advisor-thread", inquiryId] });
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

  if (threadLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader className="border-b py-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <HeadphonesIcon className="h-5 w-5 text-primary" />
          Your Placement Advisor
        </CardTitle>
        <div className="flex items-start gap-2 mt-1 p-2 bg-muted/50 rounded-md">
          <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            All facility communication is coordinated through your dedicated advisor to ensure the best outcomes and protect your privacy.
          </p>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {messagesLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-16 w-3/4 ml-auto" />
          </div>
        ) : (!messages || messages.length === 0) ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="font-medium">Start a conversation</p>
            <p className="text-sm mt-1">
              Your advisor will coordinate calls, tours, and next steps with facilities on your behalf.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwn = message.sender_type === "seeker";
              return (
                <div
                  key={message.id}
                  className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}>
                      {isOwn ? <User className="h-4 w-4" /> : <HeadphonesIcon className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[70%] ${isOwn ? "text-right" : ""}`}>
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.attachment_url && message.attachment_name && (
                        <RefreshableAttachment 
                          url={message.attachment_url} 
                          name={message.attachment_name} 
                        />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
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
      <div className="p-4 border-t space-y-2">
        {attachment && (
          <MessageAttachment 
            url="" 
            name={attachment.name} 
            isPreview 
            onRemove={clearAttachment} 
          />
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessageMutation.mutate();
          }}
          className="flex gap-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={openFilePicker}
            disabled={sendMessageMutation.isPending || uploading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Message your advisor..."
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value.slice(0, 5000))}
            disabled={sendMessageMutation.isPending || uploading}
            maxLength={5000}
          />
          <Button
            type="submit"
            size="icon"
            disabled={(!messageContent.trim() && !attachment) || sendMessageMutation.isPending || uploading}
          >
            {sendMessageMutation.isPending || uploading ? (
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
