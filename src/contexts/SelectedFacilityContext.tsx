import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from "react";
import { useProviderFacilities, type ProviderFacility } from "@/hooks/useProviderFacilities";
import { supabase } from "@/integrations/supabase/client";

interface SelectedFacilityContextType {
  selectedFacility: ProviderFacility | null;
  setSelectedFacility: (facility: ProviderFacility) => void;
  requestFacilitySwitch: (facility: ProviderFacility) => void;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  pendingFacilitySwitch: ProviderFacility | null;
  confirmFacilitySwitch: () => void;
  cancelFacilitySwitch: () => void;
}

const SelectedFacilityContext = createContext<SelectedFacilityContextType | undefined>(undefined);

/**
 * Drop every cached provider snapshot from localStorage.
 *
 * `selectedFacilityData` is read synchronously at mount by getInitialFacility(),
 * and useProviderData seeds its placeholderData from `provider-data-<facilityId>`
 * (keyed by facility only, not by user). Signing out cleared the React state and
 * the React Query cache but left both of these on disk, so the next provider to
 * sign in on a shared machine rendered the previous one's facility name, logo,
 * address, contact details and lead counts until their own queries resolved.
 * Called on sign-out and whenever a different user signs in.
 */
function clearCachedProviderScope() {
  try {
    localStorage.removeItem("selectedFacilityId");
    localStorage.removeItem("selectedFacilityData");
    localStorage.removeItem(CACHE_OWNER_KEY);
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("provider-data-")) localStorage.removeItem(key);
    }
  } catch {
    // Storage unavailable (private mode / quota) — nothing cached to leak.
  }
}

/**
 * Records which user the cached snapshots above belong to.
 *
 * Clearing on SIGNED_OUT / a different SIGNED_IN only covers a handover that
 * happens inside one page life. When the first provider's session simply
 * lapses or the tab is closed, the next provider arrives on a fresh load where
 * currentUserId starts null, so the "user changed" comparison can't fire — yet
 * getInitialFacility() has already returned the previous provider's facility
 * synchronously. Stamping an owner lets that first resolve detect the mismatch.
 */
const CACHE_OWNER_KEY = "selectedFacilityOwnerId";

function rememberCacheOwner(userId: string | null) {
  try {
    if (userId) localStorage.setItem(CACHE_OWNER_KEY, userId);
  } catch {
    // Storage unavailable — the mismatch check below then simply won't apply.
  }
}

function cachedScopeBelongsToSomeoneElse(userId: string): boolean {
  try {
    const owner = localStorage.getItem(CACHE_OWNER_KEY);
    const hasCache =
      localStorage.getItem("selectedFacilityData") !== null ||
      localStorage.getItem("selectedFacilityId") !== null;
    // An unstamped cache predates this check — treat it as foreign rather than
    // trusting it, so a snapshot written before this shipped can't leak either.
    return hasCache && owner !== userId;
  } catch {
    return false;
  }
}

// Get initial facility from localStorage synchronously
function getInitialFacility(): ProviderFacility | null {
  try {
    const stored = localStorage.getItem("selectedFacilityData");
    if (stored) {
      return JSON.parse(stored) as ProviderFacility;
    }
    const storedId = localStorage.getItem("selectedFacilityId");
    if (storedId) {
      return { id: storedId } as ProviderFacility;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

export function SelectedFacilityProvider({ children }: { children: ReactNode }) {
  const { facilities, isLoading: facilitiesLoading } = useProviderFacilities();
  const [selectedFacility, setSelectedFacilityState] = useState<ProviderFacility | null>(getInitialFacility);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingFacilitySwitch, setPendingFacilitySwitch] = useState<ProviderFacility | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Track if we've already hydrated from the facilities list
  const hydratedRef = useRef(false);

  // Reset hydration when user changes (prevents stale data cross-contamination)
  useEffect(() => {
    const checkUser = async () => {
      let newUserId: string | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        newUserId = session?.user?.id || null;
      } catch (err) {
        // Transient auth-endpoint failure. Don't tear down the user's
        // selected-facility state — that would force them to re-pick
        // a facility just because the auth check blipped. Leave the
        // context as-is and try again on the next render cycle.
        console.warn("[SelectedFacilityContext] auth.getSession failed, retaining state", err);
        return;
      }
      
      // If user changed, reset everything
      if (currentUserId && newUserId && currentUserId !== newUserId) {
        if (import.meta.env.DEV) console.log("[SelectedFacilityContext] User changed, resetting hydration");
        hydratedRef.current = false;
        clearCachedProviderScope();
        setSelectedFacilityState(null);
      } else if (newUserId && cachedScopeBelongsToSomeoneElse(newUserId)) {
        // Fresh page load carrying the previous provider's snapshot — the
        // comparison above can't catch this because currentUserId is still null.
        if (import.meta.env.DEV) console.log("[SelectedFacilityContext] Cached scope belongs to another user, purging");
        hydratedRef.current = false;
        clearCachedProviderScope();
        setSelectedFacilityState(null);
      }

      if (newUserId) rememberCacheOwner(newUserId);
      setCurrentUserId(newUserId);
    };
    
    checkUser();
    
    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id || null;
      
      if (event === 'SIGNED_OUT') {
        if (import.meta.env.DEV) console.log("[SelectedFacilityContext] User signed out, clearing state");
        hydratedRef.current = false;
        clearCachedProviderScope();
        setSelectedFacilityState(null);
        setCurrentUserId(null);
      } else if (event === 'SIGNED_IN' && currentUserId && newUserId !== currentUserId) {
        if (import.meta.env.DEV) console.log("[SelectedFacilityContext] Different user signed in, resetting");
        hydratedRef.current = false;
        clearCachedProviderScope();
        setSelectedFacilityState(null);
        setCurrentUserId(newUserId);
      } else if (newUserId) {
        setCurrentUserId(newUserId);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [currentUserId]);

  // Keep the selected facility valid against the *current* accessible list.
  // Runs on every facilities change (not just once) so that if the user loses
  // access to the selected facility mid-session — a team member removed/role-
  // revoked, or Pro lapses and the facility drops out of useProviderFacilities
  // — we don't strand the panel on a facility they can no longer reach.
  useEffect(() => {
    if (facilitiesLoading) return;

    // No accessible facilities at all → clear any stale selection.
    if (facilities.length === 0) {
      if (selectedFacility) {
        setSelectedFacilityState(null);
        localStorage.removeItem("selectedFacilityId");
        localStorage.removeItem("selectedFacilityData");
      }
      hydratedRef.current = true;
      return;
    }

    const currentId = selectedFacility?.id;
    const current = currentId ? facilities.find(f => f.id === currentId) : undefined;

    // Selection still valid → hydrate to the full record (only when it differs,
    // so re-runs are no-ops and can't loop).
    if (current && !current.suspended) {
      if (selectedFacility !== current) {
        if (import.meta.env.DEV) console.log("[SelectedFacilityContext] Hydrated facility:", current.name);
        setSelectedFacilityState(current);
        localStorage.setItem("selectedFacilityId", current.id);
        localStorage.setItem("selectedFacilityData", JSON.stringify(current));
      }
      hydratedRef.current = true;
      return;
    }

    // Selection missing/suspended (access removed, Pro lapsed, or first load):
    // fall back to a valid facility.
    const fallback = facilities.find(f => !f.suspended) ?? facilities[0];
    if (fallback && fallback.id !== selectedFacility?.id) {
      if (import.meta.env.DEV) console.log("[SelectedFacilityContext] Re-selecting valid facility:", fallback.name);
      setSelectedFacilityState(fallback);
      localStorage.setItem("selectedFacilityId", fallback.id);
      localStorage.setItem("selectedFacilityData", JSON.stringify(fallback));
    } else if (
      fallback && selectedFacility &&
      (fallback.suspended !== selectedFacility.suspended ||
        fallback.status !== selectedFacility.status)
    ) {
      // Same facility (no non-suspended alternative to switch to), but the
      // persisted snapshot is stale — e.g. the facility was just suspended
      // while a pre-suspension localStorage snapshot said suspended:false.
      // Hydrate the fresh record so ProviderShell's paused banner + status
      // surfaces reflect reality (selectedFacility wins over providerData there).
      // Content-based (suspended/status) so it fires once then stabilises — no loop.
      if (import.meta.env.DEV) console.log("[SelectedFacilityContext] Refreshed stale facility snapshot:", fallback.name);
      setSelectedFacilityState(fallback);
      localStorage.setItem("selectedFacilityId", fallback.id);
      localStorage.setItem("selectedFacilityData", JSON.stringify(fallback));
    }
    hydratedRef.current = true;
  }, [facilities, facilitiesLoading, selectedFacility]);

  const setSelectedFacility = useCallback((facility: ProviderFacility) => {
    setSelectedFacilityState(facility);
    localStorage.setItem("selectedFacilityId", facility.id);
    localStorage.setItem("selectedFacilityData", JSON.stringify(facility));
    setHasUnsavedChanges(false);
    setPendingFacilitySwitch(null);
  }, []);

  const requestFacilitySwitch = useCallback((facility: ProviderFacility) => {
    if (facility.id === selectedFacility?.id) return;
    
    if (hasUnsavedChanges) {
      setPendingFacilitySwitch(facility);
    } else {
      setSelectedFacility(facility);
    }
  }, [hasUnsavedChanges, selectedFacility?.id, setSelectedFacility]);

  const confirmFacilitySwitch = useCallback(() => {
    if (pendingFacilitySwitch) {
      setSelectedFacility(pendingFacilitySwitch);
    }
  }, [pendingFacilitySwitch, setSelectedFacility]);

  const cancelFacilitySwitch = useCallback(() => {
    setPendingFacilitySwitch(null);
  }, []);

  const value = useMemo(() => ({
    selectedFacility,
    setSelectedFacility,
    requestFacilitySwitch,
    // BUGFIX: Expose the real facilities loading state so consumers (e.g. Analytics page)
    // can show a skeleton while facilities are being fetched on first load, rather than
    // rendering with a null selectedFacility and then re-rendering once facilities arrive.
    isLoading: facilitiesLoading,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    pendingFacilitySwitch,
    confirmFacilitySwitch,
    cancelFacilitySwitch,
  }), [selectedFacility, setSelectedFacility, requestFacilitySwitch, facilitiesLoading, hasUnsavedChanges, pendingFacilitySwitch, confirmFacilitySwitch, cancelFacilitySwitch]);

  return (
    <SelectedFacilityContext.Provider value={value}>
      {children}
    </SelectedFacilityContext.Provider>
  );
}

export function useSelectedFacility() {
  const context = useContext(SelectedFacilityContext);
  if (context === undefined) {
    throw new Error("useSelectedFacility must be used within a SelectedFacilityProvider");
  }
  return context;
}

export function useSelectedFacilityOptional() {
  const context = useContext(SelectedFacilityContext);
  return context ?? { 
    selectedFacility: null, 
    setSelectedFacility: () => {}, 
    requestFacilitySwitch: () => {},
    isLoading: false,
    hasUnsavedChanges: false,
    setHasUnsavedChanges: () => {},
    pendingFacilitySwitch: null,
    confirmFacilitySwitch: () => {},
    cancelFacilitySwitch: () => {},
  };
}
