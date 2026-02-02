
# Fix Lead Analytics to Show KPIs Instead of CTA Redirect

## Problem
The Lead Analytics tab currently displays a "No Inquiry Data Yet" card with a redirect button when providers have zero inquiries, instead of showing the actual analytics dashboard with zero values in all KPIs.

## Solution
Remove the empty state redirect and always show the full analytics dashboard, even when there are no inquiries. This provides a consistent experience and shows providers what metrics they'll track once inquiries come in.

## Changes Required

### File: `src/components/provider/CentralizedLeadAnalyticsDashboard.tsx`

1. **Remove the empty state redirect logic** (lines 73-75)
   - Delete or modify the condition that returns `EmptyAnalytics` when `totalLeads === 0`
   - Always render the full dashboard

2. **Handle edge cases in calculations**
   - Ensure percentage calculations don't produce NaN/Infinity when dividing by 0
   - Use fallback values (0%) for conversion rates when there's no data

3. **Improve empty data handling in charts**
   - Monthly trends chart will show zeros for each month (already works)
   - Status breakdown pie chart should handle empty arrays gracefully
   - Add a subtle message within the dashboard indicating "No inquiries yet" without hiding KPIs

## Technical Details

```tsx
// Before (line 73-75):
if (!analytics || analytics.totalLeads === 0) {
  return <EmptyAnalytics hasApprovedListing={hasApprovedListing} />;
}

// After:
if (!analytics) {
  return <AnalyticsSkeleton />;
}
// Remove the totalLeads === 0 condition entirely
// Dashboard will render with all zeros
```

**Safe division handling:**
```tsx
const conversionRate = analytics.totalLeads > 0 
  ? Math.round((analytics.conversionFunnel.converted / analytics.totalLeads) * 100)
  : 0; // Already handled correctly
```

**Pie chart empty state:**
- When `statusBreakdown` is empty, show a placeholder message instead of an empty chart

## Result
Providers with approved listings will see the full analytics dashboard showing:
- Total Inquiries: 0
- This Month: 0  
- Unlocked: 0
- Conversion Rate: 0%
- Empty trend chart (all zeros)
- Conversion funnel with all zeros

This provides a better UX showing providers exactly what they'll be tracking once inquiries start coming in.
