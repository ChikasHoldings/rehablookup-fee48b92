
# Fix: Deploy Missing Edge Functions

## Problem Identified
The facilities are not showing on the search page because two critical edge functions are not deployed:
- `get-public-facilities` (returns 404)
- `get-featured-facilities` (returns 404)

The console logs show:
```
[useStaticFacilities] Error: FunctionsFetchError: Failed to send a request to the Edge Function
```

## Root Cause
These edge functions exist in the codebase (`supabase/functions/`) and are configured in `supabase/config.toml`, but they were never deployed to the server. This likely happened during a previous deployment that didn't include these functions.

## Solution
Deploy both edge functions to restore the facilities display functionality.

## Implementation Steps

### Step 1: Deploy Edge Functions
Trigger deployment of the two missing edge functions:
- `get-public-facilities` - Fetches all approved facilities from the database
- `get-featured-facilities` - Determines which facilities should be featured/pro

### Step 2: Verify Deployment
After deployment, verify the functions respond correctly by testing them.

## Technical Details
The edge functions are already properly written and configured:
- Both have correct CORS headers
- Both are set to `verify_jwt = false` (public access)
- Both query the correct database views/tables

No code changes are required - this is purely a deployment issue.

## Expected Outcome
Once deployed, the search page will:
1. Successfully fetch facilities from `get-public-facilities`
2. Correctly identify Pro/Featured facilities from `get-featured-facilities`
3. Display all facilities in the search results
