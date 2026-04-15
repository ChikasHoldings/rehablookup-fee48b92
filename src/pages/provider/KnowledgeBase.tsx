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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  { id: "leads", name: "Leads & Credits", icon: Users, color: "bg-purple-500" },
  { id: "placements", name: "Placement Network", icon: Handshake, color: "bg-teal-500" },
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
2. **Set Up Notifications** — In **Settings > Notifications**, enable email alerts for new leads so you never miss an inquiry.
3. **Purchase Credits** — Navigate to **Billing** to buy credits you'll use to unlock lead contact details.

## Understanding Your Dashboard

Your dashboard shows at a glance:
- **Profile Views** — How many families viewed your listing this period
- **Active Leads** — New and in-progress leads awaiting action
- **Placement Opportunities** — If you've opted into the Placement Network, pending introductions appear here
- **Listing Status** — Whether your facility profile is live and visible in search results

## Key Concepts

- **Leads** are generated when a family submits a contact or tour request from your listing. They're exclusive to your facility for 24 hours.
- **Credits** are the currency you use to unlock a lead's full contact details (name, email, phone).
- **Placements** are referrals from our concierge team matching pre-screened families to your facility — you pay only when a patient is admitted.

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
    excerpt: "How Pro members manage up to 5 facilities from a single provider account.",
    content: `
# Managing Multiple Facility Listings

Pro members can manage up to 5 facility listings under one account.

## Switching Between Facilities

Use the **facility selector dropdown** in the top header bar to switch between your locations. All dashboard data, leads, analytics, and settings update to reflect the selected facility.

## Adding a New Facility

1. Click the facility selector in the header
2. Select "Add Facility"
3. Complete the listing wizard for your new location
4. Each facility gets its own leads, analytics, and billing

## Important Notes

- Free accounts are limited to 1 facility listing
- Each facility has its own set of leads — they are never mixed
- Credit balances are shared across your account
- Analytics can be viewed per-facility
    `,
    category: "listing",
    tags: ["multi-facility", "Pro", "management"],
    readTime: 3,
    updatedAt: "2026-04-10"
  },

  // ── Leads & Credits ──
  {
    id: "managing-leads",
    title: "Understanding the Lead Lifecycle",
    excerpt: "How leads are generated, the 24-hour exclusivity window, unlocking, and best practices for conversion.",
    content: `
# Understanding the Lead Lifecycle

Leads are the core of how families connect with your facility.

## How Leads Are Created

When a family views your facility profile and submits a **Contact Request** or **Tour Request**, it becomes a lead assigned exclusively to your facility.

## The 24-Hour Exclusivity Window

Each lead is exclusive to your facility for **24 hours**. If you don't unlock it within that window, it may be redistributed to other matching facilities. This encourages fast response times.

## Lead Preview vs. Unlock

- **Preview (free):** You see the inquiry type, general location, care needs, insurance type, and timestamp
- **Unlock (costs credits):** Reveals the family's full contact details — name, email, phone — so you can reach out directly

## Lead Statuses

- **New** — Fresh lead, not yet unlocked
- **Locked** — Preview visible, contact details hidden
- **Unlocked** — Contact details revealed, ready for outreach
- **Contacted** — You've made initial outreach
- **Responded** — The family replied to your outreach

## Best Practices

1. **Respond within 1 hour** — Faster responses dramatically increase conversion
2. **Use the Call Now button** immediately after unlocking for highest connection rates
3. **Add notes** to track your conversations
4. **Export leads** as CSV for your CRM using the export button in the Leads section
    `,
    category: "leads",
    tags: ["leads", "conversion", "exclusivity", "unlock"],
    readTime: 6,
    updatedAt: "2026-04-11"
  },
  {
    id: "credits-explained",
    title: "How Credits Work",
    excerpt: "Purchase tiers, bonus credits, Pro discounts, and auto-reload — everything about the credit system.",
    content: `
# How Credits Work

Credits are the currency you use to unlock lead contact details.

## Purchasing Credits

Navigate to **Billing** to buy credits. Available tiers:

| Tier | Cost | Bonus | Total Value |
|------|------|-------|-------------|
| Starter | $200 | — | $200 |
| Growth | $500 | +10% ($50) | $550 |
| Scale | $1,000 | +20% ($200) | $1,200 |

## Pro Discount

Pro subscribers save **20% on every lead unlock**. This discount is applied automatically when you unlock a lead.

## Auto-Reload

Never run out of credits unexpectedly:
1. Go to **Billing > Auto-Reload**
2. Set a minimum balance threshold
3. Choose a reload amount ($200, $500, or $1,000)
4. When your balance drops below the threshold, credits are purchased automatically

## Viewing Your Balance

Your current credit balance is always visible:
- In the **sidebar** at the bottom
- On the **Billing** page
- In the **dashboard** summary strip
    `,
    category: "leads",
    tags: ["credits", "billing", "auto-reload", "Pro discount"],
    readTime: 4,
    updatedAt: "2026-04-09"
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

  // ── Placement Network ──
  {
    id: "placement-overview",
    title: "Placement Network Overview",
    excerpt: "How our concierge team matches pre-screened families to your facility — and how you get paid.",
    content: `
# Placement Network Overview

The Placement Network is a premium referral channel where our concierge team connects pre-screened, treatment-ready families with your facility.

## How It Works

1. **Family Submits Request** — A family completes a detailed intake form describing their needs, insurance, location preferences, and urgency
2. **We Match Cases** — Our concierge team reviews the intake and matches it to facilities that fit the clinical and logistical criteria
3. **You Receive an Introduction** — Matched cases appear in your **Placements** tab with anonymized details (case ID, care needs, insurance, location)
4. **You Respond** — Mark the case as "Interested" or "Not Interested"
5. **Coordination** — If interested, our team facilitates introductions, tour scheduling, and admission coordination
6. **Pay on Admission** — A placement fee is charged **only** when the patient is successfully admitted

## Key Benefits

- **No upfront costs** — You never pay to receive or review introductions
- **Pre-screened families** — Our team verifies insurance, readiness, and fit before matching
- **Higher conversion** — Qualified referrals convert at significantly higher rates than cold leads
- **Pro discount** — Pro subscribers save $200 on each placement fee
    `,
    category: "placements",
    tags: ["placements", "concierge", "referrals", "network"],
    readTime: 5,
    updatedAt: "2026-04-12"
  },
  {
    id: "joining-placement-network",
    title: "How to Join the Placement Network",
    excerpt: "Step-by-step guide to opting in, setting your admissions criteria, and receiving your first introductions.",
    content: `
# How to Join the Placement Network

Joining is free and takes just a few minutes.

## Steps to Opt In

1. Navigate to **Placement Network** in the sidebar
2. Click **"Join the Network"** or **"Opt In"**
3. Complete your admissions profile:
   - **Admissions contact** — Name, email, and phone for the person who handles admissions
   - **Accepted care types** — Residential, PHP, IOP, Detox, Sober Living, etc.
   - **Accepted insurance** — List the insurance providers you work with
   - **Availability status** — Whether you currently have open beds
4. Review and accept the placement terms
5. Start receiving matched introductions

## Managing Your Availability

You can update your availability status at any time:
- **Available** — Actively accepting new placements
- **Limited** — Taking cases selectively
- **Unavailable** — Temporarily pausing new introductions

## Admissions Contact

Make sure your admissions contact info is up to date. This is the person our concierge team will reach out to when coordinating a placement.
    `,
    category: "placements",
    tags: ["opt-in", "admissions", "setup", "availability"],
    readTime: 4,
    updatedAt: "2026-04-10"
  },
  {
    id: "responding-to-introductions",
    title: "Responding to Placement Introductions",
    excerpt: "What you see when a case is matched to you, how to review it, and how to respond.",
    content: `
# Responding to Placement Introductions

When our concierge team matches a case to your facility, here's what happens.

## What You'll See

Each introduction includes:
- **Case ID** — An anonymized reference number
- **Care needs** — Primary concern, level of care, co-occurring conditions
- **Insurance** — Carrier and coverage details
- **Location** — General area the family is searching in
- **Urgency** — How quickly the family needs placement

Contact details (name, email, phone) are **not** shared until you express interest and our team facilitates the introduction.

## How to Respond

1. Go to **Placements** in the sidebar
2. Review the case details
3. Click **"Interested"** to move forward, or **"Not Interested"** to pass
4. If interested, add any notes about availability or questions for our team

## What Happens Next

- Our concierge team contacts the family and shares your facility information
- Tour coordination begins (virtual or in-person)
- If the family chooses your facility, admission is coordinated
- The placement fee is invoiced only after successful admission

## Response Time

Respond to introductions promptly. Families in the placement pipeline are actively making decisions, and delays can mean losing a case to another facility.
    `,
    category: "placements",
    tags: ["introductions", "response", "coordination", "cases"],
    readTime: 5,
    updatedAt: "2026-04-12"
  },
  {
    id: "placement-billing",
    title: "Placement Fees & Billing",
    excerpt: "When fees are charged, how much they cost, and how Pro members save on every placement.",
    content: `
# Placement Fees & Billing

The Placement Network uses a success-based billing model — you only pay when a patient is admitted.

## Fee Structure

- **Domestic placements** — A standard placement fee is charged upon admission
- **International placements** — A premium placement fee applies for international cases
- **Pro discount** — Pro subscribers receive a **$200 discount** on every placement fee

## When You're Charged

Fees are invoiced **only after** a placement is confirmed — meaning the patient has been admitted to your facility. You'll never pay for:
- Receiving introductions
- Reviewing case details
- Expressing interest
- Cases that don't result in admission

## Invoicing

- Placement invoices are sent separately from credit purchases
- View your placement billing history in **Billing > Invoices**
- All payments are processed securely via Stripe
    `,
    category: "placements",
    tags: ["fees", "billing", "invoicing", "Pro discount"],
    readTime: 3,
    updatedAt: "2026-04-08"
  },

  // ── Billing & Pro ──
  {
    id: "how-billing-works",
    title: "How Billing Works",
    excerpt: "Free listings, credit-based lead unlocks, and the Pro membership — a complete billing overview.",
    content: `
# How Billing Works

RehabLookup uses a transparent pay-per-use model with an optional Pro membership for maximum visibility.

## Free Listing

Every provider gets a free facility listing that includes:
- Public profile visible in search results
- Facility details, services, and insurance displayed
- Basic analytics dashboard
- Lead previews (locked contact details)

## Credit-Based Lead Unlocks

When a family submits an inquiry about your facility:
- You see a **preview** with inquiry type, location, care needs, and timestamp
- To view full contact details, **unlock the lead using credits**
- You choose which leads to unlock — no wasted spend on leads you don't want

## Pro Membership ($399/month)

For facilities wanting maximum exposure and savings:
- **20% discount** on all lead unlocks
- **$200 off** each placement fee
- **Featured placement** in search results and on the homepage
- **Up to 5 facility listings** under one account
- **Gold Pro badge** on your listing
- **Priority support** response times
- **Embed badge** for your website

## Payment Methods

All payments are processed securely via Stripe. We accept Visa, Mastercard, Amex, and corporate cards.
    `,
    category: "billing",
    tags: ["billing", "credits", "Pro", "pricing"],
    readTime: 5,
    updatedAt: "2026-04-08"
  },
  {
    id: "manage-subscription",
    title: "Managing Your Subscription & Payments",
    excerpt: "Update payment methods, view invoices, and manage your Pro membership.",
    content: `
# Managing Your Subscription & Payments

All billing management is available in **Settings > Billing**.

## Viewing Your Balance & History

- Current credit balance is shown in the sidebar and on the Billing page
- Click **"Transaction History"** to view all credit purchases and lead unlocks
- Each transaction shows date, amount, type, and associated facility

## Managing Your Pro Subscription

If you're a Pro member:
1. Go to **Billing**
2. Click **"Manage Subscription"**
3. From the Stripe billing portal, you can:
   - View and download past invoices
   - Update your payment method
   - Change your billing address
   - Cancel or modify your subscription

## Invoices

- Credit purchases generate instant receipts
- Pro subscription invoices are sent monthly
- Placement fee invoices are sent upon confirmed admission
- All invoices are downloadable from the billing portal
    `,
    category: "billing",
    tags: ["payment", "subscription", "invoices", "Pro"],
    readTime: 3,
    updatedAt: "2026-04-04"
  },

  // ── Analytics ──
  {
    id: "understanding-analytics",
    title: "Understanding Your Analytics Dashboard",
    excerpt: "Profile views, lead volume, unlock rates, response times, and placement activity — explained.",
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

### Unlock Rate
- Percentage of leads you chose to unlock
- Helps you gauge lead quality and your engagement level

### Response Time
- Average time between receiving a lead and making contact
- Faster response times correlate with higher conversion rates

### Placement Activity
- If opted into the Placement Network: introductions received, interest expressed, and admissions

## Date Range Filters

View your data across different periods:
- **This Week** — Current 7-day period
- **This Month** — Current calendar month
- **This Quarter** — Current 3-month period
- **Custom Range** — Pick any start and end date

## Using Analytics to Improve

- **Low views?** Update your listing description and add more images
- **Low unlock rate?** You may be receiving leads outside your specialty — review your listing's service categories
- **Slow response time?** Enable instant email notifications and prioritize same-day responses
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
- Credit balance
- Pro membership status

### Per-Facility
- Leads and lead history
- Analytics and performance data
- Listing content and images
- Placement Network opt-in and introductions
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
