import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Search, 
  BookOpen, 
  FileText, 
  Users, 
  CreditCard, 
  Settings, 
  TrendingUp,
  Shield,
  Clock,
  ChevronRight,
  ArrowLeft,
  X
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  { id: "leads", name: "Leads & Contacts", icon: Users, color: "bg-purple-500" },
  { id: "billing", name: "Billing & Subscriptions", icon: CreditCard, color: "bg-amber-500" },
  { id: "analytics", name: "Analytics & Insights", icon: TrendingUp, color: "bg-cyan-500" },
  { id: "account", name: "Account & Security", icon: Shield, color: "bg-red-500" },
];

const articles: Article[] = [
  // Getting Started
  {
    id: "welcome-guide",
    title: "Welcome to RehabLookup Provider Portal",
    excerpt: "A comprehensive guide to get you started with your provider account and facility listing.",
    content: `
# Welcome to RehabLookup Provider Portal

Congratulations on joining RehabLookup! This guide will help you get started with your provider account and maximize your facility's visibility to those seeking treatment.

## First Steps

1. **Complete Your Profile** - Navigate to Settings to add your contact information and preferences.
2. **Set Up Your Listing** - Go to My Listing to add your facility details, services, and images.
3. **Configure Notifications** - Customize how you receive lead alerts in Settings > Notifications.

## Understanding Your Dashboard

Your dashboard provides a quick overview of:
- **Profile Views** - How many people viewed your facility listing
- **New Leads** - Contact requests from potential patients/families
- **Listing Status** - Whether your facility is live and visible

## Need Help?

Visit the Help & Support section or contact our team at providers@rehablookup.com.
    `,
    category: "getting-started",
    tags: ["onboarding", "setup", "basics"],
    readTime: 5,
    updatedAt: "2026-03-10"
  },
  {
    id: "profile-setup",
    title: "Setting Up Your Provider Profile",
    excerpt: "Learn how to complete your provider profile for the best experience.",
    content: `
# Setting Up Your Provider Profile

Your provider profile contains your personal account information, separate from your facility listing.

## Profile Information

Navigate to **Settings > Profile** to update:
- First and last name
- Contact email
- Phone number
- Job title/role

## Why This Matters

Your profile information is used for:
- Lead notifications and alerts
- Account communications
- Billing correspondence

## Best Practices

- Use a professional email you check regularly
- Add a phone number for urgent lead alerts
- Keep your information up to date
    `,
    category: "getting-started",
    tags: ["profile", "setup", "account"],
    readTime: 3,
    updatedAt: "2026-03-08"
  },
  // Listing Management
  {
    id: "optimize-listing",
    title: "Optimizing Your Facility Listing",
    excerpt: "Tips and best practices to make your listing stand out and attract more leads.",
    content: `
# Optimizing Your Facility Listing

A well-optimized listing significantly increases your visibility and lead quality.

## Essential Elements

### 1. Compelling Description
Write a clear, compassionate description that highlights:
- Your treatment philosophy
- Unique programs or specializations
- Success factors and outcomes
- Facility amenities

### 2. High-Quality Images
- Upload your facility logo
- Add up to 10 gallery images
- Show living spaces, treatment areas, outdoor spaces
- Use professional photography when possible

### 3. Complete Service Information
- List all treatment programs offered
- Include all accepted insurance providers
- Specify age groups and gender served

## SEO Tips

- Use relevant keywords naturally in your description
- Include your location details
- Update regularly to stay current
    `,
    category: "listing",
    tags: ["optimization", "visibility", "best practices"],
    readTime: 6,
    updatedAt: "2026-03-12"
  },
  {
    id: "upload-images",
    title: "Uploading Facility Images",
    excerpt: "Step-by-step guide to adding and managing your facility photos and logo.",
    content: `
# Uploading Facility Images

Quality images help families visualize your facility and build trust.

## Logo Upload

1. Go to **My Listing > Branding**
2. Click on the logo upload area
3. Select an image (PNG, JPG, or WebP)
4. Image will be automatically optimized

**Recommended:** Square format, minimum 512x512 pixels

## Gallery Images

1. Navigate to **My Listing > Gallery**
2. Click "Add Images" or drag and drop
3. Upload up to 10 images
4. Arrange in preferred order

**Tips:**
- Show variety: exterior, rooms, common areas
- Use natural lighting
- Avoid stock photos
- Maximum file size: 5MB per image
    `,
    category: "listing",
    tags: ["images", "photos", "branding"],
    readTime: 4,
    updatedAt: "2026-03-05"
  },
  // Leads
  {
    id: "managing-leads",
    title: "Managing Your Leads Effectively",
    excerpt: "Learn how to track, organize, and convert leads into admissions.",
    content: `
# Managing Your Leads Effectively

Your Leads dashboard is your central hub for managing all incoming leads.

## Lead Statuses

- **New** - Fresh lead, not yet contacted
- **Contacted** - Initial outreach made
- **Qualified** - Good fit, actively discussing
- **Converted** - Successfully admitted
- **Closed** - Not proceeding (for any reason)

## Best Practices

### Response Time Matters
- Respond to new leads within 1 hour during business hours
- Set up instant email notifications
- Use the quick-call feature for urgent leads

### Tracking Interactions
- Add notes after each contact
- Update status promptly
- Record key details discussed

### Follow-Up Strategy
- Schedule follow-ups in your calendar
- Send personalized emails using templates
- Don't give up after first contact
    `,
    category: "leads",
    tags: ["leads", "conversion", "follow-up"],
    readTime: 5,
    updatedAt: "2026-03-11"
  },
  {
    id: "lead-notifications",
    title: "Configuring Lead Notifications",
    excerpt: "Set up alerts to never miss a new lead or important update.",
    content: `
# Configuring Lead Notifications

Stay on top of leads with customized notifications.

## Notification Channels

### Email Notifications
- Instant lead alerts
- Daily or weekly digests
- Lead status change updates

### SMS Notifications
- Real-time text alerts for new leads
- Perfect for urgent response

### Browser Notifications
- Desktop push notifications
- Works when portal is open

## Setting Up Notifications

1. Go to **Settings > Notifications**
2. Toggle desired notification types
3. Set your preferred frequency
4. Save changes

## Digest Options

Choose between:
- **Instant** - Immediate notification per lead
- **Daily Digest** - Morning summary
- **Weekly Digest** - Weekly overview
    `,
    category: "leads",
    tags: ["notifications", "alerts", "settings"],
    readTime: 4,
    updatedAt: "2026-03-09"
  },
  // Billing
  {
    id: "how-billing-works",
    title: "How Billing Works",
    excerpt: "Understand how free listings and inquiry unlocks work for your facility.",
    content: `
# How Billing Works

RehabLookup offers a simple, transparent approach to connecting you with families seeking treatment.

## Free Listing

All providers can list their facility for free with:
- Public provider profile
- Visible in search results
- Facility details, services, and insurance
- Basic analytics dashboard

## Inquiry Unlock System

When families express interest in your facility:
- You receive a notification with basic inquiry details
- Preview includes: inquiry type, location, care needs, timestamp
- Contact details are locked until you choose to unlock
- You only pay when you decide to connect with a family

This pay-per-inquiry model means:
- No monthly commitments
- No wasted spend on leads you don't want
- Full control over which families you pursue

## Pro Visibility (Optional Upgrade)

For facilities wanting maximum exposure:
- 20% discount on all inquiry unlocks
- Featured placement on homepage
- Priority placement on state and city pages
- Top of search results
- Gold Pro badge on your listing
- Priority support

## Managing Your Credits

1. Go to **Credits** to view your balance
2. Purchase credits as needed
3. Use credits to unlock inquiries

## Payment Methods

We accept all major credit cards via Stripe for secure payments.
    `,
    category: "billing",
    tags: ["billing", "credits", "unlocks"],
    readTime: 5,
    updatedAt: "2026-03-08"
  },
  {
    id: "payment-methods",
    title: "Managing Payment Methods",
    excerpt: "Add, update, or remove payment methods for your subscription.",
    content: `
# Managing Payment Methods

Keep your billing information up to date.

## Accepted Payment Methods

- Credit cards (Visa, Mastercard, Amex)
- Debit cards
- Corporate cards

## Updating Payment Method

1. Navigate to **Billing**
2. Click "Manage Subscription"
3. Select "Update payment method"
4. Enter new card details
5. Save changes

## Billing Portal

Access your complete billing history and invoices through our secure Stripe billing portal. Click "Manage Subscription" to:
- View past invoices
- Download receipts
- Update billing address
- Change payment method
    `,
    category: "billing",
    tags: ["payment", "credit card", "invoices"],
    readTime: 3,
    updatedAt: "2026-03-04"
  },
  // Analytics
  {
    id: "understanding-analytics",
    title: "Understanding Your Analytics Dashboard",
    excerpt: "Learn to read and interpret your facility's performance metrics.",
    content: `
# Understanding Your Analytics Dashboard

Data-driven insights to improve your listing performance.

## Key Metrics

### Profile Views
- Total views of your facility listing
- Tracked over 30-day rolling period
- Indicates visibility and interest

### Lead Volume
- New leads received
- Monthly vs. all-time counts
- Lead source breakdown

### Conversion Rate
- Percentage of views that become leads
- Industry benchmark: 2-5%
- Higher is better

## Using Analytics

### Identify Trends
- Track view patterns over time
- Notice peak lead days
- Correlate with marketing efforts

### Optimize Performance
- Low views? Update listing content
- Low conversion? Improve description
- Many leads? Consider upgrading plan
    `,
    category: "analytics",
    tags: ["metrics", "performance", "data"],
    readTime: 5,
    updatedAt: "2026-03-10"
  },
  // Account & Security
  {
    id: "account-security",
    title: "Securing Your Account",
    excerpt: "Best practices for keeping your provider account safe and secure.",
    content: `
# Securing Your Account

Protect your account and patient lead data.

## Password Best Practices

- Use at least 12 characters
- Mix uppercase, lowercase, numbers, symbols
- Never reuse passwords
- Update every 90 days

## Changing Your Password

1. Go to **Settings > Security**
2. Enter current password
3. Create new strong password
4. Confirm and save

## Security Features

### Activity Log
Monitor your account activity including:
- Login history
- Password changes
- Settings modifications

### Sign Out All Sessions
If you suspect unauthorized access:
1. Go to Settings > Security
2. Click "Sign Out All Sessions"
3. Log back in with new password

## Reporting Issues

Contact security@rehablookup.com for:
- Suspicious activity
- Unauthorized access
- Security concerns
    `,
    category: "account",
    tags: ["security", "password", "safety"],
    readTime: 4,
    updatedAt: "2026-03-06"
  },
];

export default function ProviderKnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesSearch = searchQuery === "" || 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = !selectedCategory || article.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const articlesByCategory = useMemo(() => {
    const grouped: Record<string, Article[]> = {};
    filteredArticles.forEach((article) => {
      if (!grouped[article.category]) {
        grouped[article.category] = [];
      }
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
            Search articles and guides to learn how to use the provider portal
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
        // Single category view
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
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
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
        // Grouped by category view
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
                    ({categoryArticles.length} articles)
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          {selectedArticle && (
            <>
              <DialogHeader className="shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const cat = getCategoryInfo(selectedArticle.category);
                    if (!cat) return null;
                    const Icon = cat.icon;
                    return (
                      <Badge variant="secondary" className="text-xs">
                        <Icon className="h-3 w-3 mr-1" />
                        {cat.name}
                      </Badge>
                    );
                  })()}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {selectedArticle.readTime} min read
                  </span>
                </div>
                <DialogTitle className="text-xl">{selectedArticle.title}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="flex-1 pr-4">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {selectedArticle.content.split('\n').map((line, i) => {
                    if (line.startsWith('# ')) {
                      return <h1 key={i} className="text-xl font-bold mt-6 mb-4">{line.slice(2)}</h1>;
                    }
                    if (line.startsWith('## ')) {
                      return <h2 key={i} className="text-lg font-semibold mt-5 mb-3">{line.slice(3)}</h2>;
                    }
                    if (line.startsWith('### ')) {
                      return <h3 key={i} className="text-base font-semibold mt-4 mb-2">{line.slice(4)}</h3>;
                    }
                    if (line.startsWith('- ')) {
                      return <li key={i} className="ml-4 text-sm text-muted-foreground">{line.slice(2)}</li>;
                    }
                    if (line.match(/^\d+\./)) {
                      return <li key={i} className="ml-4 text-sm text-muted-foreground list-decimal">{line.slice(line.indexOf(' ') + 1)}</li>;
                    }
                    if (line.trim() === '') {
                      return <br key={i} />;
                    }
                    // Handle bold text safely without dangerouslySetInnerHTML
                    const parts = line.split(/\*\*(.*?)\*\*/);
                    return (
                      <p key={i} className="text-sm text-muted-foreground mb-2">
                        {parts.map((part, partIndex) => 
                          partIndex % 2 === 1 ? <strong key={partIndex}>{part}</strong> : part
                        )}
                      </p>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
                  {selectedArticle.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Last updated: {new Date(selectedArticle.updatedAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>

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
                    <div className="mt-6 pt-4 border-t">
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        Related Articles
                      </h4>
                      <div className="space-y-2">
                        {relatedArticles.map((article) => (
                          <button
                            key={article.id}
                            onClick={() => setSelectedArticle(article)}
                            className="w-full text-left p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                          >
                            <p className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">
                              {article.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {article.excerpt}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {article.readTime} min
                              </span>
                              {(() => {
                                const cat = getCategoryInfo(article.category);
                                if (!cat) return null;
                                return (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
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
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
