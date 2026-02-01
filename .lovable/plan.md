
# Admin Support Inbox Implementation Plan

## Overview
Build a lightweight Admin Support Inbox to centralize and manage support messages from public website contact forms, seeker panel, and provider panel. This enables assignment coordination among 3-5 staff members and provides basic status tracking.

## Architecture

```text
+------------------+     +------------------+     +-------------------+
| Contact Forms    |     | Edge Functions   |     | support_tickets   |
| - Public Website |---->| - send-contact   |---->| Database Table    |
| - Provider Panel |     | - send-provider  |     | (stores + emails) |
| - Seeker Panel   |     | - send-seeker    |     +-------------------+
+------------------+     +------------------+             |
                                                          v
                                                +-------------------+
                                                | Admin Support     |
                                                | Inbox Page        |
                                                | - List View       |
                                                | - Assignment      |
                                                | - Status Tracking |
                                                +-------------------+
```

## Database Schema

### New Table: `support_tickets`
```sql
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source tracking
  source text NOT NULL CHECK (source IN ('public_contact', 'provider_support', 'seeker_support')),
  
  -- Sender info
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  sender_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Content
  category text NOT NULL,
  subject text,
  message text NOT NULL,
  
  -- Assignment & Status
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'open', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Resolution
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index for common queries
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admins can manage support tickets"
  ON support_tickets FOR ALL
  TO authenticated
  USING (public.user_is_admin(auth.uid()));
```

### New Table: `support_ticket_notes` (Internal comments)
```sql
CREATE TABLE public.support_ticket_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE support_ticket_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ticket notes"
  ON support_ticket_notes FOR ALL
  TO authenticated
  USING (public.user_is_admin(auth.uid()));
```

## Edge Function Updates

### 1. Update `send-contact-form/index.ts`
Add database insert before sending email:
```typescript
// After validation, before sending email:
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

await supabaseAdmin.from('support_tickets').insert({
  source: 'public_contact',
  sender_name: name,
  sender_email: email,
  category: subject,
  message: message,
});
```

### 2. Update `send-provider-support/index.ts`
Same pattern - insert ticket before sending emails.

### 3. Create `send-seeker-support/index.ts` (if needed)
New edge function for seeker panel support requests with same dual-write pattern.

## Frontend Components

### 1. New Admin Page: `src/pages/admin/AdminSupport.tsx`

**Features:**
- Unified ticket list with filtering (status, source, assignee, date range)
- Search by sender name/email or message content
- Quick status badges with color coding
- Assignment dropdown in list view
- Click-to-open ticket detail modal

**UI Layout:**
```text
+------------------------------------------------------------------+
| Support Inbox                              [Filter] [Search]      |
+------------------------------------------------------------------+
| Status: All | New (5) | Open | In Progress | Resolved            |
+------------------------------------------------------------------+
| Source      | From          | Category    | Assignee  | Created  |
|-------------|---------------|-------------|-----------|----------|
| Provider    | John D.       | Billing     | [Avatar]  | 2h ago   |
| Public      | Jane S.       | General     | Unassigned| 5h ago   |
| Seeker      | Mike R.       | Technical   | [Avatar]  | 1d ago   |
+------------------------------------------------------------------+
```

### 2. Ticket Detail Modal: `src/components/admin/SupportTicketModal.tsx`

**Features:**
- Full message view with sender details
- Status change dropdown
- Priority selector
- Assignment selector (with admin staff list)
- Internal notes thread
- "Reply via Email" link (opens mailto:)
- Activity timeline showing status changes

### 3. Sidebar Update: `src/components/admin/AdminSidebar.tsx`
Add "Support" nav item under Settings group or as standalone:
```typescript
{ to: "/admin/support", icon: Headphones, label: "Support Inbox", permission: "support" }
```

### 4. Permission Addition
Add `support` permission to admin permissions system for role-based access.

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx.sql` | Create | New tables + RLS policies |
| `supabase/functions/send-contact-form/index.ts` | Modify | Add database insert |
| `supabase/functions/send-provider-support/index.ts` | Modify | Add database insert |
| `src/pages/admin/AdminSupport.tsx` | Create | Main support inbox page |
| `src/components/admin/SupportTicketModal.tsx` | Create | Ticket detail modal |
| `src/components/admin/AdminSidebar.tsx` | Modify | Add Support nav item |
| `src/components/admin/AdminShell.tsx` | Modify | Add mobile nav entry |
| `src/App.tsx` | Modify | Add route for /admin/support |

## Technical Details

### Query Hooks
```typescript
// useAdminSupportTickets.ts
const { data: tickets } = useQuery({
  queryKey: ['admin-support-tickets', filters],
  queryFn: () => supabase
    .from('support_tickets')
    .select(`
      *,
      assigned_admin:admin_user_profiles!assigned_to(display_name, avatar_url)
    `)
    .order('created_at', { ascending: false })
});
```

### Assignment Mutation
```typescript
const assignTicket = useMutation({
  mutationFn: async ({ ticketId, assigneeId }) => {
    await supabase.from('support_tickets').update({
      assigned_to: assigneeId,
      assigned_at: new Date().toISOString(),
      assigned_by: currentUserId,
      status: 'open', // Auto-change from 'new' when assigned
    }).eq('id', ticketId);
    
    // Log to admin_audit_log
    await supabase.from('admin_audit_log').insert({
      admin_user_id: currentUserId,
      action: 'support_ticket_assigned',
      target_type: 'support_ticket',
      target_id: ticketId,
      metadata: { assignee_id: assigneeId }
    });
  }
});
```

## Implementation Order

1. **Phase 1: Database** - Create tables and RLS policies
2. **Phase 2: Edge Functions** - Update to dual-write (email + database)
3. **Phase 3: Admin Page** - Build list view with filters
4. **Phase 4: Detail Modal** - Assignment workflow and notes
5. **Phase 5: Navigation** - Add sidebar entry and routing

## Future Enhancements (Post-Launch)
- Response templates for common issues
- SLA tracking and alerts
- Basic analytics (avg response time, resolution rate)
- Canned responses directly from modal
- Email threading integration
