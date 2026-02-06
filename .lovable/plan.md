
# Fix: Dropdown Click-Through Issue on Homepage Hero

## Problem Summary

When users click on the "Type of Care" or "Insurance" dropdown in the homepage hero section, the dropdown menu opens correctly. However, the "International Placement" and "List Your Treatment Center" links positioned below the search form can still receive click events, causing unintended navigation.

## Root Cause Analysis

The issue is a stacking context and positioning problem:

1. The `MultiSelectDropdown` component uses `position: absolute` with `top-full` to render its dropdown menu below the trigger button
2. The dropdown has `z-[9999]` which should place it above other content
3. The "Quick Links" section exists OUTSIDE the SearchForm container, in a sibling div
4. When the dropdown opens, it visually overlaps the Quick Links area, but the Quick Links remain clickable because they're in a different DOM subtree

```text
Hero Section (z-10)
└── Container
    └── SearchForm (directory variant)
        └── MultiSelectDropdown
            └── Trigger Button
            └── Dropdown Menu (z-[9999], position: absolute, top-full)
    └── Quick Links (mt-5) <-- OUTSIDE SearchForm, receives clicks!
```

## Solution

Two-pronged fix:

### 1. Ensure Quick Links have lower z-index

Add `relative z-0` to the Quick Links container so it properly participates in the stacking context and appears below the dropdown menu.

### 2. Increase dropdown isolation

Wrap the SearchForm in a container with `relative z-20` to establish a higher stacking context, ensuring all dropdowns from within appear above the Quick Links.

## Files to Modify

**`src/pages/Index.tsx`**

```typescript
// BEFORE (line 340-345):
<div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
  <SearchForm variant="directory" />
</div>

{/* Quick Links */}
<div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 animate-fade-in" ...>

// AFTER:
<div className="animate-fade-in relative z-20" style={{ animationDelay: "100ms" }}>
  <SearchForm variant="directory" />
</div>

{/* Quick Links */}
<div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 animate-fade-in relative z-0" ...>
```

This change:
- Gives the SearchForm container `z-20`, establishing a stacking context for all its dropdowns
- Gives the Quick Links `z-0`, ensuring they render below the SearchForm's dropdowns
- Both containers get `relative` to enable z-index participation

## Why This Works

With proper z-index hierarchy:
- Hero Section: `z-10`
- SearchForm Container: `z-20` (higher than siblings)
- Dropdown Menu: `z-[9999]` (highest within its context)
- Quick Links: `z-0` (lowest among siblings)

The Quick Links will now properly appear behind the dropdown menu, and clicks on the dropdown area will be captured by the dropdown rather than passing through to the links.

## Testing

After the fix:
1. Navigate to homepage
2. Click "Type of Care" dropdown
3. Verify dropdown opens and covers the Quick Links area
4. Click within the dropdown area where Quick Links appear visually underneath
5. Confirm the click selects a treatment type (not navigating to International Placement)
6. Repeat for "Insurance" dropdown
