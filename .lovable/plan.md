
# Update PlacementBenefits to Show International Fee with Pro Discount

## Overview
Update the PlacementBenefits component to:
1. Change the international placement fee from **$4,500** to **$3,000**
2. Add Pro Member pricing for international placements (**$2,400** with 20% discount)
3. Match the domestic section's layout showing both Standard and Pro pricing

---

## Changes

### File: `src/components/provider/placement-network/PlacementBenefits.tsx`

**Current International Section (lines 64-82):**
- Shows only "Flat Fee: $4,500"
- No Pro discount shown

**Updated International Section:**
- Standard: $3,000
- Pro Member: $2,400 (20% discount)
- Same layout as the domestic section with both pricing tiers

### Layout Update
```text
┌─────────────────────────────────────┐
│ 🌐 International Placements         │
│ Global clients seeking US treatment │
│                                     │
│ Standard          $3,000            │
│ Pro Member        $2,400  (green)   │
│                                     │
│ Higher-value • Longer stays • PP    │
└─────────────────────────────────────┘
```

---

## Summary
| Placement Type | Standard | Pro (20% off) |
|---------------|----------|---------------|
| Domestic      | $1,000   | $800          |
| International | $3,000   | $2,400        |
