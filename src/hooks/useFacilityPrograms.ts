import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface FacilityProgram {
  id: string;
  facility_id: string;
  name: string;
  description: string;
  level_of_care: string | null;
  length_text: string | null;
  display_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProgramData {
  facility_id: string;
  name: string;
  description: string;
  level_of_care?: string | null;
  length_text?: string | null;
  display_order?: number;
  is_visible?: boolean;
}

export interface UpdateProgramData {
  name?: string;
  description?: string;
  level_of_care?: string | null;
  length_text?: string | null;
  display_order?: number;
  is_visible?: boolean;
}

// Suggested levels of care — kept aligned with the rest of the
// directory taxonomy (LEVELS_OF_CARE in scripts/generate-facility-
// profiles-html.mjs) so providers' programs cross-reference cleanly
// with the search facets. Free-form fallback ("Custom") covers
// hybrid programs that don't map to a single bucket.
export const PROGRAM_LEVELS_OF_CARE = [
  "Detoxification",
  "Residential",
  "Partial Hospitalization (PHP)",
  "Intensive Outpatient (IOP)",
  "Outpatient",
  "Sober Living",
  "Telehealth/Virtual",
  "Custom",
] as const;

export function useFacilityPrograms(facilityId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: programs = [], isLoading, error, refetch } = useQuery({
    queryKey: ["facility-programs", facilityId],
    queryFn: async () => {
      if (!facilityId) return [];
      const { data, error } = await supabase
        .from("facility_programs")
        .select("id, facility_id, name, description, level_of_care, length_text, display_order, is_visible, created_at, updated_at")
        .eq("facility_id", facilityId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FacilityProgram[];
    },
    enabled: !!facilityId,
  });

  const createProgram = useMutation({
    mutationFn: async (data: CreateProgramData) => {
      const { data: row, error } = await supabase
        .from("facility_programs")
        .insert([data])
        .select()
        .single();
      if (error) throw error;
      return row as FacilityProgram;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-programs", facilityId] });
      toast({ title: "Program added", description: "Your new program is saved." });
    },
    onError: (err: Error) =>
      toast({ title: "Couldn't add program", description: err.message, variant: "destructive" }),
  });

  const updateProgram = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProgramData }) => {
      const { data: row, error } = await supabase
        .from("facility_programs")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return row as FacilityProgram;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-programs", facilityId] });
      toast({ title: "Program updated" });
    },
    onError: (err: Error) =>
      toast({ title: "Couldn't update program", description: err.message, variant: "destructive" }),
  });

  const deleteProgram = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("facility_programs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-programs", facilityId] });
      toast({ title: "Program removed" });
    },
    onError: (err: Error) =>
      toast({ title: "Couldn't remove program", description: err.message, variant: "destructive" }),
  });

  return { programs, isLoading, error, refetch, createProgram, updateProgram, deleteProgram };
}

// Public-facing read — uses the Pro-gated view so a Free facility's
// programs are simply invisible to consumers. The provider editor
// hook above reads the raw table via the owner-scoped RLS policy.
export function usePublicFacilityPrograms(facilityId: string | undefined) {
  return useQuery({
    queryKey: ["public-facility-programs", facilityId],
    queryFn: async () => {
      if (!facilityId) return [];
      const { data, error } = await supabase
        .from("public_facility_programs")
        .select("id, name, description, level_of_care, length_text, display_order")
        .eq("facility_id", facilityId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!facilityId,
  });
}
