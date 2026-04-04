import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// Fields that require verification before going live
export const VERIFIED_FIELDS = [
  "name",
  "address",
  "city",
  "state",
  "zip_code",
  "phone",
  "website",
  "email",
] as const;

export type VerifiedField = typeof VERIFIED_FIELDS[number];

export interface PendingChangePayload {
  [key: string]: unknown;
}

export interface PendingChange {
  id: string;
  facility_id: string;
  provider_id: string;
  pending_payload: Json;
  pending_status: "pending" | "approved" | "rejected";
  changed_fields: string[];
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by_admin_id: string | null;
  review_notes: string | null;
}

/**
 * Hook to manage pending changes for a facility
 */
export function usePendingChanges(facilityId: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch pending change for facility
  const { data: pendingChange, isLoading } = useQuery({
    queryKey: ["pending-changes", facilityId],
    queryFn: async (): Promise<PendingChange | null> => {
      if (!facilityId) return null;

      const { data, error } = await supabase
        .from("facility_pending_changes")
        .select("id, facility_id, provider_id, pending_payload, pending_status, changed_fields, review_notes, reviewed_at, reviewed_by_admin_id, submitted_at, created_at, updated_at")
        .eq("facility_id", facilityId)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PendingChange | null;
    },
    enabled: !!facilityId,
  });

  // Submit pending changes mutation
  const submitChangesMutation = useMutation({
    mutationFn: async ({
      facilityId,
      changes,
      currentData,
    }: {
      facilityId: string;
      changes: PendingChangePayload;
      currentData: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Determine which verified fields have changed
      const changedFields = VERIFIED_FIELDS.filter(
        (field) => 
          field in changes && 
          changes[field] !== currentData[field]
      );

      if (changedFields.length === 0) {
        throw new Error("No verified fields have changed");
      }

      // Build payload with only changed verified fields
      const payload: PendingChangePayload = {};
      for (const field of changedFields) {
        payload[field] = changes[field];
      }

      // Check for existing pending change
      const { data: existing } = await supabase
        .from("facility_pending_changes")
        .select("id")
        .eq("facility_id", facilityId)
        .eq("pending_status", "pending")
        .maybeSingle();

      if (existing) {
        // Update existing pending change
        const { error } = await supabase
          .from("facility_pending_changes")
          .update({
            pending_payload: payload as Json,
            changed_fields: changedFields,
            submitted_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Create new pending change
        const { error } = await supabase
          .from("facility_pending_changes")
          .insert({
            facility_id: facilityId,
            provider_id: user.id,
            pending_payload: payload as Json,
            changed_fields: changedFields,
            pending_status: "pending",
          });

        if (error) throw error;
      }

      return { changedFields };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-changes", facilityId] });
    },
  });

  // Cancel pending changes mutation
  const cancelChangesMutation = useMutation({
    mutationFn: async (pendingChangeId: string) => {
      const { error } = await supabase
        .from("facility_pending_changes")
        .delete()
        .eq("id", pendingChangeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-changes", facilityId] });
    },
  });

  // Check if a field has a pending change
  const hasPendingChange = (field: string): boolean => {
    if (!pendingChange || pendingChange.pending_status !== "pending") return false;
    return pendingChange.changed_fields.includes(field);
  };

  // Get pending value for a field
  const getPendingValue = (field: string): unknown => {
    if (!pendingChange || pendingChange.pending_status !== "pending") return undefined;
    const payload = pendingChange.pending_payload as PendingChangePayload;
    return payload[field];
  };

  // Check if any verified field is pending
  const hasAnyPendingChange = (): boolean => {
    return pendingChange?.pending_status === "pending";
  };

  // Get the most recent rejected change
  const rejectedChange = pendingChange?.pending_status === "rejected" ? pendingChange : null;

  return {
    pendingChange,
    rejectedChange,
    isLoading,
    submitChanges: submitChangesMutation.mutateAsync,
    isSubmitting: submitChangesMutation.isPending,
    cancelChanges: cancelChangesMutation.mutateAsync,
    isCancelling: cancelChangesMutation.isPending,
    hasPendingChange,
    getPendingValue,
    hasAnyPendingChange,
  };
}

/**
 * Utility to check if changes include any verified fields
 */
export function hasVerifiedFieldChanges(
  changes: Record<string, unknown>,
  currentData: Record<string, unknown>
): boolean {
  return VERIFIED_FIELDS.some(
    (field) => field in changes && changes[field] !== currentData[field]
  );
}

/**
 * Separate verified field changes from non-verified changes
 */
export function separateChanges(
  changes: Record<string, unknown>,
  currentData: Record<string, unknown>
): {
  verifiedChanges: Record<string, unknown>;
  directChanges: Record<string, unknown>;
  hasVerifiedChanges: boolean;
} {
  const verifiedChanges: Record<string, unknown> = {};
  const directChanges: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(changes)) {
    if (VERIFIED_FIELDS.includes(key as VerifiedField) && value !== currentData[key]) {
      verifiedChanges[key] = value;
    } else {
      directChanges[key] = value;
    }
  }

  return {
    verifiedChanges,
    directChanges,
    hasVerifiedChanges: Object.keys(verifiedChanges).length > 0,
  };
}