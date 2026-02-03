

# Design Consistency Alignment Plan

## Overview

This plan standardizes the visual language across three high-value landing pages (Concierge, International, For Providers) to create a cohesive platform identity while preserving each page's unique content and conversion goals.

## Design System Baseline

**Reference**: ForProviders.tsx and Homepage (Index.tsx) establish the baseline patterns:
- Hero: Image background + dark gradient overlay + centered content
- Stats bar: Solid `bg-primary` background with accent icons
- Section headers: Uppercase primary label + bold h2 + muted description
- Content containers: max-w-5xl for sections, max-w-2xl for FAQ
- FAQ: Radix Accordion component

---

## Part 1: Concierge Landing Page Alignment

**File**: `src/pages/concierge/ConciergeLanding.tsx`

### 1.1 Hero Section Redesign

**Current**: Gradient-only background with pattern overlay
**Target**: Image background with dark overlay (like ForProviders)

```text
Changes:
- Add hero image (reuse existing asset or new concierge-specific image)
- Apply consistent gradient overlay: from-black/70 via-black/60 to-black/75
- Keep centered layout with trust badges below CTA
- Remove subtle pattern background
```

### 1.2 Stats Bar Standardization

**Current**: `bg-primary/10` (subtle, light)
**Target**: `bg-primary` (solid, like ForProviders)

```text
Changes:
- Change background from bg-primary/10 to bg-primary
- Update text colors from text-foreground to text-primary-foreground
- Add icons to each stat for visual consistency
- Adjust badge/pill styling for contrast
```

### 1.3 Section Headers Standardization

**Current**: Badge components with icons
**Target**: Uppercase label + h2 + p pattern

```text
Before (Concierge):
<Badge variant="outline" className="mb-3 sm:mb-4">
  <Zap className="h-3 w-3 mr-1" />
  Simple Process
</Badge>
<h2>How It Works</h2>

After (Standardized):
<p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2 sm:mb-3">
  How It Works
</p>
<h2>Three Simple Steps to Find Treatment</h2>
<p className="text-muted-foreground">...</p>
```

### 1.4 How It Works Steps Alignment

**Current**: Cards with step number in top-right corner badge
**Target**: Centered numbered circles in cards (like ForProviders)

### 1.5 FAQ Component Switch

**Current**: Custom useState-based expand/collapse
**Target**: Radix Accordion component

---

## Part 2: International Landing Page Alignment

**File**: `src/pages/international/InternationalLanding.tsx`

### 2.1 Hero Section Adjustment

**Current**: Full viewport height, left-aligned content, image visible on right
**Target**: Keep image but center content, standardize overlay gradient

```text
Changes:
- Change from left-aligned to centered layout
- Apply consistent gradient: from-black/70 via-black/60 to-black/75
- Reduce hero height from min-h-[calc(100svh-64px)] to standard py-16 md:py-24
- Move trust stats to stats bar below hero
```

### 2.2 Trust Bar Standardization

**Current**: `bg-foreground` (inverted/dark)
**Target**: `bg-primary` with accent icons

```text
Changes:
- Change from bg-foreground to bg-primary
- Update text from text-background to text-primary-foreground
- Add consistent icon treatment with accent color
```

### 2.3 Section Headers Addition

**Current**: Just h2 + p (no visual indicator)
**Target**: Add uppercase label pattern

```text
Before (International):
<h2>Why Choose U.S. Treatment?</h2>
<p>The United States has...</p>

After (Standardized):
<p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2 sm:mb-3">
  Why U.S. Treatment
</p>
<h2>World-Class Care, Complete Privacy</h2>
<p>The United States has...</p>
```

### 2.4 Steps Section Alignment

**Current**: "01", "02", "03" numbering with timeline
**Target**: Numbered circles in cards pattern

### 2.5 FAQ Accordion Conversion

**Current**: Custom useState expand/collapse
**Target**: Radix Accordion

---

## Part 3: Minor ForProviders Refinements

**File**: `src/pages/ForProviders.tsx`

This page is the baseline, but minor refinements for consistency:

### 3.1 Add Subtle Motion

Add Framer Motion to "How It Works" cards for consistent animation language:

```typescript
import { motion } from "framer-motion";

// Wrap step cards
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.5, delay: index * 0.1 }}
>
```

---

## Implementation Summary

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/concierge/ConciergeLanding.tsx` | Hero, stats bar, section headers, steps, FAQ |
| `src/pages/international/InternationalLanding.tsx` | Hero, trust bar, section headers, steps, FAQ |
| `src/pages/ForProviders.tsx` | Add motion animations (optional polish) |

### Design Tokens Standardized

| Element | Value |
|---------|-------|
| Hero gradient | `from-black/70 via-black/60 to-black/75` |
| Stats bar background | `bg-primary` |
| Stats bar text | `text-primary-foreground` |
| Section label | `text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide` |
| Content max-width | `max-w-5xl` |
| FAQ max-width | `max-w-2xl` |
| Step circles | `h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary text-primary-foreground` |

---

## Visual Comparison

### Before
```text
┌─────────────────────────────────────────────────────┐
│  ForProviders    │   Concierge    │  International  │
├─────────────────────────────────────────────────────┤
│  Image Hero      │  Gradient Hero │  Side Image     │
│  Solid Stats     │  Light Stats   │  Dark Stats     │
│  Uppercase Label │  Badge Label   │  No Label       │
│  Circle Steps    │  Corner Badge  │  Timeline       │
│  Accordion FAQ   │  Custom FAQ    │  Custom FAQ     │
└─────────────────────────────────────────────────────┘
```

### After
```text
┌─────────────────────────────────────────────────────┐
│  ForProviders    │   Concierge    │  International  │
├─────────────────────────────────────────────────────┤
│  Image Hero      │  Image Hero    │  Image Hero     │
│  Solid Stats     │  Solid Stats   │  Solid Stats    │
│  Uppercase Label │  Uppercase     │  Uppercase      │
│  Circle Steps    │  Circle Steps  │  Circle Steps   │
│  Accordion FAQ   │  Accordion FAQ │  Accordion FAQ  │
└─────────────────────────────────────────────────────┘
```

---

## Technical Details

### Concierge Hero Update

```typescript
// Before
<section className="relative overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-muted/30" />
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,...)]" />

// After
<section className="relative z-10 bg-primary">
  <img 
    src={conciergeHeroImg}
    alt=""
    role="presentation"
    className="absolute inset-0 w-full h-full object-cover object-center"
    fetchPriority="high"
  />
  <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/75" />
```

### Stats Bar Pattern

```typescript
// Standardized stats bar
<section className="border-b border-border bg-primary text-primary-foreground py-6 sm:py-8">
  <div className="container px-4 sm:px-5 md:px-6">
    <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4 text-center max-w-4xl mx-auto">
      {STATS.map((stat) => (
        <div key={stat.label} className="px-1">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-1">
            <stat.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent shrink-0" />
            <span className="text-xl sm:text-2xl md:text-3xl font-bold">{stat.value}</span>
          </div>
          <p className="text-[10px] sm:text-xs md:text-sm text-primary-foreground/80">{stat.label}</p>
        </div>
      ))}
    </div>
  </div>
</section>
```

### Section Header Pattern

```typescript
// Standardized section header
<div className="text-center mb-10 sm:mb-14">
  <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2 sm:mb-3">
    {sectionLabel}
  </p>
  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 sm:mb-4 px-2">
    {sectionTitle}
  </h2>
  <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto px-2">
    {sectionDescription}
  </p>
</div>
```

---

## Expected Outcome

After implementation, all three pages will share:
1. Consistent hero visual treatment (image + overlay)
2. Unified stats/trust bar styling
3. Standardized section header hierarchy
4. Matching "How It Works" step presentation
5. Consistent FAQ component behavior
6. Cohesive animation language

The pages will still maintain their unique:
- Content and messaging
- Pricing and CTAs
- Target audience focus
- Specific testimonials and stats

