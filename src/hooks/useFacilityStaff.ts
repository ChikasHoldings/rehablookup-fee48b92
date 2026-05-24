import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const STAFF_PHOTO_BUCKET = "facility-images";

// Extract the storage object path from a public URL produced by
// `supabase.storage.from('facility-images').getPublicUrl(...)`.
// Returns null if the URL isn't a Supabase storage URL for this bucket
// (e.g. legacy external URLs, blank sentinels) — we never call
// storage.remove on a URL we can't confidently identify.
function storagePathFromPublicUrl(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null;
  const marker = `/storage/v1/object/public/${STAFF_PHOTO_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  const path = publicUrl.slice(idx + marker.length).split("?")[0];
  return path.length > 0 ? path : null;
}

async function removeStaffPhotoIfOwned(photoUrl: string | null | undefined) {
  const path = storagePathFromPublicUrl(photoUrl);
  if (!path) return;
  const { error } = await supabase.storage.from(STAFF_PHOTO_BUCKET).remove([path]);
  if (error) {
    // Don't throw — the row delete/update is the source of truth.
    // A failed storage cleanup leaves at most one orphan; we surface
    // the warning so it's discoverable in the console.
    console.warn("[useFacilityStaff] failed to remove storage object", path, error.message);
  }
}

export interface FacilityStaff {
  id: string;
  facility_id: string;
  name: string;
  job_title: string;
  bio: string | null;
  photo_url: string;
  email: string | null;
  phone: string | null;
  display_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffData {
  facility_id: string;
  name: string;
  job_title: string;
  bio?: string;
  photo_url: string;
  email?: string;
  phone?: string;
  display_order?: number;
  is_visible?: boolean;
}

export interface UpdateStaffData {
  name?: string;
  job_title?: string;
  bio?: string | null;
  photo_url?: string;
  email?: string | null;
  phone?: string | null;
  display_order?: number;
  is_visible?: boolean;
}

export const JOB_TITLES = [
  "Owner",
  "CEO / Executive Director",
  "Clinical Director",
  "Medical Director",
  "Program Director",
  "Operations Manager",
  "Therapist / Counselor",
  "Nurse",
  "Psychiatrist",
  "Case Manager",
  "Admissions Coordinator",
  "Custom",
] as const;

export function useFacilityStaff(facilityId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: staff = [], isLoading, error, refetch } = useQuery({
    queryKey: ["facility-staff", facilityId],
    queryFn: async () => {
      if (!facilityId) return [];
      
      const { data, error } = await supabase
        .from("facility_staff")
        .select("id, facility_id, name, job_title, bio, photo_url, display_order, is_visible, created_at, updated_at")
        .eq("facility_id", facilityId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as FacilityStaff[];
    },
    enabled: !!facilityId,
  });

  const createStaff = useMutation({
    mutationFn: async (data: CreateStaffData) => {
      const { data: newStaff, error } = await supabase
        .from("facility_staff")
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return newStaff as FacilityStaff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-staff", facilityId] });
      toast({
        title: "Staff member added",
        description: "The team member has been added to your profile.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding staff member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStaff = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateStaffData }) => {
      // If a NEW photo URL is being written, look up the OLD one and
      // remove it from storage after the row update succeeds. We only
      // run this when the photo is actually changing (data.photo_url
      // is defined AND different from current) so visibility / bio /
      // name edits don't churn storage lookups.
      let oldPhotoUrl: string | null = null;
      if (typeof data.photo_url === "string") {
        const { data: existing } = await supabase
          .from("facility_staff")
          .select("photo_url")
          .eq("id", id)
          .maybeSingle();
        const existingUrl = (existing as { photo_url: string | null } | null)?.photo_url ?? null;
        if (existingUrl && existingUrl !== data.photo_url) {
          oldPhotoUrl = existingUrl;
        }
      }

      const { data: updatedStaff, error } = await supabase
        .from("facility_staff")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (oldPhotoUrl) {
        await removeStaffPhotoIfOwned(oldPhotoUrl);
      }
      return updatedStaff as FacilityStaff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-staff", facilityId] });
      toast({
        title: "Staff member updated",
        description: "The team member has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating staff member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteStaff = useMutation({
    mutationFn: async (id: string) => {
      // Look up the photo URL first so we can remove the storage
      // object after the row is gone. The row delete is the source of
      // truth — if storage cleanup fails afterwards we have at most
      // one orphan, never a dangling row pointing at a missing image.
      const { data: existing } = await supabase
        .from("facility_staff")
        .select("photo_url")
        .eq("id", id)
        .maybeSingle();

      const { error } = await supabase
        .from("facility_staff")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await removeStaffPhotoIfOwned(
        (existing as { photo_url: string | null } | null)?.photo_url ?? null,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-staff", facilityId] });
      toast({
        title: "Staff member removed",
        description: "The team member has been removed from your profile.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error removing staff member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reorderStaff = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Sequential updates — Supabase doesn't expose multi-statement
      // transactions from the client SDK, so a Promise.all here would
      // leave the DB partially reordered if one row failed mid-flight.
      // Sequential awaits give us short-circuit: first failure aborts
      // the rest, leaving the original order intact above the failure
      // point and the partial new order below. We re-throw so the
      // mutation rejects and the cache invalidation refetches the
      // truth from the server.
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await supabase
          .from("facility_staff")
          .update({ display_order: i })
          .eq("id", orderedIds[i]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-staff", facilityId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error reordering staff",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    staff,
    isLoading,
    error,
    refetch,
    createStaff,
    updateStaff,
    deleteStaff,
    reorderStaff,
  };
}

// Hook for public-facing staff display (only visible staff from approved facilities)
export function usePublicFacilityStaff(facilityId: string | undefined) {
  return useQuery({
    queryKey: ["public-facility-staff", facilityId],
    queryFn: async () => {
      if (!facilityId) return [];
      
      // SECURITY: Use public_facility_staff view which excludes PII (email/phone)
      // The base facility_staff table no longer allows anonymous reads.
      const { data, error } = await supabase
        .from("public_facility_staff")
        .select("id, name, job_title, bio, photo_url, display_order")
        .eq("facility_id", facilityId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!facilityId,
  });
}
