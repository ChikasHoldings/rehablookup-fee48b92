import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { MessageSquare, Send, ArrowLeft, Building2, User, Paperclip, Loader2, Plus, ShieldCheck, HeadphonesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");
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

  // Fetch matched/introduced facilities for creating facility threads
  const matchedIds = [...new Set([...(caseData.matched_facility_ids || []), ...(caseData.admin_matched_facility_ids || [])])];
  const { data: matchedFacilities } = useQuery({
    queryKey: ["case-matched-facilities", caseData.id, matchedIds],
    queryFn: async () => {
      if (!matchedIds.length) return [];
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name")
        .in("id", matchedIds);
      if (error) throw error;
      return data || [];
    },
    enabled: matchedIds.length > 0,
  });

  // Fetch messages for selected thread
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["admin-thread-messages", selectedThread?.id],
    queryFn: async () => {
      if (!selectedThread?.id) return [];
      const { data, error } = await supabase
        .from("concierge_messages")
        .select("id, thread_id, sender_id, sender_type, content, attachment_url, attachment_name, read_at, created_at")
        .eq("thread_id", selectedThread.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedThread?.id,
  });

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
        .eq("id", selectedThread.id)
        .then(({ error }) => {
          if (error) console.error("[MessagesTab] Mark-as-read error:", error.message);
        });
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
      const { data: signedData, error: signedError } = await supabase.storage
        .from("concierge-attachments")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365);
      if (signedError || !signedData?.signedUrl) {
        throw new Error("Failed to generate signed URL");
      }
      return { url: signedData.signedUrl, name: attachment.name };
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Create facility coordination thread - ADVISOR ONLY action
  const createFacilityThreadMutation = useMutation({
    mutationFn: async (facilityId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if thread already exists for this facility
      const { data: existing } = await supabase
        .from("concierge_threads")
        .select("id")
        .eq("inquiry_id", caseData.id)
        .eq("facility_id", facilityId)
        .eq("thread_type", "facility")
        .maybeSingle();

      if (existing) {
        throw new Error("A coordination thread already exists for this facility");
      }

      const { data, error } = await supabase
        .from("concierge_threads")
        .insert({
          inquiry_id: caseData.id,
          thread_type: "facility",
          facility_id: facilityId,
          user_id: caseData.user_id || user.id,
        })
        .select(`*, facilities (id, name, logo_url)`)
        .single();

      if (error) throw error;

      // Log the event
      await supabase.from("concierge_case_events").insert({
        inquiry_id: caseData.id,
        event_type: "facility_thread_created",
        event_data: { facility_id: facilityId },
        actor_id: user.id,
        actor_type: "admin",
      });

      return data;
    },
    onSuccess: (data) => {
      toast.success("Facility coordination thread created");
      queryClient.invalidateQueries({ queryKey: ["admin-case-threads", caseData.id] });
      setShowCreateThread(false);
      setSelectedFacilityId("");
      setSelectedThread(data);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create thread");
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!selectedThread?.id || !user) throw new Error("Missing data");
      
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

      await supabase
        .from("concierge_threads")
        .update({ 
          last_message_at: new Date().toISOString(),
          admin_last_read_at: new Date().toISOString(),
        })
        .eq("id", selectedThread.id);

      // Send notification based on thread type
      const notificationType = selectedThread.thread_type === "advisor" 
        ? "message_to_seeker" 
        : "message_to_facility";

      try {
        await supabase.functions.invoke("send-message-notifications", {
          body: {
            notificationType,
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

  // Determine which facilities don't have threads yet
  const existingFacilityThreadIds = new Set(
    threads?.filter((t: any) => t.thread_type === "facility").map((t: any) => t.facility_id) || []
  );
  const availableFacilities = matchedFacilities?.filter(f => !existingFacilityThreadIds.has(f.id)) || [];

  if (threadsLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  // Thread list
  if (!selectedThread) {
    return (
      <div className="space-y-4">
        {/* Brokerage model notice */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-400">Advisor Coordination Hub</p>
              <p className="text-blue-700 dark:text-blue-500 text-xs mt-1">
                You are the sole communication bridge between seekers and facilities. Seekers cannot message facilities directly — all coordination flows through you.
              </p>
            </div>
          </div>
        </div>

        {/* Thread actions */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Conversation Threads</h3>
          {availableFacilities.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5 text-xs"
              onClick={() => setShowCreateThread(!showCreateThread)}
            >
              <Plus className="h-3.5 w-3.5" />
              New Facility Thread
            </Button>
          )}
        </div>

        {/* Create facility thread */}
        {showCreateThread && availableFacilities.length > 0 && (
          <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
            <p className="text-sm font-medium">Start Facility Coordination</p>
            <p className="text-xs text-muted-foreground">
              Create a private thread to coordinate with a matched facility on behalf of the seeker.
            </p>
            <div className="flex items-center gap-2">
              <Select value={selectedFacilityId} onValueChange={setSelectedFacilityId}>
                <SelectTrigger className="flex-1 h-9">
                  <SelectValue placeholder="Select facility..." />
                </SelectTrigger>
                <SelectContent>
                  {availableFacilities.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {f.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!selectedFacilityId || createFacilityThreadMutation.isPending}
                onClick={() => createFacilityThreadMutation.mutate(selectedFacilityId)}
              >
                {createFacilityThreadMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </div>
        )}
        
        {threads && threads.length > 0 ? (
          <div className="space-y-2">
            {threads.map((thread: any) => {
              const isAdvisorThread = thread.thread_type === "advisor";
              const hasUnread = thread.last_message_at && thread.admin_last_read_at
                ? new Date(thread.last_message_at) > new Date(thread.admin_last_read_at)
                : thread.last_message_at && !thread.admin_last_read_at;
              
              return (
                <div
                  key={thread.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    hasUnread 
                      ? "bg-primary/5 border-primary/20 hover:bg-primary/10" 
                      : "bg-card hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedThread(thread)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={isAdvisorThread ? "bg-primary/10" : "bg-blue-100 dark:bg-blue-900/30"}>
                        {isAdvisorThread ? (
                          <User className="h-5 w-5 text-primary" />
                        ) : (
                          <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {isAdvisorThread 
                            ? `Seeker: ${caseData.user_name}` 
                            : thread.facilities?.name || "Facility"}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] shrink-0 ${
                            isAdvisorThread 
                              ? "bg-primary/10 text-primary border-primary/30" 
                              : "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                          }`}
                        >
                          {isAdvisorThread ? "Seeker" : "Facility"}
                        </Badge>
                        {hasUnread && (
                          <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {thread.last_message_at
                          ? format(new Date(thread.last_message_at), "MMM d, h:mm a")
                          : "No messages"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No message threads yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              The seeker will start a conversation when ready, or you can create a facility coordination thread.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Thread view
  const isAdvisorThread = selectedThread.thread_type === "advisor";
  
  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex items-center gap-3 pb-3 border-b">
        <Button variant="ghost" size="icon" onClick={() => setSelectedThread(null)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">
              {isAdvisorThread 
                ? `Seeker: ${caseData.user_name}` 
                : selectedThread.facilities?.name}
            </p>
            <Badge 
              variant="outline" 
              className={`text-[10px] shrink-0 ${
                isAdvisorThread 
                  ? "bg-primary/10 text-primary border-primary/30" 
                  : "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
              }`}
            >
              {isAdvisorThread ? "Seeker" : "Facility"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {isAdvisorThread 
              ? "Direct conversation with seeker" 
              : "Private facility coordination — seeker cannot see this"}
          </p>
        </div>
      </div>
      
      {/* Privacy notice for facility threads */}
      {!isAdvisorThread && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            This is a private coordination thread. The seeker cannot see these messages.
          </p>
        </div>
      )}

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
                    <p className="text-xs font-medium mb-1 opacity-70 flex items-center gap-1">
                      {msg.sender_type === "advisor" && <HeadphonesIcon className="h-3 w-3" />}
                      {msg.sender_type === "seeker" && <User className="h-3 w-3" />}
                      {msg.sender_type === "facility" && <Building2 className="h-3 w-3" />}
                      {msg.sender_type === "advisor" ? "You (Advisor)" : msg.sender_type === "seeker" ? "Seeker" : "Facility"}
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
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No messages in this thread</p>
              <p className="text-xs mt-1">
                {isAdvisorThread 
                  ? "Send a message to the seeker" 
                  : "Start coordinating with this facility"}
              </p>
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
            placeholder={isAdvisorThread ? "Message seeker as advisor..." : "Coordinate with facility..."}
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
