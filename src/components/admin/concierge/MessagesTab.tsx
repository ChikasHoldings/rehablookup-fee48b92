import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { MessageSquare, Send, ArrowLeft, Building2, User, Paperclip, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { MessageAttachment } from "@/components/shared/MessageAttachment";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface MessagesTabProps {
  caseData: ConciergeInquiry;
}

export function MessagesTab({ caseData }: MessagesTabProps) {
  const queryClient = useQueryClient();
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all threads for this case
  const { data: threads, isLoading: threadsLoading } = useQuery({
    queryKey: ["admin-case-threads", caseData.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_threads")
        .select(`
          *,
          facilities (id, name, logo_url)
        `)
        .eq("inquiry_id", caseData.id)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch messages for selected thread
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["admin-thread-messages", selectedThread?.id],
    queryFn: async () => {
      if (!selectedThread?.id) return [];
      const { data, error } = await supabase
        .from("concierge_messages")
        .select("*")
        .eq("thread_id", selectedThread.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedThread?.id,
  });

  // Note: Real-time subscription removed - admin is notified via email instead

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark as read
  useEffect(() => {
    if (selectedThread?.id) {
      supabase
        .from("concierge_threads")
        .update({ admin_last_read_at: new Date().toISOString() })
        .eq("id", selectedThread.id);
    }
  }, [selectedThread?.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB");
      return;
    }
    setAttachment(file);
  };

  const uploadFile = async (): Promise<{ url: string; name: string } | null> => {
    if (!attachment) return null;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const fileExt = attachment.name.split(".").pop();
      const fileName = `${user.id}/${caseData.id}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from("concierge-attachments").upload(fileName, attachment);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("concierge-attachments").getPublicUrl(fileName);
      return { url: publicUrl, name: attachment.name };
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!selectedThread?.id || !user) throw new Error("Missing data");
      
      // Upload attachment if present
      let attachmentData: { url: string; name: string } | null = null;
      if (attachment) {
        attachmentData = await uploadFile();
      }
      
      const { error } = await supabase.from("concierge_messages").insert({
        thread_id: selectedThread.id,
        sender_id: user.id,
        sender_type: "advisor",
        content: content || (attachmentData ? `Sent an attachment: ${attachmentData.name}` : ""),
        attachment_url: attachmentData?.url || null,
        attachment_name: attachmentData?.name || null,
      });
      
      if (error) throw error;

      // Update thread last_message_at and admin_last_read_at
      await supabase
        .from("concierge_threads")
        .update({ 
          last_message_at: new Date().toISOString(),
          admin_last_read_at: new Date().toISOString(),
        })
        .eq("id", selectedThread.id);

      // Send notification to seeker
      try {
        await supabase.functions.invoke("send-message-notifications", {
          body: {
            notificationType: "message_to_seeker",
            threadId: selectedThread.id,
            messageContent: content || `Sent an attachment: ${attachmentData?.name}`,
            senderType: "advisor",
          },
        });
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
      }
    },
    onSuccess: () => {
      setNewMessage("");
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["admin-thread-messages", selectedThread?.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-case-threads", caseData.id] });
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });

  const handleSend = () => {
    if (!newMessage.trim() && !attachment) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  if (threadsLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  // Thread list
  if (!selectedThread) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          View and participate in conversations for this case.
        </p>
        
        {threads && threads.length > 0 ? (
          <div className="space-y-2">
            {threads.map((thread: any) => (
              <div
                key={thread.id}
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedThread(thread)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {thread.thread_type === "advisor" ? (
                        <User className="h-5 w-5" />
                      ) : (
                        <Building2 className="h-5 w-5" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {thread.thread_type === "advisor" 
                          ? "Advisor Thread" 
                          : thread.facilities?.name || "Facility"}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {thread.thread_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {thread.last_message_at
                        ? format(new Date(thread.last_message_at), "MMM d, h:mm a")
                        : "No messages"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No message threads yet</p>
          </div>
        )}
      </div>
    );
  }

  // Thread view
  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex items-center gap-3 pb-3 border-b">
        <Button variant="ghost" size="icon" onClick={() => setSelectedThread(null)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <p className="font-medium">
            {selectedThread.thread_type === "advisor" 
              ? "Advisor Thread" 
              : selectedThread.facilities?.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {selectedThread.thread_type === "advisor" ? "Direct with seeker" : "Facility conversation"}
          </p>
        </div>
      </div>
      
      <ScrollArea className="flex-1 py-4">
        {messagesLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : messages && messages.length > 0 ? (
          <div className="space-y-3">
              {messages.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === "advisor" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      msg.sender_type === "advisor"
                        ? "bg-primary text-primary-foreground"
                        : msg.sender_type === "facility"
                        ? "bg-blue-100 dark:bg-blue-900/30"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-xs font-medium mb-1 opacity-70 capitalize">
                      {msg.sender_type}
                    </p>
                    <p className="text-sm">{msg.content}</p>
                    {msg.attachment_url && msg.attachment_name && (
                      <MessageAttachment url={msg.attachment_url} name={msg.attachment_name} />
                    )}
                    <p className="text-xs mt-1 opacity-60">
                      {format(new Date(msg.created_at), "h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No messages in this thread
            </div>
          )}
        </ScrollArea>
      
      <div className="flex gap-2 pt-3 border-t flex-col">
        {attachment && (
          <MessageAttachment 
            url="" 
            name={attachment.name} 
            isPreview 
            onRemove={() => {
              setAttachment(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }} 
          />
        )}
        <div className="flex gap-2">
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
            onClick={() => fileInputRef.current?.click()}
            disabled={sendMessageMutation.isPending || uploading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            placeholder="Send as advisor..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="min-h-[44px] max-h-[80px]"
          />
          <Button 
            onClick={handleSend} 
            disabled={(!newMessage.trim() && !attachment) || sendMessageMutation.isPending || uploading}
            size="icon"
          >
            {sendMessageMutation.isPending || uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
