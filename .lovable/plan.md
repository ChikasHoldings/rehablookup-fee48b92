
# Fix Listing Population After Provider Onboarding

## Status: ✅ COMPLETED + ROUTE AUDIT DONE

## Problem Summary
After completing provider signup, listings are not populating correctly on the My Listings page. This is caused by **stale localStorage caches** and **missing cache invalidation** during the signup flow.

## Root Cause Analysis

### 1. Stale Cache Not Cleared During Signup
The signup flow in `ProviderSignup.tsx` does NOT clear existing localStorage caches before redirecting to the dashboard. If a previous user was logged in, their cached data remains:
- `provider-facilities-cache` - Cached facilities from previous user
- `selectedFacilityId` / `selectedFacilityData` - Selected facility state
- `provider-data-*` - Provider data cache
- `rl_cached_*` - User role cache

### 2. Cache Not Pre-Populated After Facility Creation
The login flow (`ProviderLogin.tsx` lines 484-488) pre-populates the facilities cache after successful login, but the signup flow does NOT do this after creating the facility.

### 3. useProviderFacilities Returns Stale Data
When `useProviderFacilities` runs after signup:
- It checks `placeholderData: getCachedFacilities()` first
- If stale cache exists, it returns wrong user's data
- If cache is empty but query has timing issues, it may return empty

### 4. SelectedFacilityContext Hydration Fails
The context relies on:
1. localStorage cache (may be stale/empty)
2. `useProviderFacilities` (may have stale data)
3. If both fail, `selectedFacility` is null → dashboard shows empty state

## Solution

### Changes to `src/pages/ProviderSignup.tsx`

**After facility creation (around line 488), add cache clearing and pre-population:**

```typescript
// Clear all provider-related caches from any previous session
const clearProviderCaches = () => {
  try {
    // Clear facilities cache
    localStorage.removeItem("provider-facilities-cache");
    // Clear selected facility
    localStorage.removeItem("selectedFacilityId");
    localStorage.removeItem("selectedFacilityData");
    // Clear provider data caches (pattern match)
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("provider-data-")) {
        localStorage.removeItem(key);
      }
    });
    // Clear user role cache
    localStorage.removeItem("rl_cached_role");
    localStorage.removeItem("rl_cached_uid");
    localStorage.removeItem("rl_cached_auth");
    localStorage.removeItem("rl_cached_ts");
  } catch {
    // Silent fail
  }
};

// Pre-populate caches with newly created facility
const prePopulateFacilityCache = (facility: any) => {
  try {
    const facilityData = {
      id: facility.id,
      name: formData.facilityName,
      slug: facility.slug,
      status: "pending",
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zip_code: formData.zipCode,
      facility_type: formData.facilityType,
      logo_url: logoUrl,
      gallery_urls: galleryUrls.length > 0 ? galleryUrls : null,
      featured: false,
      created_at: new Date().toISOString(),
    };
    
    // Cache for useProviderFacilities
    localStorage.setItem("provider-facilities-cache", JSON.stringify({
      data: [facilityData],
      timestamp: Date.now(),
    }));
    
    // Cache for SelectedFacilityContext
    localStorage.setItem("selectedFacilityId", facility.id);
    localStorage.setItem("selectedFacilityData", JSON.stringify(facilityData));
    
    // Cache user role
    localStorage.setItem("rl_cached_role", "provider");
    localStorage.setItem("rl_cached_uid", userId);
    localStorage.setItem("rl_cached_auth", "true");
    localStorage.setItem("rl_cached_ts", String(Date.now()));
  } catch {
    // Silent fail
  }
};
```

**Insert these calls in the signup flow:**
1. Call `clearProviderCaches()` BEFORE creating the auth account (around line 277)
2. Call `prePopulateFacilityCache(facilityData)` AFTER successful facility creation and image uploads (around line 489)

### Changes to `src/hooks/useProviderFacilities.ts`

**Add user-specific cache key to prevent cross-user cache pollution:**

```typescript
// Change from:
const CACHE_KEY = "provider-facilities-cache";

// To:
const getCacheKey = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id 
    ? `provider-facilities-cache-${session.user.id}`
    : "provider-facilities-cache";
};
```

This ensures each user has their own cache key, preventing stale data from other users.

### Changes to `src/contexts/SelectedFacilityContext.tsx`

**Reset hydration flag when user changes:**

```typescript
// Add user tracking to reset hydration when user changes
const [currentUserId, setCurrentUserId] = useState<string | null>(null);

useEffect(() => {
  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const newUserId = session?.user?.id || null;
    
    if (currentUserId && newUserId && currentUserId !== newUserId) {
      // User changed - reset hydration
      hydratedRef.current = false;
      setSelectedFacilityState(null);
    }
    setCurrentUserId(newUserId);
  };
  checkUser();
}, [facilities]);
```

## Files to Modify

### Implementation Status

1. **`src/pages/ProviderSignup.tsx`** ✅ DONE
   - Added `clearProviderCaches()` function (lines 45-70)
   - Clear called before auth signup (line 304)
   - Added cache pre-population after facility creation (lines 521-560)

2. **`src/hooks/useProviderFacilities.ts`** ✅ DONE
   - Initialize `currentUserId` from `rl_cached_uid` localStorage
   - User-specific cache key: `provider-facilities-cache-${userId}`
   - Fallback lookup using `rl_cached_uid` when userId not provided

3. **`src/contexts/SelectedFacilityContext.tsx`** ✅ DONE
   - Added `currentUserId` state tracking
   - Auth state change listener for SIGNED_OUT and SIGNED_IN events
   - Resets `hydratedRef` and clears `selectedFacilityState` on user change

## Technical Flow After Fix

```text
User Completes Signup
        ↓
Clear all provider caches (prevents stale data)
        ↓
Create auth account, profile, facility
        ↓
Pre-populate caches with new facility data
        ↓
Navigate to /provider/dashboard
        ↓
ProviderShell loads with SelectedFacilityProvider
        ↓
useProviderFacilities finds pre-populated cache → instant render
        ↓
SelectedFacilityContext hydrates from cache → facility selected
        ↓
Dashboard renders with correct facility data
        ↓
Background query confirms/updates cache with fresh DB data
```

## Verification Steps

After implementation:
1. Complete provider signup flow end-to-end
2. Verify dashboard shows correct facility name
3. Navigate to My Listings - verify listing card appears
4. Click Edit on listing - verify all data populated
5. Log out, sign up as different user - verify no data cross-contamination

---

## Internal Link Audit (Feb 5, 2026)

### Fixed Issues
- **`/provider/listing` → `/provider/listings`**: Updated 5 occurrences in Dashboard.tsx and ProviderHeader.tsx to use the canonical URL directly instead of relying on redirect.

### Verified Routes (All Working)
- `/treatment-types/*` - All treatment type routes have matching links
- `/insurance/*-rehab` - All insurance routes correctly linked
- `/account/*` - All seeker panel routes valid
- `/provider/*` - All provider panel routes valid
- `/concierge`, `/international`, `/us-rehab/*` - All valid
- Legacy redirects working: `/signup` → `/seeker/signup`, `/request-help` → `/concierge`, etc.

### No Broken Links Found
All internal `<Link to="">` components point to valid routes defined in App.tsx.
