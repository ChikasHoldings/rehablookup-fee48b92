
# Marketing Lead Capture & Monetization System

## Overview
Build a complete lead capture pipeline optimized for paid advertising that:
1. Captures leads via a polished landing page
2. Shows matched facilities with one-click inquiry
3. Stores leads for admin management
4. Automatically sends Concierge upsell emails after 12-24 hours

## Architecture

```text
+------------------+     +----------------------+     +-------------------+
| Ad Landing Page  |     | submit-marketing-lead|     | marketing_leads   |
| /lp/convert      |---->| Edge Function        |---->| Database Table    |
| (Lead Intake)    |     | (Store + Match)      |     +-------------------+
+------------------+     +----------------------+             |
                                   |                           |
                                   v                           v
                         +----------------------+     +-------------------+
                         | Matching Success     |     | Admin Marketing   |
                         | Page with Facilities |     | Dashboard         |
                         +----------------------+     +-------------------+
                                   |
                                   | (One-Click Request)
                                   v
                         +----------------------+     +-------------------+
                         | submit-qualified-lead|     | leads table       |
                         | (Normal Lead Flow)   |---->| (Normal pricing)  |
                         +----------------------+     +-------------------+
                                                              |
                                                              | (After 12-24hrs if no request)
                                                              v
                                                      +-------------------+
                                                      | send-marketing-   |
                                                      | followup          |
                                                      | (Concierge Email) |
                                                      +-------------------+
```

---

## Database Schema

### New Table: `marketing_leads`

```sql
CREATE TABLE public.marketing_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contact Info
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  preferred_contact text DEFAULT 'phone',
  
  -- Clinical Data (from intake form)
  urgency text,
  who_seeking_help text,
  location_zip text,
  location_city_state text,
  level_of_care text,
  insurance_type text,
  insurance_provider text,
  primary_substance text[],
  dual_diagnosis text,
  age_range text,
  gender text,
  previous_treatment text,
  co_occurring_conditions text[],
  employment_status text,
  message text,
  
  -- Tracking
  source text NOT NULL DEFAULT 'marketing',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  landing_page text,
  
  -- Facility Matching
  matched_facility_ids uuid[] DEFAULT '{}',
  facilities_requested uuid[] DEFAULT '{}',
  
  -- Follow-up Status
  followup_email_sent boolean DEFAULT false,
  followup_email_sent_at timestamptz,
  converted_to_concierge boolean DEFAULT false,
  converted_at timestamptz,
  
  -- Status
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'lost')),
  admin_notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_marketing_leads_created_at ON marketing_leads(created_at DESC);
CREATE INDEX idx_marketing_leads_status ON marketing_leads(status);
CREATE INDEX idx_marketing_leads_followup ON marketing_leads(followup_email_sent, created_at);
CREATE INDEX idx_marketing_leads_email ON marketing_leads(email);

-- Enable RLS
ALTER TABLE marketing_leads ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage marketing leads"
  ON marketing_leads FOR ALL
  TO authenticated
  USING (public.user_is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_marketing_leads_updated_at
  BEFORE UPDATE ON marketing_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Edge Functions

### 1. `submit-marketing-lead/index.ts`

**Purpose**: Store marketing lead and return matched facilities

**Key Logic**:
- Store lead data in `marketing_leads` table
- Find 3-5 matching facilities based on:
  - Same state as lead's ZIP code
  - Matching level of care (if specified)
  - Approved and not suspended status
  - Prioritize Pro subscribers
- Return matched facility data for display
- Send confirmation email to lead

**Returns**:
```typescript
{
  success: true,
  leadId: "uuid",
  matchedFacilities: [
    { id, name, city, state, logoUrl, facilityType, phone }
  ]
}
```

### 2. `request-facility-from-marketing/index.ts`

**Purpose**: Create a real lead when user clicks "Request Info" on a matched facility

**Key Logic**:
- Fetch marketing lead data by ID
- Call existing `submit-qualified-lead` logic to create lead in `leads` table
- Update `marketing_leads.facilities_requested` array
- Facility receives normal notification and pricing applies ($39-$49)
- Standard 24hr exclusivity + redistribution logic applies

### 3. `send-marketing-followup/index.ts` (Cron-triggered)

**Purpose**: Send Concierge upsell email 12-24 hours after submission

**Key Logic**:
- Query marketing leads where:
  - `followup_email_sent = false`
  - `created_at` is between 12-24 hours ago
  - `facilities_requested` is empty (no engagement)
- Send polished follow-up email:
  - "Did you find what you were looking for?"
  - Highlight Concierge benefits ($29 one-time)
  - Direct CTA to `/concierge/intake`
- Update `followup_email_sent = true`

**Cron Schedule**: Every hour
```sql
SELECT cron.schedule(
  'marketing-followup-emails',
  '0 * * * *',  -- Every hour
  $$
  SELECT net.http_post(
    url:='https://[project].supabase.co/functions/v1/send-marketing-followup',
    headers:='{"Authorization": "Bearer [anon_key]"}'::jsonb
  );
  $$
);
```

---

## Frontend Components

### 1. Landing Page: `src/pages/MarketingLanding.tsx`

**Route**: `/lp/convert`

**Design Elements**:
- Minimal header (logo only, no navigation)
- Trust badges above fold (Confidential, Free Service, 24hr Response)
- Social proof stats bar
- Embedded `LeadIntakeForm` with custom success handler
- Testimonials section
- FAQ accordion
- Emergency hotline notice
- Mobile-optimized, fast-loading

**Key Features**:
- UTM parameter capture from URL
- Custom `renderSuccess` prop for facility matching display
- No exit links to maximize conversion

### 2. Success Component: `src/components/marketing/MarketingLeadSuccess.tsx`

**Design**:
```text
+------------------------------------------------------------------+
| Success! We found [3-5] treatment centers near you               |
|                                                                  |
| +------------+  +------------+  +------------+                   |
| | Facility 1 |  | Facility 2 |  | Facility 3 |                   |
| | Logo       |  | Logo       |  | Logo       |                   |
| | Name       |  | Name       |  | Name       |                   |
| | City, ST   |  | City, ST   |  | City, ST   |                   |
| |[Request]   |  |[Request]   |  |[Request]   |                   |
| +------------+  +------------+  +------------+                   |
|                                                                  |
| Want personalized help? Try our Concierge Service ($29)          |
| [Get Expert Help →]                                              |
+------------------------------------------------------------------+
```

**Features**:
- Card grid showing matched facilities
- One-click "Request Info" button per facility
- Toast confirmation on request
- Concierge service CTA at bottom
- Mobile-responsive grid

### 3. Admin Page: `src/pages/admin/AdminMarketing.tsx`

**Route**: `/admin/marketing`

**Features**:
- Summary stats cards (Total, Converted, Pending Follow-up)
- Data table with columns:
  - Name, Email, Phone (full visibility)
  - Location, Source/UTM
  - Facilities Requested count
  - Follow-up Status
  - Created At
- Filters: Status, Date Range, Source
- Search by name/email
- Click to view full lead details modal
- Export to CSV

### 4. Follow-up Email Template

**Subject**: "Still looking for treatment help? We can help."

**Content**:
- Personalized greeting
- "Did the facilities we suggested work out?"
- Highlight Concierge benefits:
  - Personal matching specialist
  - Insurance verification help
  - Direct introductions to programs
- Clear CTA: "Get Expert Help - Just $29"
- SAMHSA helpline in footer

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx.sql` | Create | New `marketing_leads` table + indexes |
| `supabase/functions/submit-marketing-lead/index.ts` | Create | Store lead + match facilities |
| `supabase/functions/request-facility-from-marketing/index.ts` | Create | Convert to real lead |
| `supabase/functions/send-marketing-followup/index.ts` | Create | Concierge upsell email |
| `src/pages/MarketingLanding.tsx` | Create | Ad landing page |
| `src/components/marketing/MarketingLeadSuccess.tsx` | Create | Facility matching success |
| `src/pages/admin/AdminMarketing.tsx` | Create | Admin dashboard |
| `src/components/admin/AdminSidebar.tsx` | Modify | Add Marketing nav item |
| `src/App.tsx` | Modify | Add routes |
| `supabase/config.toml` | Modify | Register new edge functions |

---

## Implementation Order

**Phase 1: Database**
- Create `marketing_leads` table with all columns
- Add RLS policies for admin access

**Phase 2: Edge Functions**
- Build `submit-marketing-lead` with facility matching
- Build `request-facility-from-marketing` integration
- Build `send-marketing-followup` with email template

**Phase 3: Landing Page**
- Create `MarketingLanding.tsx` page
- Build `MarketingLeadSuccess.tsx` component
- Integrate with `LeadIntakeForm`

**Phase 4: Admin Dashboard**
- Create `AdminMarketing.tsx` page
- Add sidebar navigation entry
- Add route in App.tsx

**Phase 5: Automation**
- Set up cron job for follow-up emails
- Test end-to-end flow

---

## Revenue Flow

```text
Lead submits form on /lp/convert
         |
         v
    Matched with 3-5 facilities
         |
    +----+----+
    |         |
    v         v
Clicks     No action
"Request"     |
    |         | (12-24hrs later)
    v         v
Normal    Follow-up
Lead      Email sent
($39-49)      |
    |         v
    |    User clicks
    |    Concierge CTA
    |         |
    |         v
    |    Pays $29
    |         |
    v         v
REVENUE   REVENUE
```

---

## Key Technical Details

### Facility Matching Logic
```typescript
// Query nearby facilities in same state
const { data: facilities } = await supabase
  .from("facilities")
  .select("id, name, city, state, logo_url, facility_type")
  .eq("state", leadState)
  .eq("status", "approved")
  .neq("suspended", true)
  .limit(10);

// Shuffle and take 3-5
const shuffled = facilities.sort(() => Math.random() - 0.5);
return shuffled.slice(0, Math.min(5, shuffled.length));
```

### Follow-up Email Query
```typescript
// Find leads needing follow-up (12-24hrs old, no requests)
const cutoffStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
const cutoffEnd = new Date(Date.now() - 12 * 60 * 60 * 1000);

const { data: leads } = await supabase
  .from("marketing_leads")
  .select("*")
  .eq("followup_email_sent", false)
  .gte("created_at", cutoffStart.toISOString())
  .lte("created_at", cutoffEnd.toISOString())
  .eq("facilities_requested", "{}");
```

### One-Click Request Integration
When a user clicks "Request Info", the system:
1. Fetches the marketing lead data
2. Creates entry in `leads` table with that facility
3. Triggers normal facility notification
4. Standard unlock pricing applies ($39-49)
5. 24hr exclusivity window starts

---

## Security Considerations

- Marketing leads table has admin-only RLS
- Email verification from original `LeadIntakeForm` is preserved
- No PII exposed in client-side responses (only facility public data)
- Follow-up emails include unsubscribe option
- Rate limiting on lead submission

This system ensures maximum monetization of every ad visitor while providing genuine value through facility matching and follow-up support.
