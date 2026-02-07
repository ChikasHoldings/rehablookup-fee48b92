
# Fix: Persistent Article Image Caching Issue

## Problem Analysis

The articles on `/resources` page show old images despite database having correct Unsplash URLs. The root cause is **React Query's client-side caching** combined with insufficient cache invalidation.

### Investigation Findings

| Check | Result | Status |
|-------|--------|--------|
| Database `image_url` values | Correct Unsplash URLs | OK |
| API network response | Returns correct URLs | OK |
| Component code | Uses `article.image_url` correctly | OK |
| React Query cache | Shows stale data | ISSUE |

### Why Hard Refresh Didn't Work

1. React Query stores data in JavaScript memory, not browser cache
2. Hard refresh clears browser cache but React Query re-initializes with persisted state
3. The `staleTime: 0` setting added earlier only works if it was deployed before the refresh

## Solution

### 1. Force Fresh Data on Resources Page

Add explicit cache invalidation when the component mounts to ensure data is always fetched fresh:

```text
Changes to src/pages/Resources.tsx:
- Import useQueryClient from @tanstack/react-query
- Add useEffect to invalidate the query on mount
- This ensures any cached data is cleared before fetching
```

### 2. Update Query Configuration

Strengthen the query settings to prevent caching issues:

```text
useQuery Configuration:
- gcTime: 0 (don't keep data in garbage collection)
- staleTime: 0 (data is immediately stale)
- refetchOnMount: "always" (always refetch)
```

### 3. Add Cache-Busting Query Key (Optional)

For critical freshness, include a timestamp in the query key:

```text
queryKey: ["published-articles", Date.now()]
```
This forces a new cache entry on every page load.

## Technical Implementation

### File: src/pages/Resources.tsx

1. Add `useQueryClient` import
2. Add `useEffect` with cache invalidation on mount
3. Update query settings for stronger cache prevention

```text
// At component start:
const queryClient = useQueryClient();

useEffect(() => {
  queryClient.invalidateQueries({ queryKey: ["published-articles"] });
}, [queryClient]);

// Query configuration:
const { data: articles, isLoading } = useQuery({
  queryKey: ["published-articles"],
  queryFn: async () => { ... },
  staleTime: 0,
  gcTime: 0,
  refetchOnMount: "always",
});
```

## Expected Outcome

After this fix:
- Images will always show current database values
- No stale cache will persist between sessions
- Hard refresh will work as expected
