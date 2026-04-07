

# Add Exclusive Lead Indicator to Provider Leads Page

## What We're Building
Add a prominent visual indicator on the provider leads page that communicates leads are exclusive, reinforcing the platform's value proposition. This includes:

1. **Exclusive Lead Banner** — A subtle but visible banner below the page header stating leads are exclusive with a 24-hour window, using a shield/star icon and brand colors.

2. **Per-Lead Exclusivity Badge** — On each lead list item, show a small "Exclusive" badge (or "Redistributed" for rerouted leads) so providers can instantly see lead type.

## Technical Details

### File: `src/pages/provider/Inquiries.tsx`
- Add an info banner between the stats header and filters section:
  - Shield icon + "Your leads are exclusive" headline
  - Subtext: "Each lead is sent only to your facility for 24 hours before redistribution"
  - Styled with a blue/brand accent background, compact design

### File: `src/components/provider/inquiries/InquiryListItem.tsx`
- Add a small badge next to each lead showing "Exclusive" (green) or "Shared" (amber) based on whether the lead has been redistributed
- This requires checking the lead's redistribution status (already available in the data model)

### Changes Summary
| File | Change |
|------|--------|
| `src/pages/provider/Inquiries.tsx` | Add exclusivity banner below stats header |
| `src/components/provider/inquiries/InquiryListItem.tsx` | Add Exclusive/Shared badge per lead |

