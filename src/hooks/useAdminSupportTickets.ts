import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SupportTicket {
  id: string;
  source: "public_contact" | "provider_support" | "seeker_support";
  sender_name: string;
  sender_email: string;
  sender_user_id: string | null;
  category: string;
  subject: string | null;
  message: string;
  status: "new" | "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  assigned_to: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  assigned_admin?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface SupportTicketNote {
  id: string;
  ticket_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface SupportTicketFilters {
  status?: string;
  source?: string;
  assignedTo?: string;
  search?: string;
}

export function useAdminSupportTickets(filters: SupportTicketFilters = {}) {
  return useQuery({
    queryKey: ["admin-support-tickets", filters],
    queryFn: async () => {
      let query = supabase
        .from("support_tickets")
        .select("id, sender_name, sender_email, sender_user_id, subject, message, category, priority, status, source, assigned_to, assigned_by, assigned_at, resolved_by, resolved_at, resolution_notes, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.source && filters.source !== "all") {
        query = query.eq("source", filters.source);
      }

      if (filters.assignedTo) {
        if (filters.assignedTo === "unassigned") {
          query = query.is("assigned_to", null);
        } else {
          query = query.eq("assigned_to", filters.assignedTo);
        }
      }

      if (filters.search) {
        query = query.or(
          `sender_name.ilike.%${filters.search}%,sender_email.ilike.%${filters.search}%,message.ilike.%${filters.search}%`
        );
      }

      const { data: tickets, error } = await query;

      if (error) throw error;
      
      // Fetch admin profiles for assigned tickets
      const assignedUserIds = tickets
        ?.filter((t) => t.assigned_to)
        .map((t) => t.assigned_to) || [];
      
      let adminProfiles: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      
      if (assignedUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("admin_user_profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", assignedUserIds);
        
        if (profiles) {
          adminProfiles = profiles.reduce((acc, p) => {
            acc[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
            return acc;
          }, {} as Record<string, { display_name: string | null; avatar_url: string | null }>);
        }
      }
      
      // Map admin info to tickets
      return (tickets || []).map((ticket) => ({
        ...ticket,
        assigned_admin: ticket.assigned_to ? adminProfiles[ticket.assigned_to] || null : null,
      })) as SupportTicket[];
    },
  });
}

export function useSupportTicketNotes(ticketId: string) {
  return useQuery({
    queryKey: ["support-ticket-notes", ticketId],
    queryFn: async () => {
      const { data: notes, error } = await supabase
        .from("support_ticket_notes")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Fetch author profiles
      const authorIds = notes?.map((n) => n.author_id) || [];
      let authorProfiles: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("admin_user_profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", authorIds);
        
        if (profiles) {
          authorProfiles = profiles.reduce((acc, p) => {
            acc[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
            return acc;
          }, {} as Record<string, { display_name: string | null; avatar_url: string | null }>);
        }
      }
      
      return (notes || []).map((note) => ({
        ...note,
        author: authorProfiles[note.author_id] || null,
      })) as SupportTicketNote[];
    },
    enabled: !!ticketId,
  });
}

export function useUpdateSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      updates,
      currentUserId,
    }: {
      ticketId: string;
      updates: Partial<SupportTicket>;
      currentUserId: string;
    }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", ticketId);

      if (error) throw error;

      // Log to audit
      await supabase.from("admin_audit_log").insert({
        admin_user_id: currentUserId,
        action_type: "support_ticket_updated",
        target_type: "support_ticket",
        target_id: ticketId,
        details: { updates },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      toast.success("Ticket updated");
    },
    onError: (error) => {
      console.error("Failed to update ticket:", error);
      toast.error("Failed to update ticket");
    },
  });
}

export function useAssignSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      assigneeId,
      currentUserId,
    }: {
      ticketId: string;
      assigneeId: string | null;
      currentUserId: string;
    }) => {
      const updates: Partial<SupportTicket> = {
        assigned_to: assigneeId,
        assigned_at: assigneeId ? new Date().toISOString() : null,
        assigned_by: assigneeId ? currentUserId : null,
      };

      // Auto-change status from 'new' to 'open' when assigned
      if (assigneeId) {
        const { data: currentTicket } = await supabase
          .from("support_tickets")
          .select("status")
          .eq("id", ticketId)
          .single();

        if (currentTicket?.status === "new") {
          updates.status = "open";
        }
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", ticketId);

      if (error) throw error;

      // Log to audit
      await supabase.from("admin_audit_log").insert({
        admin_user_id: currentUserId,
        action_type: "support_ticket_assigned",
        target_type: "support_ticket",
        target_id: ticketId,
        details: { assignee_id: assigneeId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      toast.success("Ticket assigned");
    },
    onError: (error) => {
      console.error("Failed to assign ticket:", error);
      toast.error("Failed to assign ticket");
    },
  });
}

export function useAddSupportTicketNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      content,
      authorId,
    }: {
      ticketId: string;
      content: string;
      authorId: string;
    }) => {
      const { error } = await supabase.from("support_ticket_notes").insert({
        ticket_id: ticketId,
        author_id: authorId,
        content,
      });

      if (error) throw error;
    },
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({
        queryKey: ["support-ticket-notes", ticketId],
      });
      toast.success("Note added");
    },
    onError: (error) => {
      console.error("Failed to add note:", error);
      toast.error("Failed to add note");
    },
  });
}

export function useResolveSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      resolutionNotes,
      currentUserId,
    }: {
      ticketId: string;
      resolutionNotes?: string;
      currentUserId: string;
    }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolved_by: currentUserId,
          resolution_notes: resolutionNotes || null,
        })
        .eq("id", ticketId);

      if (error) throw error;

      // Log to audit
      await supabase.from("admin_audit_log").insert({
        admin_user_id: currentUserId,
        action_type: "support_ticket_resolved",
        target_type: "support_ticket",
        target_id: ticketId,
        details: { resolution_notes: resolutionNotes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      toast.success("Ticket resolved");
    },
    onError: (error) => {
      console.error("Failed to resolve ticket:", error);
      toast.error("Failed to resolve ticket");
    },
  });
}
