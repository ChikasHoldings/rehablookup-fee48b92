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
  Megaphone,
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
  { id: "leads", name: "Inquiries & Plans", icon: Users, color: "bg-purple-500" },
  // Category id "placements" is preserved so existing ?category=placements
  // links keep resolving, but it now holds the FEATURED advertising articles.
  // The three Concierge Partner articles it used to hold were removed in the
  // directory cutover — that product is retired and must not be marketed.
  { id: "placements", name: "Featured Advertising", icon: Megaphone, color: "bg-teal-500" },
  { id: "billing", name: "Plan & Billing", icon: CreditCard, color: "bg-amber-500" },
  { id: "analytics", name: "Performance", icon: TrendingUp, color: "bg-cyan-500" },
  { id: "account", name: "Account & Security", icon: Shield, color: "bg-red-500" },
];

const articles: Article[] = [
  // ── Getting Started ──
  {
    id: "welcome-guide",
    title: "Welcome to the Provider Portal",
    excerpt: "Everything you need to get started — from listing setup to answering your first inquiries.",
    content: `
# Welcome to the Provider Portal

This guide walks you through every step from creating your listing to answering
your first inquiries.

## First Steps

1. **Complete Your Listing** — Go to **Listings** and fill in your facility name, address, description, services offered, insurance accepted, and images.
2. **Set Up Notifications** — In **Settings → Notifications**, enable email and SMS alerts for new inquiries so you never miss one.
3. **Choose a Plan** — Free gets you a directory listing that can receive inquiries. Pro ($99/mo) publishes your phone number and Call button, your enhanced profile, and richer media, manages up to 5 listings, and adds full performance reporting.

## Understanding Your Dashboard

Your dashboard shows at a glance:
- **Listings** — How many locations you manage and how many are live
- **Profile** — How complete your listing is
- **Inquiries** — New inquiries awaiting a reply
- **Search appearances** — How often your listing appeared in the directory

## Key Concepts

- **Inquiries** are created when a family submits a contact or tour request from your listing. An inquiry stays pinned to the one facility they selected — it is never reassigned or resold. Every eligible facility receives inquiries on any plan, with no per-inquiry fees, ever.
- **Pro** is a flat $99/month subscription that enhances how your listing presents and adds provider tools. It does not affect verification or organic directory position.
- **Featured** is separate, clearly labeled advertising, billed per location. It does not change your organic directory position.
- **Verification** is earned through our review of licensing, accreditation, and SAMHSA records. It is never sold.

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
- Contact email (used for inquiry notifications)
- Phone number
- Job title or role at your facility

## Notification Preferences

In **Settings > Notifications** you can control:
- **New inquiry alerts** — Instant email when a family submits an inquiry
- **Review activity** — Alerts when a review is submitted or published
- **Billing events** — Payment confirmations and renewal reminders

## Best Practices

- Use a professional email you check multiple times per day
- Add your direct phone number for urgent inquiry alerts
- Keep your info current — this is how we reach you about time-sensitive inquiries
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
    excerpt: "How to make your listing complete, accurate, and easy for families to evaluate.",
    content: `
# Optimizing Your Facility Listing

A complete, accurate listing gives families more to evaluate and more reason to
contact you. Everything in this guide is available on the Free plan.

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

## How organic position is determined

Your position in the directory is computed from listing signals only — profile
completeness, accuracy, and engagement with your listing.

**Organic position is never for sale.** A Pro subscription does not move your
listing up, and Featured advertising does not change your organic position
either — Featured is a clearly labeled sponsored slot shown alongside organic
results.

What you can actually influence:
- **Profile completeness** — fill every field; it costs nothing
- **Accuracy** — keep services, insurance, and contact details current
- **Responsiveness** — answer inquiries promptly

Verification is separate again: it is earned through our review of licensing,
accreditation, and SAMHSA records, and it is not purchasable.
    `,
    category: "listing",
    tags: ["optimization", "visibility", "SEO"],
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

1. Go to **Listings → Branding**
2. Click on the logo upload area
3. Select a square image (PNG, JPG, or WebP)
4. Your image is automatically optimized

**Recommended:** Square format, minimum 512×512 pixels

## Gallery Images

1. Navigate to **Listings → Gallery**
2. Click "Add Images" or drag and drop
3. Upload up to 10 images
4. Arrange them in your preferred display order

## Image Best Practices

- **Show variety:** exterior, bedrooms, common areas, dining, outdoor spaces
- **Use natural lighting** for the most inviting look
- **Keep file sizes under 10MB** per image (the upload limit) — WebP format is preferred for faster load times
- **Avoid stock photos** — families can tell, and it reduces trust
- Check our **Image Guidelines** page (accessible from Listings) for detailed specs
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

You can manage multiple facility listings under a single provider account. The Free plan includes 1 listing; Pro includes up to 5.

## Switching Between Facilities

Use the **facility selector dropdown** in the top header bar to switch between your locations. All dashboard data, leads, analytics, and settings update to reflect the selected facility.

## Adding a New Facility

1. Click the facility selector in the header
2. Select "Add Facility"
3. Complete the listing wizard for your new location
4. Each facility gets its own leads, analytics, and billing

## Important Notes

- The Free plan includes 1 listing; Pro includes up to 5 locations
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
    title: "Understanding the Inquiry Lifecycle",
    excerpt: "How inquiries reach your facility, what the statuses mean, and how to respond well.",
    content: `
# Understanding the Inquiry Lifecycle

An inquiry is how a family reaches your facility directly.

## How inquiries are created

When a family views your facility profile and submits a **Contact Request** or
**Tour Request**, it becomes an inquiry in your Inquiries inbox — with full
contact details visible to you immediately.

An inquiry stays **pinned to the one facility the family selected**. It is never
reassigned to another facility, never resold, and never shared with competitors.
There are no per-inquiry fees, no credits, and no unlock step on any plan.

## Do I need Pro?

No. Every eligible approved facility receives inquiries from its listing, on any
plan. Inquiry eligibility is not something Pro sells.

## Inquiry statuses

- **New** — Not yet actioned
- **Contacted** — You've made initial outreach
- **Responded** — The family replied to your outreach
- **Closed** — Conversation concluded

## Best practices

1. **Respond quickly** — the first hour matters most
2. **Use the Call button** for the highest connection rates
3. **Add notes** to track your conversations
4. **Export** as CSV for your CRM using the export button in the Inquiries section
    `,
    category: "leads",
    tags: ["inquiries", "response", "lifecycle"],
    readTime: 5,
    updatedAt: "2026-08-17"
  },
  {
    id: "plan-pricing",
    title: "Pricing & Plan Benefits",
    excerpt: "Free vs Pro, and Featured advertising — flat fees only, no per-inquiry charges.",
    content: `
# Pricing & Plan Benefits

RehabLookup uses a flat-fee subscription model. There are no per-inquiry charges,
no credit balances, and no per-placement fees.

## Free Plan — $0

| Feature | Included |
|---|---|
| Directory listing | Yes |
| Core listing editing | Yes |
| Up to 5 photos | Yes |
| Reviews and provider tools available on Free | Yes |
| Receive inquiries from your listing | Yes — eligible facilities, no fee |
| Per-inquiry charges | **None** |

## Pro Plan — $99/month, flat

| Feature | Included |
|---|---|
| Everything in Free | Yes |
| Public facility phone number + Call button on your listing | Yes |
| Enhanced profile published (programs, amenities, staff, accreditation highlights) | Yes |
| Rich media — up to 10 photos, video, virtual tour | Yes |
| Up to 5 facility listings | Yes (Free plan includes 1) |
| Full performance reporting (traffic sources, market position) | Yes |

Cancel anytime from **Plan & Billing**.

### What Pro does NOT include

Pro enhances your listing and provider tools. Verification and organic directory
position are determined independently and are never purchased with Pro.

| Not included | Why |
|---|---|
| Verified badge / verification | Earned through our review process |
| Higher organic position | Computed from listing signals only |
| Inquiry eligibility | Every eligible facility already receives inquiries |
| Featured placement | A separate product, priced and billed on its own |

## Featured advertising — $599/month per location

Featured is a separate advertising product. It is **not** included with Pro and
Pro includes no Featured placement.

| | |
|---|---|
| What it is | A sponsored slot in the Featured positions on the state, city, near-me, treatment-type, and insurance pages for your area |
| Labeling | Every placement carries a visible sponsored label |
| Rotation | Fair rotation among paying facilities in a geography — no bidding, no per-click charges |
| Organic position | Unchanged. Featured never affects organic ranking |
| Reporting | Featured has its own placement performance reporting while active |

## Viewing & Managing Your Plan

- **Plan & Billing** shows your current plan, next renewal date, and saved payment method
- **Featured** manages your sponsored placements, billed separately from your plan
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

Enable **instant email notifications** and keep your email open during business
hours. Families usually contact several facilities, so responding first is your
real advantage — not a window we impose.
    `,
    category: "leads",
    tags: ["notifications", "alerts", "email", "speed"],
    readTime: 3,
    updatedAt: "2026-04-09"
  },

  // ── Featured advertising ──
  // Replaces three Concierge Partner articles ("Concierge Partner Overview",
  // "Becoming a Concierge Partner", "Responding to Concierge Introductions").
  // That product is retired and must not be marketed to providers; the
  // "placements" category id is kept so existing links still resolve.
  {
    id: "featured-advertising",
    title: "Featured Advertising Explained",
    excerpt: "What Featured is, where sponsored placements appear, and why it never changes your organic position.",
    content: `
# Featured Advertising Explained

Featured is **advertising**. It buys your facility a sponsored slot in the
Featured positions on the directory pages for your area. It is a separate
product from your listing plan.

## Where sponsored placements appear

- State pages
- City pages
- Near-me pages
- Treatment-type pages
- Insurance pages

Every placement renders with a visible **sponsored label**, so families can
always tell advertising from organic results.

## How rotation works

Featured is flat-fee ad inventory, not an auction. Every paying facility in a
geography takes equal turns in the visible Featured slots:

- No bidding, no per-click charges
- Slot caps per geography (30 per state, 15 per major metro, 8 per smaller city)
  keep each facility's rotation share meaningful
- When a geography fills you can join the waitlist — existing subscribers never
  face a price hike

Calls from a Featured placement go directly to your admissions line. We never
intermediate the call.

## What Featured does NOT do

| | |
|---|---|
| Change your organic position | No. Organic position is computed from listing signals only |
| Come with Pro | No. Featured is priced and billed separately, per location |
| Affect verification | No. Verification is earned through our review process |
| Guarantee inquiries | No. It buys visibility in a labeled ad slot, nothing more |

## Pricing and management

Featured is **$599/month per location** (or annual, saving 15%). Each facility
you operate needs its own Featured subscription.

Manage it from **Featured** in the sidebar: pick placements from live slot
availability, edit your tagline, and review placement performance while active.

## Reporting

While Featured is active you get its own performance reporting — impressions,
calls, and profile views attributed per placement — separate from your listing's
organic performance in **Performance**.
    `,
    category: "placements",
    tags: ["featured", "advertising", "sponsored", "visibility"],
    readTime: 4,
    updatedAt: "2026-08-17"
  },

  // ── Billing & Pro ──
  {
    id: "how-billing-works",
    title: "How Billing Works",
    excerpt: "Free listings, flat-fee Pro, and separately billed Featured advertising — a complete billing overview.",
    content: `
# How Billing Works

RehabLookup uses a flat-fee subscription model. There are no per-inquiry charges,
no credits, and no per-placement fees.

## Free Listing

Every provider gets a free facility listing that includes:
- Public profile visible in the directory
- Facility details, services, and insurance displayed
- Core listing editing and headline performance figures
- Family contact form — inquiries arrive with full contact details, no fee

## Pro Subscription — $99/month

For facilities that want a richer listing and deeper reporting:
- **Public facility phone number + Call button** on your listing
- **Enhanced profile published** — programs, amenities, staff, accreditation highlights
- **Rich media** — up to 10 photos, video, virtual tour
- **Up to 5 facility listings** under one account
- Full performance reporting (traffic sources, market position)
- **Embed widgets** for your own website

Pro enhances your listing and provider tools. Verification and organic directory
position are determined independently and are never purchased with Pro.

Cancel anytime from **Plan & Billing**.

## Add-Ons (Pro-only)

- **Featured Add-On — $599/mo**: rotating placement on the homepage + state pages
(Featured is the only advertising product. It is billed separately from Pro, per location.)

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

- The Plan & Billing page shows your current plan (Free or Pro), any active Featured advertising, and your next renewal date
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

### Featured advertising
- While Featured is active: impressions and calls attributed per sponsored placement, reported separately from your organic performance

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
- Featured advertising activation

### Per-Facility
- Leads and lead history
- Analytics and performance data
- Listing content and images
- Featured placement configuration
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
