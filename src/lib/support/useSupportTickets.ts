import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Client-side hooks + helpers for the in-app support ticket system.
 *
 * Backend (edge functions + RLS) is already deployed; this file only
 * calls those contracts. RLS scopes table reads (seeker → own; provider
 * → own + facility team; admin → all), so the SELECTs below intentionally
 * carry NO ownership filters — the database decides what rows return.
 *
 * `support_ticket_messages` and the `mark_support_ticket_read` RPC, plus
 * the newer `support_tickets` columns (facility_id, last_message_*,
 * *_last_read_at), aren't in the generated Supabase types yet, so we read
 * through a relaxed cast — mirroring the pattern in
 * src/components/provider/concierge/ConciergeIntroductionResponder.tsx.
 */

const ATTACHMENTS_BUCKET = "support-attachments";
export const MAX_FILES_PER_MESSAGE = 10;
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export type SupportPanel = "seeker" | "provider";

export type SupportTicketStatus =
  | "open"
  | "in_progress"
  | "waiting_on_admin"
  | "waiting_on_user"
  | "resolved"
  | "closed"
  // legacy statuses still present on older rows
  | "new";

export interface SupportAttachment {
  path: string;
  name: string;
  type: string;
  size: number;
}

export interface SupportTicketRow {
  id: string;
  source: "seeker_support" | "provider_support" | "public_contact";
  category: string;
  subject: string | null;
  message: string;
  status: SupportTicketStatus;
  priority: string;
  facility_id: string | null;
  sender_name: string | null;
  sender_email: string | null;
  sender_user_id: string | null;
  assigned_to: string | null;
  resolution_notes: string | null;
  last_message_at: string | null;
  last_message_role: "user" | "admin" | null;
  user_last_read_at: string | null;
  admin_last_read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportMessageRow {
  id: string;
  ticket_id: string;
  sender_user_id: string | null;
  sender_role: "user" | "admin";
  body: string;
  attachments: SupportAttachment[] | null;
  created_at: string;
}

// Relaxed view of the client for reads that aren't in the generated types.
const supabaseRelaxed = supabase as unknown as {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: unknown) => {
        order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown; error: unknown }>;
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
      };
      order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown; error: unknown }>;
    };
  };
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

const TICKET_COLUMNS =
  "id, source, category, subject, message, status, priority, facility_id, sender_name, sender_email, sender_user_id, assigned_to, resolution_notes, last_message_at, last_message_role, user_last_read_at, admin_last_read_at, created_at, updated_at";

const MESSAGE_COLUMNS =
  "id, ticket_id, sender_user_id, sender_role, body, attachments, created_at";

export const supportKeys = {
  list: (status?: string) => ["support-tickets", "list", status ?? "all"] as const,
  ticket: (id: string) => ["support-tickets", "ticket", id] as const,
  messages: (id: string) => ["support-tickets", "messages", id] as const,
};

/** Build the canonical storage path for a ticket attachment. */
function attachmentPath(ticketId: string, fileName: string): string {
  const safeName = fileName.replace(/[^\w.-]+/g, "_").slice(0, 120) || "file";
  return `${ticketId}/${crypto.randomUUID()}/${safeName}`;
}

/** Validate a File[] against the per-message limits. Returns an error string or null. */
export function validateAttachments(files: File[]): string | null {
  if (files.length > MAX_FILES_PER_MESSAGE) {
    return `You can attach up to ${MAX_FILES_PER_MESSAGE} files per message.`;
  }
  const tooBig = files.find((f) => f.size > MAX_FILE_SIZE_BYTES);
  if (tooBig) {
    return `"${tooBig.name}" is larger than 15 MB. Please attach a smaller file.`;
  }
  return null;
}

/** Upload File[] to the private bucket and return the metadata to send to the edge fn. */
async function uploadAttachments(ticketId: string, files: File[]): Promise<SupportAttachment[]> {
  const uploaded: SupportAttachment[] = [];
  for (const file of files) {
    const path = attachmentPath(ticketId, file.name);
    const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, file);
    if (error) {
      throw new Error(`Couldn't upload "${file.name}". Please try again.`);
    }
    uploaded.push({
      path,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
    });
  }
  return uploaded;
}

/**
 * List the current user's tickets. RLS scopes rows; `scope` is accepted for
 * cache-key clarity / call-site readability but does not add a filter.
 */
export function useSupportTickets(
  scope: SupportPanel | "all" = "all",
  options?: { status?: string; enabled?: boolean },
) {
  const status = options?.status;
  return useQuery({
    queryKey: [...supportKeys.list(status), scope],
    queryFn: async (): Promise<SupportTicketRow[]> => {
      const builder = supabaseRelaxed.from("support_tickets").select(TICKET_COLUMNS);
      const { data, error } = status && status !== "all"
        ? await builder.eq("status", status).order("last_message_at", { ascending: false })
        : await builder.order("last_message_at", { ascending: false });
      if (error) throw error;
      const rows = (data as SupportTicketRow[]) ?? [];
      // last_message_at can be null on freshly-created rows; keep newest first
      // using created_at as the tiebreaker.
      return [...rows].sort((a, b) => {
        const av = a.last_message_at || a.created_at;
        const bv = b.last_message_at || b.created_at;
        return bv.localeCompare(av);
      });
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 15,
  });
}

export function useSupportTicket(ticketId: string | null | undefined) {
  return useQuery({
    queryKey: supportKeys.ticket(ticketId ?? ""),
    queryFn: async (): Promise<SupportTicketRow | null> => {
      const { data, error } = await supabaseRelaxed
        .from("support_tickets")
        .select(TICKET_COLUMNS)
        .eq("id", ticketId)
        .maybeSingle();
      if (error) throw error;
      return (data as SupportTicketRow) ?? null;
    },
    enabled: !!ticketId,
    staleTime: 1000 * 15,
  });
}

export function useSupportMessages(ticketId: string | null | undefined) {
  return useQuery({
    queryKey: supportKeys.messages(ticketId ?? ""),
    queryFn: async (): Promise<SupportMessageRow[]> => {
      const { data, error } = await supabaseRelaxed
        .from("support_ticket_messages")
        .select(MESSAGE_COLUMNS)
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as SupportMessageRow[]) ?? [];
    },
    enabled: !!ticketId,
    staleTime: 1000 * 10,
  });
}

export interface CreateSupportTicketInput {
  panel: SupportPanel;
  category: string;
  subject?: string;
  message: string;
  facilityId?: string | null;
  files?: File[];
  senderName?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  context?: Record<string, unknown>;
}

/**
 * Create a ticket. Generates the ticketId client-side FIRST so attachments
 * can be uploaded to `${ticketId}/...` before the row exists, then calls the
 * edge function with the resulting attachment metadata. Throws on any
 * upload/edge failure so the caller can keep the draft and show an error.
 */
export function useCreateSupportTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSupportTicketInput): Promise<string> => {
      if (input.panel === "provider" && !input.facilityId) {
        throw new Error("Please select a facility before submitting.");
      }
      const files = input.files ?? [];
      const validationError = validateAttachments(files);
      if (validationError) throw new Error(validationError);

      const ticketId = crypto.randomUUID();
      const attachments = files.length > 0 ? await uploadAttachments(ticketId, files) : [];

      const { data, error } = await supabase.functions.invoke("support-ticket-create", {
        body: {
          ticketId,
          panel: input.panel,
          category: input.category,
          subject: input.subject,
          message: input.message,
          facilityId: input.facilityId ?? undefined,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          context: input.context,
          attachments: attachments.length > 0 ? attachments : undefined,
          senderName: input.senderName,
        },
      });
      if (error) throw new Error(error.message || "Couldn't submit your request. Please try again.");
      if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Couldn't submit your request.");
      return (data?.ticketId as string) || ticketId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets", "list"] });
    },
  });
}

export interface SupportReplyInput {
  ticketId: string;
  body: string;
  files?: File[];
}

/**
 * Reply to a ticket (owner/team OR admin — the server resolves sender role).
 * A user replying to a resolved/closed ticket auto-reopens it server-side.
 */
export function useSupportReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SupportReplyInput) => {
      const files = input.files ?? [];
      const validationError = validateAttachments(files);
      if (validationError) throw new Error(validationError);

      const attachments = files.length > 0 ? await uploadAttachments(input.ticketId, files) : [];

      const { data, error } = await supabase.functions.invoke("support-ticket-reply", {
        body: {
          ticketId: input.ticketId,
          body: input.body,
          attachments: attachments.length > 0 ? attachments : undefined,
        },
      });
      if (error) throw new Error(error.message || "Couldn't send your reply. Please try again.");
      if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Couldn't send your reply.");
      return data as { success: boolean; messageId: string; status: string; reopened: boolean };
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: supportKeys.messages(input.ticketId) });
      queryClient.invalidateQueries({ queryKey: supportKeys.ticket(input.ticketId) });
      queryClient.invalidateQueries({ queryKey: ["support-tickets", "list"] });
    },
  });
}

/** Mark a ticket read for the calling user/admin (RPC decides which side). */
export function useMarkSupportRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabaseRelaxed.rpc("mark_support_ticket_read", { p_ticket_id: ticketId });
      if (error) throw error;
    },
    onSuccess: (_data, ticketId) => {
      queryClient.invalidateQueries({ queryKey: supportKeys.ticket(ticketId) });
      queryClient.invalidateQueries({ queryKey: ["support-tickets", "list"] });
    },
  });
}

export interface AdminSupportStatusInput {
  ticketId: string;
  status?: SupportTicketStatus;
  priority?: string;
  category?: string;
  assignedTo?: string | null;
  resolutionNotes?: string;
}

/** ADMIN only — update status/priority/category/assignment/resolution via the edge fn. */
export function useAdminSupportStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminSupportStatusInput) => {
      const { data, error } = await supabase.functions.invoke("support-ticket-status", {
        body: {
          ticketId: input.ticketId,
          status: input.status,
          priority: input.priority,
          category: input.category,
          assignedTo: input.assignedTo,
          resolutionNotes: input.resolutionNotes,
        },
      });
      if (error) throw new Error(error.message || "Couldn't update the ticket. Please try again.");
      if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Couldn't update the ticket.");
      return data as { success: boolean; status: string };
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: supportKeys.ticket(input.ticketId) });
      queryClient.invalidateQueries({ queryKey: ["support-tickets", "list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
  });
}

/**
 * Lazily resolve a signed URL for a private attachment path. URLs are valid
 * for 1 hour; the hook re-signs whenever the path changes.
 */
export function useSignedAttachmentUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl(null);
      return;
    }
    setLoading(true);
    setError(null);
    supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrl(path, 3600)
      .then(({ data, error: signErr }) => {
        if (cancelled) return;
        if (signErr || !data?.signedUrl) {
          setError("Couldn't load attachment");
          setUrl(null);
        } else {
          setUrl(data.signedUrl);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return { url, loading, error };
}

/** True when there's an unread admin reply for the user side of this ticket. */
export function hasUnreadForUser(ticket: Pick<SupportTicketRow, "last_message_role" | "last_message_at" | "user_last_read_at">): boolean {
  if (ticket.last_message_role !== "admin" || !ticket.last_message_at) return false;
  if (!ticket.user_last_read_at) return true;
  return new Date(ticket.last_message_at).getTime() > new Date(ticket.user_last_read_at).getTime();
}
