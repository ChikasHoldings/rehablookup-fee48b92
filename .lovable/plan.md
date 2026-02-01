

# Fix: Homepage Hero Dropdown Z-Index Issue

## Problem Analysis

The "Type of Care" and "Insurance" dropdowns on the homepage hero are being clipped and hidden under the Trust Bar section.

**Root Cause**: The hero section has `overflow-hidden` applied:
```jsx
<section className="relative z-10 overflow-hidden">
```

This CSS property clips any child content (including dropdown menus) that extends beyond the section boundaries, regardless of z-index values.

## Solution

Remove `overflow-hidden` from the Hero section in `src/pages/Index.tsx`. The `overflow-hidden` was likely added to contain the background image, but the image already uses `object-cover` and `absolute inset-0` positioning, so the overflow constraint is unnecessary.

## File Changes

**File**: `src/pages/Index.tsx`

**Change** (line 304):
- From: `<section className="relative z-10 overflow-hidden">`
- To: `<section className="relative z-10">`

## Impact Assessment

- **Visual**: No visual change to the hero section layout
- **Functionality**: Dropdown menus will now properly extend beyond the hero section boundaries
- **Risk**: None - the background image is already constrained by `absolute inset-0` positioning
- **Performance**: No impact

## Technical Details

The `MultiSelectDropdown` component already has the correct z-index (`z-[9999]`) and solid background styling (`bg-card`). Once the `overflow-hidden` constraint is removed, the dropdowns will layer correctly above the Trust Bar.

