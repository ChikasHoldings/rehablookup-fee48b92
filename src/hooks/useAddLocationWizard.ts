/**
 * useAddLocationWizard
 * ────────────────────
 * State management + persistence for the multi-step Add Location
 * wizard. Holds the entire wizard payload (every text field across
 * every step) and mirrors it to localStorage on every change so a
 * provider can resume after a refresh / accidental close.
 *
 * The draft is keyed per-user so signed-out + signed-in states don't
 * mix, and is cleared on successful submit.
 */

import { useCallback, useEffect, useState } from "react";

export interface AddLocationDraft {
  // Step 1 — core identity
  name: string;
  dba_name: string;
  facility_type: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website: string;
  bed_count: string;
  year_established: string;       // captured as text so empty is "", normalize on submit
  accepting_admissions: "" | "yes" | "no" | "waitlist";

  // Step 2 — treatment details
  levels_of_care: string[];
  services: string[];
  treatment_approaches: string[];
  age_groups: string[];
  languages: string[];
  gender_served: string;          // "" | "All" | "Men" | "Women"

  // Step 3 — insurance & payment
  insurance: string[];
  payment_options: string[];

  // Step 4 — accreditations & licensing
  accreditations: string[];
  license_number: string;

  // Step 5 — profile content
  description: string;
  video_url: string;
  virtual_tour_url: string;
  amenities: string[];
  accessibility_features: string[];
  hours_of_operation: string;

  // Step 6 — staff (Pro)
  // Per-staff entries with photo URLs filled in post-create; the
  // wizard captures text only because the storage path needs the
  // facility id (only known after the row is inserted). Each entry
  // becomes a facility_staff row on submit.
  staff: Array<{
    name: string;
    job_title: string;
    bio: string;
  }>;
}

export const INITIAL_DRAFT: AddLocationDraft = {
  name: "",
  dba_name: "",
  facility_type: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  phone: "",
  email: "",
  website: "",
  bed_count: "",
  year_established: "",
  accepting_admissions: "",
  levels_of_care: [],
  services: [],
  treatment_approaches: [],
  age_groups: [],
  languages: [],
  gender_served: "",
  insurance: [],
  payment_options: [],
  accreditations: [],
  license_number: "",
  description: "",
  video_url: "",
  virtual_tour_url: "",
  amenities: [],
  accessibility_features: [],
  hours_of_operation: "",
  staff: [],
};

function storageKey(userId: string | null | undefined): string {
  return `provider-add-location-draft:${userId ?? "anon"}`;
}

export function useAddLocationWizard(userId: string | null | undefined) {
  const [draft, setDraft] = useState<AddLocationDraft>(INITIAL_DRAFT);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount + when user changes
  useEffect(() => {
    if (!userId) {
      setHydrated(true);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          // Spread over INITIAL_DRAFT so new fields added in a later
          // version of the wizard get safe defaults on resume.
          setDraft({ ...INITIAL_DRAFT, ...parsed });
        }
      }
    } catch (err) {
      console.warn("[add-location] failed to hydrate draft from localStorage:", err);
    }
    setHydrated(true);
  }, [userId]);

  // Persist on every change, debounced by react batching. Skip the
  // first commit (before hydration) so we don't overwrite a saved
  // draft with the empty initial state on mount.
  useEffect(() => {
    if (!hydrated || !userId) return;
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(draft));
    } catch (err) {
      console.warn("[add-location] failed to persist draft:", err);
    }
  }, [draft, hydrated, userId]);

  const updateField = useCallback(
    <K extends keyof AddLocationDraft>(field: K, value: AddLocationDraft[K]) => {
      setDraft((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const reset = useCallback(() => {
    setDraft(INITIAL_DRAFT);
    if (userId) {
      try {
        localStorage.removeItem(storageKey(userId));
      } catch {
        /* ignore */
      }
    }
  }, [userId]);

  return { draft, updateField, reset, hydrated };
}

// Step-level validation. Each fn returns an array of error strings
// (one per invalid field). Empty array = valid.
export function validateStep(stepIndex: number, draft: AddLocationDraft): string[] {
  const errs: string[] = [];
  if (stepIndex === 0) {
    if (!draft.name.trim()) errs.push("Facility name is required");
    if (!draft.facility_type) errs.push("Facility type is required");
    if (!draft.address.trim()) errs.push("Address is required");
    if (!draft.city.trim()) errs.push("City is required");
    if (!draft.state) errs.push("State is required");
    if (!/^\d{5}$/.test(draft.zip_code)) errs.push("Valid 5-digit ZIP required");
    if (!draft.phone || draft.phone.replace(/\D/g, "").length < 10)
      errs.push("Valid phone number required");
    if (draft.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email))
      errs.push("Email is invalid");
    if (draft.website && !/^https?:\/\//i.test(draft.website))
      errs.push("Website must start with http:// or https://");
    if (draft.year_established) {
      const y = Number(draft.year_established);
      const currentYear = new Date().getFullYear();
      if (!Number.isInteger(y) || y < 1900 || y > currentYear) {
        errs.push(`Year established must be between 1900 and ${currentYear}`);
      }
    }
  }
  if (stepIndex === 4) {
    if (draft.video_url && !/^https?:\/\//i.test(draft.video_url))
      errs.push("Video URL must start with http:// or https://");
    if (draft.virtual_tour_url && !/^https?:\/\//i.test(draft.virtual_tour_url))
      errs.push("Virtual tour URL must start with http:// or https://");
  }
  if (stepIndex === 5) {
    draft.staff.forEach((s, i) => {
      if (s.name.trim() && !s.job_title.trim()) {
        errs.push(`Staff member ${i + 1} needs a job title`);
      }
      if (s.job_title.trim() && !s.name.trim()) {
        errs.push(`Staff member ${i + 1} needs a name`);
      }
      if (s.bio && s.bio.length > 500) {
        errs.push(`Staff member ${i + 1} bio is over 500 characters`);
      }
    });
  }
  return errs;
}
