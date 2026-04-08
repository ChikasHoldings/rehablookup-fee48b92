import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { format, formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MessageAttachment } from "@/components/shared/MessageAttachment";
import {
  MessageSquare,
  Send,
  ArrowLeft,
  User,
  Building2,
  Search,
  Inbox,
  Clock,
  ChevronRight,
  Paperclip,
  Loader2,
  ShieldCheck,
} from "lucide-react";

type ThreadFilter = "all" | "seeker" | "facility" | "unread";

export default function AdvisorInbox() {
  const { user } = useAdminAuth();
  const queryClient = useQueryClient();
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [threadFilter, setThreadFilter] = useState<ThreadFilter>("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all threads across advisor's assigned cases
  const { data: threads, isLoading: threadsLoading } = useQuery({
    queryKey: ["advisor-inbox-threads", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all inquiry IDs assigned to this advisor
      const { data: inquiries, error: inqErr } = await supabase
        .from("concierge_inquiries")
        .select("id, user_name, status")
        .eq("assigned_advisor_id", user.id)
        .not("status", "eq", "closed");

      if (inqErr) throw inqErr;
      if (!inquiries || inquiries.length === 0) return [];

      const inquiryIds = inquiries.map(i => i.id);
      const inquiryMap = Object.fromEntries(inquiries.map(i => [i.id, i]));

      // Fetch threads for all those inquiries
      const { data: threadData, error: threadErr } = await supabase
        .from("concierge_threads")
        .select(`
          id, inquiry_id, thread_type, last_message_at, 
          admin_last_read_at, user_last_read_at, facility_last_read_at,
          facility_id,
          facilities (id, name, logo_url)
        `)
        .in("inquiry_id", inquiryIds)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (threadErr) throw threadErr;

      // Enrich threads with case info
      return (threadData || []).map(t => ({
        ...t,
        caseName: inquiryMap[t.inquiry_id]?.user_name || "Unknown",
        caseStatus: inquiryMap[t.inquiry_id]?.status || "unknown",
        hasUnread: t.last_message_at && (!t.admin_last_read_at || new Date(t.last_message_at) > new Date(t.admin_last_read_at)),
      }));
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Poll every 30s
  });

  // Fetch messages for selected thread
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["advisor-thread-messages", selectedThread?.id],
    queryFn: async () => {
      if (!selectedThread?.id) return [];
      const { data, error } = await supabase
        .from("concierge_messages")
        .select("id, content, sender_id, sender_type, created_at, attachment_url, attachment_name")
        .eq("thread_id", selectedThread.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedThread?.id,
  });

  // Mark thread as read when selected
  useEffect(() => {
    if (selectedThread?.id && selectedThread.hasUnread) {
      supabase
        .from("concierge_threads")
        .update({ admin_last_read_at: new Date().toISOString() })
        .eq("id", selectedThread.id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["advisor-inbox-threads"] });
        });
    }
  }, [selectedThread?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedThread || !user?.id || (!newMessage.trim() && !attachment)) return;

      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;

      if (attachment) {
        setUploading(true);
        const ext = attachment.name.split(".").pop();
        const filePath = `${selectedThread.inquiry_id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("concierge-attachments")
          .upload(filePath, attachment);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage
          .from("concierge-attachments")
          .getPublicUrl(filePath);
        attachmentUrl = urlData.publicUrl;
        attachmentName = attachment.name;
        setUploading(false);
      }

      const { error } = await supabase.from("concierge_messages").insert({
        thread_id: selectedThread.id,
        sender_id: user.id,
        sender_type: "admin",
        content: newMessage.trim() || `[Attachment: ${attachmentName}]`,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
      });
      if (error) throw error;

      // Update thread last_message_at
      await supabase
        .from("concierge_threads")
        .update({
          last_message_at: new Date().toISOString(),
          admin_last_read_at: new Date().toISOString(),
        })
        .eq("id", selectedThread.id);
    },
    onSuccess: () => {
      setNewMessage("");
      setAttachment(null);
      queryClient.invalidateQueries({ queryKey: ["advisor-thread-messages", selectedThread?.id] });
      queryClient.invalidateQueries({ queryKey: ["advisor-inbox-threads"] });
    },
    onError: (err) => {
      toast.error("Failed to send message: " + (err as Error).message);
      setUploading(false);
    },
  });

  // Filter threads
  const filteredThreads = threads?.filter(t => {
    if (threadFilter === "seeker" && t.thread_type !== "advisor") return false;
    if (threadFilter === "facility" && t.thread_type !== "facility") return false;
    if (threadFilter === "unread" && !t.hasUnread) return false;
    if (searchInput) {
      const q = searchInput.toLowerCase();
      return (
        t.caseName?.toLowerCase().includes(q) ||
        t.facilities?.name?.toLowerCase().includes(q)
      );
    }
    return true;
  }) || [];

  const unreadCount = threads?.filter(t => t.hasUnread).length || 0;

  // Thread list view
  if (!selectedThread) {
    return (
      <div className="space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Inbox className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight truncate">Advisor Inbox</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Coordinate admissions with seekers and providers
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Badge variant="default" className="self-start sm:self-auto">
              {unreadCount} unread
            </Badge>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={threadFilter} onValueChange={(v) => setThreadFilter(v as ThreadFilter)}>
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs px-2.5">All</TabsTrigger>
              <TabsTrigger value="seeker" className="text-xs px-2.5">Seekers</TabsTrigger>
              <TabsTrigger value="facility" className="text-xs px-2.5">Facilities</TabsTrigger>
              <TabsTrigger value="unread" className="text-xs px-2.5">
                Unread
                {unreadCount > 0 && (
                  <span className="ml-1 text-[10px] bg-destructive text-destructive-foreground rounded-full px-1.5">{unreadCount}</span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Thread List */}
        <Card>
          <CardContent className="p-0">
            {threadsLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No conversations</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {threadFilter === "unread" 
                    ? "All caught up! No unread messages." 
                    : threads?.length === 0 
                      ? "Messages will appear here when cases are assigned to you"
                      : "No conversations match your search"}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredThreads.map((thread) => {
                  const isSeeker = thread.thread_type === "advisor";
                  return (
                    <button
                      key={thread.id}
                      onClick={() => setSelectedThread(thread)}
                      className="flex items-center gap-3 p-4 w-full text-left hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className={isSeeker ? "bg-primary/10" : "bg-blue-100"}>
                          {isSeeker ? (
                            <User className="h-5 w-5 text-primary" />
                          ) : (
                            <Building2 className="h-5 w-5 text-blue-600" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {isSeeker ? thread.caseName : (thread.facilities?.name || "Facility")}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-[10px] shrink-0 ${
                              isSeeker
                                ? "bg-primary/10 text-primary border-primary/30"
                                : "bg-blue-50 text-blue-600 border-blue-200"
                            }`}
                          >
                            {isSeeker ? "Seeker" : "Facility"}
                          </Badge>
                          {thread.hasUnread && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          Case: {thread.caseName} • {thread.caseStatus}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {thread.last_message_at && (
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Message view
  const isSeeker = selectedThread.thread_type === "advisor";

  return (
    <div className="space-y-4">
      {/* Thread Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setSelectedThread(null)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-9 w-9">
          <AvatarFallback className={isSeeker ? "bg-primary/10" : "bg-blue-100"}>
            {isSeeker ? <User className="h-4 w-4 text-primary" /> : <Building2 className="h-4 w-4 text-blue-600" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">
              {isSeeker ? selectedThread.caseName : (selectedThread.facilities?.name || "Facility")}
            </p>
            <Badge
              variant="outline"
              className={`text-[10px] shrink-0 ${
                isSeeker
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-blue-50 text-blue-600 border-blue-200"
              }`}
            >
              {isSeeker ? "Seeker" : "Facility"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {isSeeker
              ? "Direct conversation with seeker"
              : "Private facility coordination — seeker cannot see this"}
          </p>
        </div>
      </div>

      {/* Privacy notice for facility threads */}
      {!isSeeker && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>This is a private thread. The seeker cannot see these messages.</span>
        </div>
      )}

      {/* Messages */}
      <Card className="overflow-hidden">
        <ScrollArea className="h-[calc(100vh-22rem)]">
          <div className="p-4 space-y-4">
            {messagesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-3/4" />
                ))}
              </div>
            ) : messages && messages.length > 0 ? (
              messages.map((msg: any) => {
                const isAdmin = msg.sender_type === "admin";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                        isAdmin
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {msg.attachment_url && (
                        <div className="mt-2">
                          <MessageAttachment url={msg.attachment_url} name={msg.attachment_name} />
                        </div>
                      )}
                      <p className={`text-[10px] mt-1 ${isAdmin ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {msg.sender_type === "admin" ? "You" : msg.sender_type === "user" ? "Seeker" : "Facility"} • {format(new Date(msg.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No messages yet. Start the conversation.</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Compose */}
        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                rows={2}
                className="resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (newMessage.trim() || attachment) sendMessageMutation.mutate();
                  }
                }}
              />
              {attachment && (
                <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                  <Paperclip className="h-3 w-3" />
                  <span className="truncate">{attachment.name}</span>
                  <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs" onClick={() => setAttachment(null)}>
                    ✕
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-1.5 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) setAttachment(e.target.files[0]);
                }}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                className="h-9 w-9"
                disabled={sendMessageMutation.isPending || uploading || (!newMessage.trim() && !attachment)}
                onClick={() => sendMessageMutation.mutate()}
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
      </Card>
    </div>
  );
}
