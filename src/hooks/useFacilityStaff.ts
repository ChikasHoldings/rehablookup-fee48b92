import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
        .select("id, facility_id, name, title, bio, photo_url, display_order, created_at")
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
      const { data: updatedStaff, error } = await supabase
        .from("facility_staff")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
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
      const { error } = await supabase
        .from("facility_staff")
        .delete()
        .eq("id", id);

      if (error) throw error;
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
      const updates = orderedIds.map((id, index) => 
        supabase
          .from("facility_staff")
          .update({ display_order: index })
          .eq("id", id)
      );
      
      await Promise.all(updates);
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
      
      const { data, error } = await supabase
        .from("facility_staff")
        .select("id, name, job_title, bio, photo_url, email, phone, display_order")
        .eq("facility_id", facilityId)
        .eq("is_visible", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!facilityId,
  });
}
