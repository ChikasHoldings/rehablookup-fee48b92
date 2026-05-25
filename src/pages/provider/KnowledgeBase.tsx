import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { 
  Search, 
  BookOpen, 
  FileText, 
  Users, 
  CreditCard, 
  TrendingUp,
  Shield,
  Clock,
  ChevronRight,
  ArrowLeft,
  X,
  Handshake,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArticleRenderer } from "@/components/provider/knowledge-base/ArticleRenderer";

interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  readTime: number;
  updatedAt: string;
}

const categories = [
  { id: "getting-started", name: "Getting Started", icon: BookOpen, color: "bg-blue-500" },
  { id: "listing", name: "Managing Your Listing", icon: FileText, color: "bg-green-500" },
  { id: "leads", name: "Leads & Plans", icon: Users, color: "bg-purple-500" },
  // Category id "placements" intentionally preserved so existing
  // ?category=placements links (from Help.tsx helpTopics and any
  // outbound documentation) keep working — only the display name
  // updates to the current product (Concierge Partner).
  { id: "placements", name: "Concierge Partner", icon: Handshake, color: "bg-teal-500" },
  { id: "billing", name: "Billing & Pro", icon: CreditCard, color: "bg-amber-500" },
  { id: "analytics", name: "Analytics & Insights", icon: TrendingUp, color: "bg-cyan-500" },
  { id: "account", name: "Account & Security", icon: Shield, color: "bg-red-500" },
];

const articles: Article[] = [
  // ── Getting Started ──
  {
    id: "welcome-guide",
    title: "Welcome to the Provider Portal",
    excerpt: "Everything you need to know to get started — from listing setup to receiving your first leads.",
    content: `
# Welcome to the Provider Portal

This guide walks you through every step from creating your listing to receiving and converting leads.

## First Steps

1. **Complete Your Listing** — Go to **My Listing** and fill in your facility name, address, description, services offered, insurance accepted, and images.
2. **Set Up Notifications** — In **Settings > Notifications**, enable email and SMS alerts for new leads so you never miss an inquiry.
3. **Choose a Plan** — Free gets you a directory listing. Pro ($99/mo) unlocks verified badge, lead analytics, priority placement, and the Marketing Hub (Featured + Concierge add-ons).

## Understanding Your Dashboard

Your dashboard shows at a glance:
- **Profile Views** — How many families viewed your listing this period
- **Active Leads** — New and in-progress leads awaiting action
- **Placement Opportunities** — Pending introductions surfaced by our concierge advisors
- **Listing Status** — Whether your facility profile is live and visible in search results

## Key Concepts

- **Leads** are generated when a family submits a contact or tour request from your listing. They're exclusive to your facility for 24 hours, with full contact details visible to you immediately — no per-lead fees, ever.
- **Pro plan** is a flat $99/month per provider account: verified badge, lead analytics, +50 ranking boost, 10 photos + video, Marketing Hub.
- **Placements** are referrals from our concierge advisors matching pre-screened families to your facility. EKRA-compliant: advisors always present at least two non-partner alternatives alongside any Concierge partner.

## Need Help?

Visit **Help & Support** in the sidebar or email providers@rehablookup.com.
    `,
    category: "getting-started",
    tags: ["onboarding", "setup", "basics"],
    readTime: 5,
    updatedAt: "2026-04-10"
  },
  {
    id: "profile-setup",
    title: "Setting Up Your Provider Profile",
    excerpt: "Configure your personal account info, notification preferences, and security settings.",
    content: `
# Setting Up Your Provider Profile

Your provider profile is your personal account, separate from your facility listing.

## Profile Information

Navigate to **Settings > Profile** to update:
- First and last name
- Contact email (used for lead notifications)
- Phone number
- Job title or role at your facility

## Notification Preferences

In **Settings > Notifications** you can control:
- **New lead alerts** — Instant email when a family submits an inquiry
- **Placement introductions** — Alerts when our concierge team sends a matched case
- **Billing events** — Payment confirmations and low-balance warnings

## Best Practices

- Use a professional email you check multiple times per day
- Add your direct phone number for urgent lead alerts
- Keep your info current — this is how we reach you about time-sensitive leads
    `,
    category: "getting-started",
    tags: ["profile", "setup", "account", "notifications"],
    readTime: 3,
    updatedAt: "2026-04-08"
  },

  // ── Listing Management ──
  {
    id: "optimize-listing",
    title: "Optimizing Your Facility Listing",
    excerpt: "Proven strategies to increase visibility, attract higher-quality leads, and rank higher in search results.",
    content: `
# Optimizing Your Facility Listing

A complete, accurate listing directly impacts your visibility and the quality of leads you receive.

## Essential Elements

### 1. Compelling Description
Write a clear, compassionate description that covers:
- Your treatment philosophy and approach
- Unique programs or clinical specializations
- Patient outcomes and differentiators
- Facility amenities and environment

### 2. High-Quality Images
- Upload your facility logo (square, min 512×512px)
- Add up to 10 gallery images in WebP or JPG format
- Showcase living spaces, treatment areas, outdoor spaces, and common areas
- Avoid stock photos — authentic images build trust

### 3. Complete Service Details
- List every treatment program you offer (residential, PHP, IOP, detox, etc.)
- Include all accepted insurance providers
- Specify age groups served and gender policies
- Add accreditations and licensing info

## Ranking Factors

Your position in search results is influenced by:
- **Profile completeness** — Listings with all fields filled rank higher
- **Response rate** — Facilities that respond quickly to leads get a boost
- **Verification status** — Verified facilities earn a trust badge
- **Pro membership** — Pro subscribers get featured placement and priority ranking
    `,
    category: "listing",
    tags: ["optimization", "visibility", "ranking", "SEO"],
    readTime: 6,
    updatedAt: "2026-04-12"
  },
  {
    id: "upload-images",
    title: "Uploading Facility Images",
    excerpt: "A step-by-step guide to adding your logo and gallery photos for maximum impact.",
    content: `
# Uploading Facility Images

Quality images help families visualize your facility and make confident decisions.

## Logo Upload

1. Go to **My Listing > Branding**
2. Click on the logo upload area
3. Select a square image (PNG, JPG, or WebP)
4. Your image is automatically optimized

**Recommended:** Square format, minimum 512×512 pixels

## Gallery Images

1. Navigate to **My Listing > Gallery**
2. Click "Add Images" or drag and drop
3. Upload up to 10 images
4. Arrange them in your preferred display order

## Image Best Practices

- **Show variety:** exterior, bedrooms, common areas, dining, outdoor spaces
- **Use natural lighting** for the most inviting look
- **Keep file sizes under 5MB** per image — WebP format is preferred for faster load times
- **Avoid stock photos** — families can tell, and it reduces trust
- Check our **Image Guidelines** page (accessible from My Listing) for detailed specs
    `,
    category: "listing",
    tags: ["images", "photos", "branding", "gallery"],
    readTime: 4,
    updatedAt: "2026-04-05"
  },
  {
    id: "multiple-facilities",
    title: "Managing Multiple Facility Listings",
    excerpt: "How to manage multiple facility listings from a single provider account.",
    content: `
# Managing Multiple Facility Listings

You can manage unlimited facility listings under a single provider account — there is no cap on any plan.

## Switching Between Facilities

Use the **facility selector dropdown** in the top header bar to switch between your locations. All dashboard data, leads, analytics, and settings update to reflect the selected facility.

## Adding a New Facility

1. Click the facility selector in the header
2. Select "Add Facility"
3. Complete the listing wizard for your new location
4. Each facility gets its own leads, analytics, and billing

## Important Notes

- Listings are unlimited on every plan — add as many locations as you operate
- Each facility has its own set of leads — they are never mixed
- Pro is a per-facility subscription ($99/mo flat) — upgrade each location you want Pro benefits on
- Analytics can be viewed per-facility or rolled up across facilities
    `,
    category: "listing",
    tags: ["multi-facility", "Pro", "management"],
    readTime: 3,
    updatedAt: "2026-04-10"
  },

  // ── Leads ──
  {
    id: "managing-leads",
    title: "Understanding the Lead Lifecycle",
    excerpt: "How leads are generated, the 24-hour exclusivity window, and best practices for conversion.",
    content: `
# Understanding the Lead Lifecycle

Leads are the core of how families connect with your facility.

## How Leads Are Created

When a family views your facility profile and submits a **Contact Request** or **Tour Request**, it becomes a lead assigned exclusively to your facility — with full contact details visible to you immediately. No per-lead fees, no credits, no unlock step.

## The 24-Hour Exclusivity Window

Each lead is exclusive to your facility for **24 hours**. If you don't respond within that window, it may be redistributed to other matching facilities. This encourages fast response times.

## Lead Statuses

- **New** — Fresh lead, ready for outreach
- **Contacted** — You've made initial outreach
- **Responded** — The family replied to your outreach
- **Closed** — Conversation concluded

## Best Practices

1. **Respond within 1 hour** — Faster responses dramatically increase conversion
2. **Use the Call Now button** immediately for highest connection rates
3. **Add notes** to track your conversations
4. **Export leads** as CSV for your CRM using the export button in the Leads section
    `,
    category: "leads",
    tags: ["leads", "conversion", "exclusivity"],
    readTime: 5,
    updatedAt: "2026-05-17"
  },
  {
    id: "plan-pricing",
    title: "Pricing & Plan Benefits",
    excerpt: "Free vs Pro, the Featured Add-On, and the Concierge Add-On — flat fees only, no per-lead charges.",
    content: `
# Pricing & Plan Benefits

RehabLookup uses a flat-fee subscription model. There are no per-lead charges, no credit balances, and no per-placement fees.

## Free Plan

| Feature | Included |
|---|---|
| Directory listing | Yes |
| Family contact form | Yes |
| Up to 5 photos | Yes |
| Basic dashboard | Yes |
| Per-lead charges | **None** |

## Pro Plan — $99/month, flat

| Feature | Included |
|---|---|
| Everything in Free | Yes |
| Verified badge | Yes |
| Lead analytics + response insights | Yes |
| Priority placement (+50 ranking) | Yes |
| 10 photos + 1 facility video | Yes |
| Marketing Hub (Featured + Concierge add-ons) | Yes |
| Unlimited facility listings | Yes (any plan) |

Cancel anytime from **Billing**.

## Add-Ons (Pro-only)

| Add-On | Price | What you get |
|---|---|---|
| **Featured** | $599/mo | Rotating placement on the homepage + state pages |
| **Concierge** | $1,000/mo | Verified-partner badge in advisor matching; EKRA-compliant (advisors always present ≥2 non-partner alternatives) |

## Viewing & Managing Your Plan

- **Billing** page shows your current plan, next renewal date, and saved payment method
- **Marketing Hub** lets Pro users add or remove Featured / Concierge add-ons
- **Provider Panel sidebar** shows your active plan at a glance
    `,
    category: "leads",
    tags: ["pricing", "plans", "billing", "add-ons"],
    readTime: 4,
    updatedAt: "2026-05-17"
  },
  {
    id: "lead-notifications",
    title: "Configuring Lead Notifications",
    excerpt: "Set up instant alerts so you never miss a time-sensitive lead.",
    content: `
# Configuring Lead Notifications

Speed matters — families often contact multiple facilities. Being first to respond gives you the best chance of admission.

## Notification Channels

### Email Notifications
- **Instant alerts** for each new lead (recommended)
- Daily or weekly digest summaries

### In-App Notifications
- Bell icon in the header shows unread count
- Click to see recent leads and placement introductions

## Setting Up Notifications

1. Go to **Settings > Notifications**
2. Toggle on your preferred alert types
3. Choose frequency: Instant, Daily Digest, or Weekly Digest
4. Save changes

## Pro Tip

Enable **instant email notifications** and keep your email open during business hours. The 24-hour exclusivity window means speed is your competitive advantage.
    `,
    category: "leads",
    tags: ["notifications", "alerts", "email", "speed"],
    readTime: 3,
    updatedAt: "2026-04-09"
  },

  // ── Concierge Partner ──
  // The legacy success-based Placement Network was retired in the
  // 2026-05 monetization rebuild and replaced with the Concierge
  // Add-On — a flat $1,000/mo subscription. These articles describe
  // the current product. (Article IDs renamed to match.)
  {
    id: "concierge-overview",
    title: "Concierge Partner Overview",
    excerpt: "How human advisors match pre-screened families to your facility — flat fee, EKRA-clean, no per-admission charges.",
    content: `
# Concierge Partner Overview

The Concierge Partner Add-On is a premium surface that puts your facility in front of pre-screened, treatment-ready families when our human advisors match a case to your geography and accepted levels of care.

## How It Works

1. **Family submits intake** — A seeker completes a detailed intake form (location, insurance, levels of care, urgency).
2. **An advisor reviews** — A RehabLookup care advisor reads the intake and shortlists facilities that fit the clinical and logistical criteria.
3. **You receive an introduction** — Matched cases appear on the Inquiries page with full contact details. You also get an email + in-app notification.
4. **You respond** — Mark each case Interested or Not interested. If interested, you can call/text the family directly.
5. **Coordination** — Our advisor stays in the loop to help with tour scheduling and admission questions when asked.

## EKRA-safe by design

Advisors always present at least two non-partner alternatives alongside any Concierge partner. Pricing is a flat subscription — never per-call, per-lead, or per-admission. The whole product is built to keep your operations clean under 18 U.S.C. § 220.

## What you pay

- **Flat $1,000/month** for the Concierge Add-On (Pro-only, billed via Stripe).
- **No per-admission, per-call, or per-lead fees** — ever.
- **No commission** on placements.
- The add-on is independent of your Pro subscription — you can cancel it at any time without losing Pro itself.
    `,
    category: "placements",
    tags: ["concierge", "referrals", "EKRA", "add-on"],
    readTime: 5,
    updatedAt: "2026-05-24"
  },
  {
    id: "becoming-concierge-partner",
    title: "Becoming a Concierge Partner",
    excerpt: "Step-by-step guide to subscribing, setting your service area, and configuring the levels of care you accept.",
    content: `
# Becoming a Concierge Partner

The add-on activates instantly once you're subscribed. Setup takes about 5 minutes.

## Prerequisites

1. **Pro subscription** — Concierge is a Pro-only add-on. Subscribe to Pro from **Subscription** in the sidebar if you haven't already.
2. **Verified facility profile** — Your listing must be approved by admin (typically same business day after onboarding).

## Steps to subscribe

1. Navigate to **Marketing → Concierge Partner**.
2. Click **Become a Concierge Partner**.
3. Complete Stripe checkout for the $1,000/month add-on.
4. Configure your concierge geography:
   - **Service areas** — Cities or states where you accept new admissions.
   - **Levels of care** — Residential, PHP, IOP, Detox, Sober Living, Telehealth, Outpatient.
   - **Capacity cap** — Optional monthly intro limit so the advisor team doesn't overwhelm your admissions line.
5. Add an admissions contact (name + phone + email) so the family knows who to call when matched.

## Pausing or stopping

You can pause new introductions at any time from the Concierge management panel — useful when you're at capacity. Cancel the add-on entirely from **Subscription → Manage add-ons**; Pro stays active.
    `,
    category: "placements",
    tags: ["onboarding", "concierge", "geography", "levels-of-care"],
    readTime: 4,
    updatedAt: "2026-05-24"
  },
  {
    id: "responding-to-concierge-intros",
    title: "Responding to Concierge Introductions",
    excerpt: "What lands when an advisor matches a family to your facility, how to review it, and what counts as a good response.",
    content: `
# Responding to Concierge Introductions

When a RehabLookup care advisor matches a family to your facility, here's what happens on your end.

## Where it shows up

Every concierge introduction lands in three places at once:
- **Inquiries** — The full case appears on the same queue as your direct leads (filterable by inquiry type).
- **Notifications** — An in-app notification with the case summary.
- **Email + SMS** — If you've enabled those channels in Settings → Notifications.

## What you'll see

Each intro includes:
- **Family contact details** — Name, phone, email (full contact, not anonymized — you're a verified partner).
- **Care needs** — Primary concern, level of care, co-occurring conditions.
- **Insurance** — Carrier and coverage estimate.
- **Location** — Where the family is searching.
- **Urgency** — How quickly they need admission.

## How to respond

1. Open the inquiry from your Leads page.
2. Mark it **Interested** or **Not interested**.
3. If interested, call or email the family within 2 business hours — concierge cases convert significantly better when the first response is fast.
4. Add notes back in the inquiry record so the advisor team knows the outcome (toured, admitted, declined).

## What good looks like

The strongest concierge partners respond within an hour, follow up with a tour offer, and keep the inquiry notes current so the advisor can step in if the family has follow-up questions. Your response rate and outcome metrics are visible on your Analytics page.
    `,
    category: "placements",
    tags: ["introductions", "response", "coordination", "cases"],
    readTime: 4,
    updatedAt: "2026-05-24"
  },

  // ── Billing & Pro ──
  {
    id: "how-billing-works",
    title: "How Billing Works",
    excerpt: "Free listings, flat-fee Pro membership, and optional Featured / Concierge add-ons — a complete billing overview.",
    content: `
# How Billing Works

RehabLookup uses a flat-fee subscription model. There are no per-lead charges, no credits, and no per-placement fees.

## Free Listing

Every provider gets a free facility listing that includes:
- Public profile visible in search results
- Facility details, services, and insurance displayed
- Basic analytics dashboard
- Family contact form — direct inquiries delivered to you with full contact details, no per-lead fees

## Pro Subscription — $99/month

For facilities wanting maximum exposure:
- **Verified badge** on your listing
- **Lead analytics** + response insights
- **Priority placement** on city / state pages (+50 ranking boost)
- **10 photos + 1 facility video**
- **Marketing Hub** unlocked (Featured + Concierge add-ons)
- **Up to 5 facility listings** under one account
- **Embed badge** for your website

Cancel anytime from the billing page.

## Add-Ons (Pro-only)

- **Featured Add-On — $599/mo**: rotating placement on the homepage + state pages
- **Concierge Add-On — $1,000/mo**: verified-partner badge in advisor matching (EKRA-compliant)

## Payment Methods

All payments are processed securely via Stripe. We accept Visa, Mastercard, Amex, and corporate cards.
    `,
    category: "billing",
    tags: ["billing", "Pro", "pricing", "add-ons"],
    readTime: 4,
    updatedAt: "2026-05-17"
  },
  {
    id: "manage-subscription",
    title: "Managing Your Subscription & Payments",
    excerpt: "Update payment methods, view invoices, and manage your Pro subscription and add-ons.",
    content: `
# Managing Your Subscription & Payments

All billing management is available on the **Billing** page (in the sidebar).

## Viewing Plan & Add-Ons

- The Billing page shows your current plan (Free or Pro), any active add-ons (Featured / Concierge), and your next renewal date
- The sidebar shows your active plan at a glance

## Managing Your Pro Subscription

If you're a Pro subscriber:
1. Go to **Billing**
2. Click **"Manage Subscription"**
3. From the Stripe billing portal, you can:
   - View and download past invoices
   - Update your payment method
   - Change your billing address
   - Cancel or modify your subscription

## Invoices

- Pro subscription invoices are sent monthly (or annually if you chose annual billing)
- Add-on invoices are sent on the same renewal cycle as Pro
- All invoices are downloadable from the billing portal
    `,
    category: "billing",
    tags: ["payment", "subscription", "invoices", "Pro"],
    readTime: 3,
    updatedAt: "2026-05-17"
  },

  // ── Analytics ──
  {
    id: "understanding-analytics",
    title: "Understanding Your Analytics Dashboard",
    excerpt: "Profile views, lead volume, response times, and placement activity — explained.",
    content: `
# Understanding Your Analytics Dashboard

The Analytics page gives you data-driven insights into your facility's performance.

## Key Metrics

### Profile Views
- Total views of your facility listing over the selected period
- Helps you understand your visibility and the effectiveness of your listing content

### Lead Volume
- Number of new leads received
- Broken down by inquiry type (contact request, tour request)

### Response Time
- Average time between receiving a lead and making contact
- Faster response times correlate with higher conversion rates

### Concierge Activity
- If you have the Concierge Add-On: advisor introductions received, your interest responses, and successful admissions

## Date Range Filters

View your data across different periods:
- **This Week** — Current 7-day period
- **This Month** — Current calendar month
- **This Quarter** — Current 3-month period
- **Custom Range** — Pick any start and end date

## Using Analytics to Improve

- **Low views?** Update your listing description and add more images
- **Low lead volume?** Ensure your service categories and insurance match what families are searching for
- **Slow response time?** Enable instant email + SMS notifications and prioritize same-day responses
    `,
    category: "analytics",
    tags: ["metrics", "performance", "data", "reporting"],
    readTime: 5,
    updatedAt: "2026-04-10"
  },

  // ── Account & Security ──
  {
    id: "account-security",
    title: "Securing Your Account",
    excerpt: "Password best practices, session management, and how to report security concerns.",
    content: `
# Securing Your Account

Your account contains sensitive lead data and billing information. Keep it protected.

## Password Best Practices

- Use at least 12 characters
- Mix uppercase, lowercase, numbers, and symbols
- Never reuse passwords across services
- Update your password periodically

## Changing Your Password

1. Go to **Settings > Security**
2. Enter your current password
3. Create a new strong password
4. Confirm and save

## Session Management

### Activity Log
Monitor your account activity including:
- Login history with timestamps
- Password changes
- Settings modifications

### Sign Out All Sessions
If you suspect unauthorized access:
1. Go to **Settings > Security**
2. Click **"Sign Out All Sessions"**
3. Change your password immediately
4. Log back in

## Reporting Security Issues

Contact providers@rehablookup.com immediately for:
- Suspicious account activity
- Unauthorized access attempts
- Any security concerns

For urgent security matters, include **"URGENT: Security"** in the subject line.
    `,
    category: "account",
    tags: ["security", "password", "sessions", "safety"],
    readTime: 4,
    updatedAt: "2026-04-06"
  },
  {
    id: "facility-switching",
    title: "Switching Facilities & Account Roles",
    excerpt: "How to switch between facilities and understand your account permissions.",
    content: `
# Switching Facilities & Account Roles

If you manage multiple facilities, here's how navigation works.

## Facility Selector

The **facility dropdown** in the top header lets you switch between your listings. When you switch:
- The dashboard updates to show data for the selected facility
- Leads, analytics, and billing reflect the selected location
- Settings remain account-wide (profile, notifications, security)

## What's Shared vs. Per-Facility

### Shared (Account-Wide)
- Profile information
- Notification preferences
- Pro subscription status + saved payment method
- Featured / Concierge add-on activation

### Per-Facility
- Leads and lead history
- Analytics and performance data
- Listing content and images
- Concierge Add-On configuration + advisor introductions
- Reviews

## Adding or Removing Facilities

- **Add:** Use the facility selector > "Add Facility" (Pro members only, up to 5)
- **Remove:** Contact support to deactivate a facility listing
    `,
    category: "account",
    tags: ["multi-facility", "switching", "permissions", "roles"],
    readTime: 3,
    updatedAt: "2026-04-10"
  },
];

export default function ProviderKnowledgeBasePage() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Read category from URL on mount (e.g. ?category=placements)
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat && categories.some(c => c.id === cat)) {
      setSelectedCategory(cat);
    }
  }, [searchParams]);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = q === "" || 
        article.title.toLowerCase().includes(q) ||
        article.excerpt.toLowerCase().includes(q) ||
        article.tags.some(tag => tag.toLowerCase().includes(q));
      
      const matchesCategory = !selectedCategory || article.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const articlesByCategory = useMemo(() => {
    const grouped: Record<string, Article[]> = {};
    filteredArticles.forEach((article) => {
      if (!grouped[article.category]) grouped[article.category] = [];
      grouped[article.category].push(article);
    });
    return grouped;
  }, [filteredArticles]);

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
  };

  return (
    <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link to="/provider/help" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
                Knowledge Base
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {articles.length} articles covering every feature of the provider portal
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles, guides, and tutorials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
          {(searchQuery || selectedCategory) && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2"
              onClick={clearFilters}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.id;
            const count = articles.filter(a => a.category === category.id).length;
            
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(isSelected ? null : category.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isSelected 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {category.name}
                <span className={`text-xs ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Results */}
        {filteredArticles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg">No articles found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Try adjusting your search or filters
              </p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear filters
              </Button>
            </CardContent>
          </Card>
        ) : selectedCategory ? (
          <div className="space-y-4">
            {filteredArticles.map((article) => (
              <Card 
                key={article.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedArticle(article)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {article.readTime} min read
                        </span>
                        <div className="flex gap-1">
                          {article.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map((category) => {
              const categoryArticles = articlesByCategory[category.id];
              if (!categoryArticles || categoryArticles.length === 0) return null;
              
              const Icon = category.icon;
              
              return (
                <div key={category.id}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`p-1.5 rounded-lg ${category.color} text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h2 className="font-semibold">{category.name}</h2>
                    <span className="text-sm text-muted-foreground">
                      ({categoryArticles.length})
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {categoryArticles.map((article) => (
                      <Card 
                        key={article.id} 
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedArticle(article)}
                      >
                        <CardContent className="py-4">
                          <h3 className="font-medium text-sm hover:text-primary transition-colors line-clamp-1">
                            {article.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {article.excerpt}
                          </p>
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {article.readTime} min read
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Article Detail Dialog */}
        <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
            {selectedArticle && (
              <>
                <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    {(() => {
                      const cat = getCategoryInfo(selectedArticle.category);
                      if (!cat) return null;
                      const CatIcon = cat.icon;
                      return (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <CatIcon className="h-3 w-3" />
                          {cat.name}
                        </Badge>
                      );
                    })()}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {selectedArticle.readTime} min read
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      Updated {new Date(selectedArticle.updatedAt).toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'short', day: 'numeric' 
                      })}
                    </span>
                  </div>
                  <DialogTitle className="text-lg leading-tight">{selectedArticle.title}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">{selectedArticle.excerpt}</p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                  <div className="px-6 py-5">
                    <ArticleRenderer content={selectedArticle.content} />

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-8 pt-4 border-t border-border/50">
                      {selectedArticle.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Related Articles */}
                    {(() => {
                      const relatedArticles = articles
                        .filter(a => 
                          a.id !== selectedArticle.id && 
                          (a.category === selectedArticle.category || 
                           a.tags.some(tag => selectedArticle.tags.includes(tag)))
                        )
                        .slice(0, 3);
                      
                      if (relatedArticles.length === 0) return null;
                      
                      return (
                        <div className="mt-5 pt-4 border-t border-border/50">
                          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            Related Articles
                          </h4>
                          <div className="space-y-2">
                            {relatedArticles.map((article) => (
                              <button
                                key={article.id}
                                onClick={() => setSelectedArticle(article)}
                                className="w-full text-left p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-colors group"
                              >
                                <p className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">
                                  {article.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                  {article.excerpt}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5" />
                                    {article.readTime} min
                                  </span>
                                  {(() => {
                                    const cat = getCategoryInfo(article.category);
                                    if (!cat) return null;
                                    return (
                                      <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                                        {cat.name}
                                      </Badge>
                                    );
                                  })()}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
