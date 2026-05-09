import { useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProviderEventType = "listing_impression" | "profile_view" | "click_to_call" | "website_click";
export type PageContext = "search" | "profile" | "other";

// Generate or retrieve session ID
function getSessionId(): string {
  const storageKey = "provider_tracking_session";
  let sessionId = sessionStorage.getItem(storageKey);
  
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem(storageKey, sessionId);
  }
  
  return sessionId;
}

interface TrackEventOptions {
  facilityId: string;
  eventType: ProviderEventType;
  pageContext?: PageContext;
}

export function useProviderEventTracking() {
  // Track events that have been fired in this session to prevent duplicates
  const firedEvents = useRef<Set<string>>(new Set());
  const sessionId = useRef<string>(getSessionId());

  // Reset fired events on unmount to allow re-tracking on navigation
  useEffect(() => {
    return () => {
      // Keep impressions tracked across renders, reset on page unload
    };
  }, []);

  const trackEvent = useCallback(async ({ facilityId, eventType, pageContext = "other" }: TrackEventOptions) => {
    if (!facilityId) return;

    // Create unique key for de-duplication within session.
    // Key includes facilityId so that visiting two different facility pages in
    // the same session correctly fires a profile_view for each facility.
    // The server-side 30-second window dedup handles true duplicates (e.g. hot
    // reloads or double-mounts in React Strict Mode).
    const eventKey = `${facilityId}-${eventType}`;
    
    // For impressions and profile views, only fire once per session per facility
    if ((eventType === "listing_impression" || eventType === "profile_view") && firedEvents.current.has(eventKey)) {
      return;
    }

    // Mark as fired
    firedEvents.current.add(eventKey);

    try {
      // Fire and forget - non-blocking
      supabase.functions.invoke("track-provider-event", {
        body: {
          facilityId,
          eventType,
          sessionId: sessionId.current,
          pageContext,
        },
      }).catch((err) => {
        console.debug("[useProviderEventTracking] Failed to track event:", err);
      });
    } catch (err) {
      // Fail silently
      console.debug("[useProviderEventTracking] Error tracking event:", err);
    }
  }, []);

  const trackImpression = useCallback((facilityId: string, pageContext: PageContext = "search") => {
    trackEvent({ facilityId, eventType: "listing_impression", pageContext });
  }, [trackEvent]);

  const trackProfileView = useCallback((facilityId: string) => {
    trackEvent({ facilityId, eventType: "profile_view", pageContext: "profile" });
  }, [trackEvent]);

  const trackClickToCall = useCallback((facilityId: string, pageContext: PageContext = "other") => {
    trackEvent({ facilityId, eventType: "click_to_call", pageContext });
  }, [trackEvent]);

  const trackWebsiteClick = useCallback((facilityId: string, pageContext: PageContext = "profile") => {
    trackEvent({ facilityId, eventType: "website_click", pageContext });
  }, [trackEvent]);

  return {
    trackEvent,
    trackImpression,
    trackProfileView,
    trackClickToCall,
    trackWebsiteClick,
    sessionId: sessionId.current,
  };
}

// Hook for tracking impressions when element is in viewport
export function useImpressionTracking(facilityId: string | undefined, enabled: boolean = true) {
  const hasTracked = useRef(false);
  const { trackImpression } = useProviderEventTracking();

  const trackOnVisible = useCallback((node: HTMLElement | null) => {
    if (!node || !facilityId || !enabled || hasTracked.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTracked.current) {
            hasTracked.current = true;
            trackImpression(facilityId, "search");
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5, rootMargin: "0px" }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [facilityId, enabled, trackImpression]);

  return { trackOnVisible, hasTracked: hasTracked.current };
}
