

# Admin Panel Comprehensive Audit - Bug Report & Fix Plan

## Executive Summary

After auditing all Admin features page-by-page, I identified **1 critical bug** causing the seeker deletion to fail silently, plus **6 additional issues** that need attention.

---

## CRITICAL BUG: Seeker User Deletion Fails Silently

**Location:** `src/hooks/admin/useUserManagement.ts`

**Impact:** HIGH - When admins try to delete seeker accounts, the user's related data is deleted but the **auth.users entry remains**. The user can still log in.

**Root Cause:**
The `deleteUser` mutation in `useUserManagement.ts` attempts to delete user data directly from the client-side Supabase SDK. However, it CANNOT delete auth users because:
1. The client SDK does not have access to `supabase.auth.admin.deleteUser()`
2. That method requires the service role key, which is only available in edge functions

**Current Broken Code:**
```typescript
// src/hooks/admin/useUserManagement.ts lines 22-82
const deleteUser = useMutation({
  mutationFn: async (user: UserProfile) => {
    // Deletes from tables... but NOT auth.users!
    await supabase.from("user_favorites").delete().eq("user_id", userId);
    await supabase.from("facility_reviews").delete().eq("user_id", userId);
    // ... more table deletions ...
    
    // MISSING: supabase.auth.admin.deleteUser(userId)
    // This line CANNOT work from client-side!
    return userId;
  },
});
```

**Solution:** Create a new edge function `admin-delete-seeker` (following the pattern of the working `admin-delete-provider` function) and update `useUserManagement.ts` to call it.

---

## Other Issues Found

### Issue #2: Ban User Function May Have Silent Failures

**Location:** `src/hooks/admin/useUserManagement.ts` (lines 86-140)

**Issue:** The `banUser` mutation adds entries to `blocked_identifiers` table, but doesn't actually disable the user in Supabase Auth. The user's session remains valid.

**Fix Required:** Ban should also call an edge function to use `supabase.auth.admin.updateUserById(userId, { ban_duration: "876000h" })`.

---

### Issue #3: Console Warning - FlagReviewDialog Missing forwardRef

**Location:** `src/components/provider/reviews/FlagReviewDialog.tsx`

**Issue:** React warns "Function components cannot be given refs" for both `FlagReviewDialog` and its internal `Dialog` component.

**Fix:** Wrap component with `forwardRef` or ensure Dialog isn't receiving refs improperly.

---

### Issue #4: Password Reset for Seekers May Not Work

**Location:** `src/hooks/admin/useUserManagement.ts` (lines 184-217)

**Issue:** Uses `supabase.auth.resetPasswordForEmail()` which sends email via Supabase Auth. This should work, but verify the redirect URL `/reset-password` exists and handles the token properly.

---

### Issue #5: Missing Error Handling in Some Mutations

**Location:** Multiple mutations in `useUserManagement.ts`

**Issue:** The delete operations don't check for errors on each table deletion. If one fails silently, subsequent operations may leave data in inconsistent state.

---

### Issue #6: Stale Query Cache After Seeker Operations

**Location:** `src/hooks/admin/useUserManagement.ts`

**Issue:** After deleting/banning a user, only `["admin-users"]` and `["admin-user-activity-stats"]` queries are invalidated. But `AdminSeekers.tsx` uses `["admin-user-activity-counts"]` which isn't invalidated.

---

## Features Verified as Working

| Feature | Status | Notes |
|---------|--------|-------|
| Admin Staff Create | Working | Uses `create-admin-user` edge function |
| Admin Staff Delete | Working | Uses `manage-admin-user` edge function with `auth.admin.deleteUser()` |
| Admin Staff Suspend | Working | Uses `manage-admin-user` edge function |
| Provider Delete | Working | Uses `admin-delete-provider` edge function |
| Review Moderation | Working | Direct DB operations work for non-auth data |
| Support Tickets | Working | Status/assignment updates work |
| Subscription Management | Working | Uses Stripe edge functions |
| Blocked Identifiers | Working | Direct DB operations work |
| Concierge Management | Working | Status updates and assignments work |

---

## Implementation Plan

### Step 1: Create Edge Function for Seeker Deletion

Create `supabase/functions/admin-delete-seeker/index.ts` that:
1. Verifies caller is an admin
2. Deletes all related data using service role
3. Calls `adminClient.auth.admin.deleteUser(targetUserId)`
4. Logs to admin_audit_log

### Step 2: Update useUserManagement Hook

Update `src/hooks/admin/useUserManagement.ts` to:
1. Call the new edge function instead of direct DB operations
2. Add proper error handling
3. Invalidate all relevant query keys

### Step 3: Create Edge Function for User Ban

Create functionality in the admin-delete-seeker edge function (or separate `admin-manage-seeker` function) to handle:
1. Ban action - disable user in auth + add to blocked_identifiers
2. Unban action - re-enable user in auth + deactivate blocked_identifiers

### Step 4: Fix Console Warning

Update `src/components/provider/reviews/FlagReviewDialog.tsx` to properly handle refs.

### Step 5: Add Missing Query Invalidations

Update `useUserManagement.ts` to invalidate `["admin-user-activity-counts"]` on all mutations.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/admin-delete-seeker/index.ts` | **Create** |
| `src/hooks/admin/useUserManagement.ts` | **Modify** - Call edge function |
| `src/components/provider/reviews/FlagReviewDialog.tsx` | **Modify** - Fix ref warning |
| `supabase/config.toml` | **Modify** - Add new function entry |

---

## Technical Details

### Edge Function Pattern (from working admin-delete-provider)

```typescript
// Pattern to follow for admin-delete-seeker:
1. Verify auth header
2. Check caller has admin role via RPC
3. Validate target user is a seeker (has seeker_profiles entry)
4. Use adminClient (service role) to delete:
   - user_favorites
   - facility_reviews  
   - seeker_notifications
   - account_activity_log
   - review_helpful_votes
   - user_roles
   - seeker_profiles
5. Call adminClient.auth.admin.deleteUser(targetUserId)
6. Log to admin_audit_log
7. Return success response
```

### Hook Update Pattern

```typescript
// Update deleteUser mutation to use edge function:
const deleteUser = useMutation({
  mutationFn: async (user: UserProfile) => {
    const { data, error } = await supabase.functions.invoke("admin-delete-seeker", {
      body: { targetUserId: user.user_id },
    });
    if (error) throw new Error(error.message);
    return data;
  },
  onSuccess: () => {
    toast.success("User account deleted successfully");
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["admin-user-activity-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-user-activity-counts"] });
  },
  // ... rest unchanged
});
```

---

## Verification Checklist

After implementation, verify:

- [ ] Admin can delete seeker account → user cannot log in anymore
- [ ] Admin can ban seeker → user session invalidated
- [ ] Admin can unban seeker → user can log in again
- [ ] Admin can send password reset → email received
- [ ] All related data cleaned up on delete (favorites, reviews, etc.)
- [ ] Audit log entries created for all actions
- [ ] No console warnings in provider reviews page
- [ ] Query cache properly invalidated after operations

