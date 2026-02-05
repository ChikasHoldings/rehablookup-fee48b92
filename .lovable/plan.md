

# Fix Panel Layout Shifting

## Summary
Stabilize layouts across Provider, Admin, and Seeker panels by adding CSS containment, consistent widths, and proper flex constraints.

## Changes

### 1. ProviderShell.tsx
- Change sidebar from `w-60 xl:w-64` to consistent `w-64`
- Add `isolate` to main container for stacking context
- Add `min-h-0` to flex children to prevent overflow

### 2. AdminShell.tsx
- Add `isolate` to root container
- Add `min-h-0` to flex row

### 3. SeekerShell.tsx
- Add `isolate` to root container
- Add `min-h-0` to main content

### 4. index.css
Add CSS containment rules:
```css
/* Layout stability for shells */
[data-shell] {
  contain: layout style;
}
```

## Technical Rationale

| Fix | Why It Works |
|-----|--------------|
| `w-64` (consistent) | Prevents 16px jump at 1280px breakpoint |
| `isolate` | Creates stacking context, prevents z-index bleed |
| `min-h-0` | Allows flex children to shrink, prevents overflow |
| `contain: layout` | Isolates reflows to contained element |

