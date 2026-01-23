import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { format } from "date-fns";
import { MessageSquare, Send, User, ArrowLeft, Paperclip, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { MessageAttachment } from "@/components/shared/MessageAttachment";

export function ConciergeMessages() {
  const { selectedFacility } = useSelectedFacility();
  const queryClient = useQueryClient();
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch threads for this facility
  const { data: threads, isLoading: threadsLoading } = useQuery({
    queryKey: ["provider-concierge-threads", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data, error } = await supabase
        .from("concierge_threads")
        .select(`
          *,
          concierge_inquiries (
            id, user_name, status
          )
        `)
        .eq("facility_id", selectedFacility.id)
        .eq("thread_type", "facility")
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedFacility?.id,
  });

  // Fetch messages for selected thread
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["provider-thread-messages", selectedThread?.id],
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

  // Note: Real-time subscription removed - users are notified via email/SMS instead

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark thread as read when opened
  useEffect(() => {
    if (selectedThread?.id) {
      supabase
        .from("concierge_threads")
        .update({ facility_last_read_at: new Date().toISOString() })
        .eq("id", selectedThread.id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["provider-concierge-threads"] });
        });
    }
  }, [selectedThread?.id, queryClient]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB");
      return;
    }
    setAttachment(file);
  };

  const uploadFile = async (inquiryId: string): Promise<{ url: string; name: string } | null> => {
    if (!attachment) return null;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const fileExt = attachment.name.split(".").pop();
      const fileName = `${user.id}/${inquiryId}/${Date.now()}.${fileExt}`;
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
        attachmentData = await uploadFile(selectedThread.inquiry_id);
      }
      
      const { error } = await supabase.from("concierge_messages").insert({
        thread_id: selectedThread.id,
        sender_id: user.id,
        sender_type: "facility",
        content: content || (attachmentData ? `Sent an attachment: ${attachmentData.name}` : ""),
        attachment_url: attachmentData?.url || null,
        attachment_name: attachmentData?.name || null,
      });
      
      if (error) throw error;

      // Update thread last_message_at and facility_last_read_at
      await supabase
        .from("concierge_threads")
        .update({ 
          last_message_at: new Date().toISOString(),
          facility_last_read_at: new Date().toISOString(),
        })
        .eq("id", selectedThread.id);

      // Send notification to seeker
      try {
        await supabase.functions.invoke("send-message-notifications", {
          body: {
            notificationType: "message_to_seeker",
            threadId: selectedThread.id,
            messageContent: content || `Sent an attachment: ${attachmentData?.name}`,
            senderType: "facility",
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
      queryClient.invalidateQueries({ queryKey: ["provider-thread-messages", selectedThread?.id] });
      queryClient.invalidateQueries({ queryKey: ["provider-concierge-threads"] });
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });

  const handleSend = () => {
    if (!newMessage.trim() && !attachment) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  // Check for unread messages - compare timestamps
  const hasUnreadMessages = (thread: any): boolean => {
    if (!thread.last_message_at) return false;
    if (!thread.facility_last_read_at) return true;
    return new Date(thread.last_message_at) > new Date(thread.facility_last_read_at);
  };

  if (threadsLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading messages...</div>;
  }

  // Thread list view
  if (!selectedThread) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          {threads && threads.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {threads.map((thread: any) => (
                  <div
                    key={thread.id}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedThread(thread)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {thread.concierge_inquiries?.user_name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{thread.concierge_inquiries?.user_name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">
                            {thread.last_message_at
                              ? format(new Date(thread.last_message_at), "MMM d, h:mm a")
                              : "No messages yet"}
                          </p>
                        </div>
                      </div>
                      {hasUnreadMessages(thread) && (
                        <Badge variant="destructive" className="h-5 min-w-5 px-1.5 flex items-center justify-center text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No message threads yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Messages from matched seekers will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Message thread view
  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader className="flex-shrink-0 pb-3 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedThread(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle className="text-lg">{selectedThread.concierge_inquiries?.user_name}</CardTitle>
            <p className="text-sm text-muted-foreground">Concierge Case</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4">
          {messagesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === "facility" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.sender_type === "facility"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    {msg.attachment_url && msg.attachment_name && (
                      <MessageAttachment url={msg.attachment_url} name={msg.attachment_name} />
                    )}
                    <p className={`text-xs mt-1 ${
                      msg.sender_type === "facility" ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}>
                      {format(new Date(msg.created_at), "h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          )}
        </ScrollArea>
      </CardContent>
      
      <div className="flex-shrink-0 p-4 border-t space-y-2">
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
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="min-h-[44px] max-h-[120px]"
          />
          <Button 
            onClick={handleSend} 
            disabled={(!newMessage.trim() && !attachment) || sendMessageMutation.isPending || uploading}
            size="icon"
            className="shrink-0"
          >
            {sendMessageMutation.isPending || uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
