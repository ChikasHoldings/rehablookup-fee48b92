import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  emailStart,
  emailHeader,
  emailBodyStart,
  emailBodyEnd,
  emailGreeting,
  emailParagraph,
  tipBox,
  ctaButton,
  emailFooter,
  emailEnd,
  emailDivider,
} from "../_shared/email-templates.ts";
import { sendEmailWithRetry, sleep, BULK_SEND_DELAY_MS } from "../_shared/resilient-email-sender.ts";

const VERSION = "1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================================
// 7-DAY ONBOARDING EMAIL TEMPLATES
// ============================================================================

function stepItem(number: string, title: string, description: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
      <tr>
        <td width="40" valign="top" style="padding-right: 12px;">
          <div style="width: 32px; height: 32px; background: #1B365D; color: #ffffff; border-radius: 50%; text-align: center; line-height: 32px; font-size: 14px; font-weight: 700;">${number}</div>
        </td>
        <td valign="top">
          <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #1E293B;">${title}</p>
          <p style="margin: 0; font-size: 14px; color: #64748B; line-height: 1.5;">${description}</p>
        </td>
      </tr>
    </table>`;
}

function checklistItem(text: string): string {
  return `<p style="margin: 0 0 10px 0; font-size: 14px; color: #1E293B; line-height: 1.5;">✅ ${text}</p>`;
}

function statBlock(value: string, label: string): string {
  return `
    <td width="33%" align="center" style="padding: 12px 8px;">
      <p style="margin: 0; font-size: 28px; font-weight: 700; color: #1B365D;">${value}</p>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748B;">${label}</p>
    </td>`;
}

function generateDay1Email(name: string): string {
  let email = emailStart();
  email += emailHeader("Welcome to RehabLookup!", "free", { icon: "🎉", subtitle: "Your listing is live — here's how to make it work for you" });
  email += emailBodyStart();
  email += emailGreeting(name);
  email += emailParagraph("Congratulations on joining RehabLookup! Your facility is now visible to thousands of families searching for addiction treatment. Over the next 7 days, we'll share actionable tips to help you get the most from your listing.");
  
  email += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #F0FDF4; border-radius: 12px; margin: 20px 0;">
      <tr>
        <td style="padding: 24px;">
          <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #166534;">🚀 Quick Start — Do These 3 Things Today:</p>
          ${stepItem("1", "Complete your profile", "Listings with complete profiles get 3x more inquiries than incomplete ones.")}
          ${stepItem("2", "Add your logo & photos", "Visual listings stand out in search results and build instant trust.")}
          ${stepItem("3", "Verify your insurance list", "Families filter by insurance — make sure yours are listed.")}
        </td>
      </tr>
    </table>`;

  email += ctaButton("Complete Your Profile", "https://rehablookup.com/provider/profile", "free");
  email += emailDivider();
  email += emailParagraph("<strong>What to expect this week:</strong><br>We'll send you one quick tip each day to help maximize your visibility and lead quality. Each email takes about 2 minutes to action.");
  email += emailBodyEnd();
  email += emailFooter();
  email += emailEnd();
  return email;
}

function generateDay2Email(name: string): string {
  let email = emailStart();
  email += emailHeader("Your Profile = Your First Impression", "free", { icon: "📝", subtitle: "Day 2: Optimize your listing" });
  email += emailBodyStart();
  email += emailGreeting(name);
  email += emailParagraph("Did you know that <strong>facilities with complete profiles receive 340% more inquiries</strong> than those with basic listings? Your profile is often the first thing a family sees when considering treatment options.");

  email += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #F0F9FF; border-radius: 12px; margin: 20px 0;">
      <tr>
        <td style="padding: 24px;">
          <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #0C4A6E;">Profile Completion Checklist:</p>
          ${checklistItem("Facility name, address, and phone number")}
          ${checklistItem("Detailed description of your programs (150+ words)")}
          ${checklistItem("Treatment specialties and approaches")}
          ${checklistItem("Insurance providers accepted")}
          ${checklistItem("Bed count and gender served")}
          ${checklistItem("Accreditations (CARF, Joint Commission)")}
          ${checklistItem("Year established")}
        </td>
      </tr>
    </table>`;

  email += tipBox("Write your description for families, not clinicians. Use plain language that a worried parent would understand. Focus on outcomes and what makes your program unique.", "free");
  email += ctaButton("Update Your Profile Now", "https://rehablookup.com/provider/profile", "free");
  email += emailBodyEnd();
  email += emailFooter();
  email += emailEnd();
  return email;
}

function generateDay3Email(name: string): string {
  let email = emailStart();
  email += emailHeader("A Picture Is Worth a Thousand Clicks", "free", { icon: "📸", subtitle: "Day 3: Add photos that convert" });
  email += emailBodyStart();
  email += emailGreeting(name);
  email += emailParagraph("Families are making one of the most important decisions of their lives. <strong>Listings with 3+ photos get 2.5x more engagement</strong> than text-only profiles. Help them picture the healing environment you've created.");

  email += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #FFFBEB; border-radius: 12px; margin: 20px 0;">
      <tr>
        <td style="padding: 24px;">
          <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #92400E;">📷 Photo Tips That Work:</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #78350F; line-height: 1.6;"><strong>Your logo</strong> — Builds brand recognition in search results</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #78350F; line-height: 1.6;"><strong>Facility exterior</strong> — Show a welcoming entrance</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #78350F; line-height: 1.6;"><strong>Common areas</strong> — Living rooms, dining, outdoor spaces</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #78350F; line-height: 1.6;"><strong>Treatment spaces</strong> — Therapy rooms, group areas</p>
          <p style="margin: 0; font-size: 14px; color: #78350F; line-height: 1.6;"><strong>Amenities</strong> — Gym, pool, recreation areas</p>
        </td>
      </tr>
    </table>`;

  email += tipBox("Avoid stock photos. Authentic photos of your actual facility build trust. Natural lighting and wide angles work best. No photos of clients (privacy!).", "free");
  email += ctaButton("Upload Photos", "https://rehablookup.com/provider/profile", "free");
  email += emailBodyEnd();
  email += emailFooter();
  email += emailEnd();
  return email;
}

function generateDay4Email(name: string): string {
  let email = emailStart();
  email += emailHeader("Insurance & Credentials Matter", "free", { icon: "🛡️", subtitle: "Day 4: Build trust with verification" });
  email += emailBodyStart();
  email += emailGreeting(name);
  email += emailParagraph("<strong>72% of families filter by insurance</strong> when searching for treatment. If your accepted insurance list isn't complete, you're invisible to most of your potential clients.");

  email += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #F0FDF4; border-radius: 12px; margin: 20px 0;">
      <tr>
        <td style="padding: 24px;">
          <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #166534;">Insurance Visibility Boosts:</p>
          ${stepItem("1", "List ALL insurance you accept", "Even smaller carriers — families search for them.")}
          ${stepItem("2", "Add your accreditations", "CARF, Joint Commission, and state licenses boost credibility.")}
          ${stepItem("3", "Upload verification documents", "Verified badges increase click-through rates by 40%.")}
        </td>
      </tr>
    </table>`;

  email += emailParagraph("Families trust verified facilities. When they see accreditation badges and a complete insurance list, they feel confident reaching out.");
  email += ctaButton("Update Insurance & Credentials", "https://rehablookup.com/provider/profile", "free");
  email += emailBodyEnd();
  email += emailFooter();
  email += emailEnd();
  return email;
}

function generateDay5Email(name: string): string {
  let email = emailStart();
  email += emailHeader("How Leads Work on RehabLookup", "free", { icon: "📋", subtitle: "Day 5: Understanding your lead pipeline" });
  email += emailBodyStart();
  email += emailGreeting(name);
  email += emailParagraph("RehabLookup sends you real families actively seeking treatment — not recycled lists. Here's how our exclusive lead system works:");

  email += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #F8FAFC; border-radius: 12px; margin: 20px 0;">
      <tr>
        <td style="padding: 24px;">
          ${stepItem("1", "Lead Arrives", "When a family matches your facility criteria, a new lead appears in your dashboard.")}
          ${stepItem("2", "24-Hour Exclusive Window", "Each lead is sent ONLY to your facility first. You get 24 hours of exclusivity before it's redistributed.")}
          ${stepItem("3", "Unlock the Lead", "Review the preview, then unlock to see full contact details and reach out.")}
          ${stepItem("4", "Connect & Convert", "Contact the family promptly. Facilities that respond within 1 hour have a 5x higher placement rate.")}
        </td>
      </tr>
    </table>`;

  email += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #EFF6FF; border-radius: 12px; margin: 20px 0;">
      <tr>
        <td style="padding: 20px; text-align: center;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              ${statBlock("$39", "Per Lead")}
              ${statBlock("24h", "Exclusive")}
              ${statBlock("5x", "Fast Response ROI")}
            </tr>
          </table>
        </td>
      </tr>
    </table>`;

  email += tipBox("Set up email notifications for new leads so you never miss a time-sensitive inquiry. Speed is everything in admissions.", "free");
  email += ctaButton("View Your Leads Dashboard", "https://rehablookup.com/provider/inquiries", "free");
  email += emailBodyEnd();
  email += emailFooter();
  email += emailEnd();
  return email;
}

function generateDay6Email(name: string): string {
  let email = emailStart();
  email += emailHeader("Speed Wins Placements", "free", { icon: "⚡", subtitle: "Day 6: Response time is everything" });
  email += emailBodyStart();
  email += emailGreeting(name);
  email += emailParagraph("In addiction treatment, timing is critical. When a family reaches out, they're often at a turning point. <strong>The faster you respond, the more likely they are to choose your facility.</strong>");

  email += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #FEF2F2; border-radius: 12px; margin: 20px 0;">
      <tr>
        <td style="padding: 24px;">
          <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #991B1B;">⏰ Response Time Impact:</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #991B1B; line-height: 1.6;"><strong>Under 1 hour:</strong> 5x more likely to convert to admission</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #991B1B; line-height: 1.6;"><strong>1-4 hours:</strong> 3x more likely to convert</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #991B1B; line-height: 1.6;"><strong>4-24 hours:</strong> Conversion rate drops 60%</p>
          <p style="margin: 0; font-size: 14px; color: #991B1B; line-height: 1.6;"><strong>After 24 hours:</strong> Lead is likely lost — they've called elsewhere</p>
        </td>
      </tr>
    </table>`;

  email += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #F0FDF4; border-radius: 12px; margin: 20px 0;">
      <tr>
        <td style="padding: 24px;">
          <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #166534;">Best Practices for Fast Response:</p>
          ${checklistItem("Designate someone to monitor leads during business hours")}
          ${checklistItem("Set up a reply email so you get instant notifications")}
          ${checklistItem("Prepare a standard first-contact script")}
          ${checklistItem("Have your intake process ready to go")}
          ${checklistItem("Follow up within 15 minutes if possible")}
        </td>
      </tr>
    </table>`;

  email += ctaButton("Set Up Your Reply Email", "https://rehablookup.com/provider/settings", "free");
  email += emailBodyEnd();
  email += emailFooter();
  email += emailEnd();
  return email;
}

function generateDay7Email(name: string): string {
  let email = emailStart();
  email += emailHeader("Unlock Your Growth Potential", "free", { icon: "🚀", subtitle: "Day 7: Pro features & what's next" });
  email += emailBodyStart();
  email += emailGreeting(name);
  email += emailParagraph("You've made it through your first week on RehabLookup! By now, your listing should be visible to families across the country. Let's talk about how to accelerate your growth.");

  email += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 12px; margin: 20px 0;">
      <tr>
        <td style="padding: 24px;">
          <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #1B365D;">⭐ RehabLookup Pro</p>
          <p style="margin: 0 0 16px 0; font-size: 14px; color: #374151; line-height: 1.6;">Top-performing facilities use Pro to maximize their ROI:</p>
          ${checklistItem("<strong>20% off every lead unlock</strong> — Savings add up fast")}
          ${checklistItem("<strong>Up to 5 facility listings</strong> — List all your locations")}
          ${checklistItem("<strong>Priority visibility</strong> — Appear higher in search results")}
          ${checklistItem("<strong>Concierge network access</strong> — Get matched with vetted seekers")}
          ${checklistItem("<strong>Featured placement rotation</strong> — Stand out on the homepage")}
        </td>
      </tr>
    </table>`;

  email += emailParagraph("Whether you stay on the Free plan or upgrade to Pro, here's your ongoing success checklist:");

  email += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #F8FAFC; border-radius: 12px; margin: 20px 0;">
      <tr>
        <td style="padding: 24px;">
          <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #1E293B;">📋 Ongoing Success Checklist:</p>
          ${checklistItem("Respond to leads within 1 hour")}
          ${checklistItem("Keep your insurance list updated")}
          ${checklistItem("Add new photos seasonally")}
          ${checklistItem("Update your description with new programs")}
          ${checklistItem("Monitor your listing analytics")}
          ${checklistItem("Encourage satisfied families to leave reviews")}
        </td>
      </tr>
    </table>`;

  email += ctaButton("Explore Pro Features", "https://rehablookup.com/provider/billing", "free");
  email += emailDivider();
  email += emailParagraph("Thank you for being part of RehabLookup. Together, we're helping families find the treatment they deserve. If you ever need help, reply to this email or reach out to <a href='mailto:support@rehablookup.com' style='color: #2563eb;'>support@rehablookup.com</a>.");
  email += emailBodyEnd();
  email += emailFooter();
  email += emailEnd();
  return email;
}

// ============================================================================
// EMAIL GENERATOR MAP
// ============================================================================

const DAY_EMAILS: Record<number, { subject: string; generate: (name: string) => string }> = {
  1: { subject: "Welcome to RehabLookup — Your Quick Start Guide", generate: generateDay1Email },
  2: { subject: "Your Profile = 340% More Inquiries (Here's How)", generate: generateDay2Email },
  3: { subject: "Add Photos That Convert Families Into Clients", generate: generateDay3Email },
  4: { subject: "72% of Families Filter by Insurance — Is Yours Listed?", generate: generateDay4Email },
  5: { subject: "How Exclusive Leads Work (And Why Speed Matters)", generate: generateDay5Email },
  6: { subject: "Respond in 1 Hour = 5x More Placements", generate: generateDay6Email },
  7: { subject: "Your First Week Recap + Growth Tips", generate: generateDay7Email },
};

// ============================================================================
// ENROLLMENT FUNCTION - Called when a facility is approved
// ============================================================================

async function enrollProvider(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  facilityId: string,
  providerName: string,
  providerEmail: string
): Promise<void> {
  // Check if already enrolled
  const { data: existing } = await supabase
    .from("provider_onboarding_drip")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    console.log(`[DRIP v${VERSION}] Provider ${userId} already enrolled, skipping`);
    return;
  }

  const { error } = await supabase
    .from("provider_onboarding_drip")
    .insert({
      user_id: userId,
      facility_id: facilityId,
      provider_name: providerName,
      provider_email: providerEmail,
      day_number: 1,
      last_sent_day: 0,
      next_send_at: new Date().toISOString(), // Send day 1 immediately
    });

  if (error) {
    console.error(`[DRIP v${VERSION}] Failed to enroll provider:`, error.message);
  } else {
    console.log(`[DRIP v${VERSION}] Enrolled provider ${userId} for drip sequence`);
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // POST-only enforcement
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", code: "method_not_allowed", allowed: ["POST"] }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
      },
    );
  }


  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error(`[DRIP v${VERSION}] RESEND_API_KEY not configured`);
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const resend = new Resend(resendApiKey);

    // Check if this is an enrollment request
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body.action === "enroll") {
        await enrollProvider(supabase, body.userId, body.facilityId, body.providerName, body.providerEmail);
        return new Response(JSON.stringify({ success: true, enrolled: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Process pending drip emails
    const now = new Date().toISOString();
    const { data: pendingDrips, error: fetchError } = await supabase
      .from("provider_onboarding_drip")
      .select("id, day_number, provider_name, provider_email")
      .eq("completed", false)
      .eq("unsubscribed", false)
      .lte("next_send_at", now)
      .limit(50);

    if (fetchError) {
      console.error(`[DRIP v${VERSION}] Error fetching pending drips:`, fetchError.message);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pendingDrips || pendingDrips.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No pending drips" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[DRIP v${VERSION}] Processing ${pendingDrips.length} pending drip emails`);

    let sent = 0;
    let errors = 0;

    for (const drip of pendingDrips) {
      const dayConfig = DAY_EMAILS[drip.day_number];
      if (!dayConfig) {
        // Mark as completed if past day 7
        await supabase
          .from("provider_onboarding_drip")
          .update({ completed: true, updated_at: new Date().toISOString() })
          .eq("id", drip.id);
        continue;
      }

      const firstName = drip.provider_name?.split(" ")[0] || "there";
      const html = dayConfig.generate(firstName);

      try {
        const emailResult = await sendEmailWithRetry(supabase, resend, {
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [drip.provider_email],
          subject: dayConfig.subject,
          html,
          headers: {
            "List-Unsubscribe": `<mailto:no-reply@rehablookup.com?subject=unsubscribe>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });

        console.log(`[DRIP v${VERSION}] Day ${drip.day_number} sent to ${drip.provider_email}:`, emailResult);

        const nextDay = drip.day_number + 1;
        const isComplete = nextDay > 7;
        const nextSendAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        await supabase
          .from("provider_onboarding_drip")
          .update({
            last_sent_day: drip.day_number,
            day_number: nextDay,
            next_send_at: isComplete ? null : nextSendAt,
            completed: isComplete,
            updated_at: new Date().toISOString(),
          })
          .eq("id", drip.id);

        sent++;
        await sleep(BULK_SEND_DELAY_MS);
      } catch (emailError) {
        console.error(`[DRIP v${VERSION}] Error sending day ${drip.day_number} to ${drip.provider_email}:`, emailError);
        errors++;

        // Retry in 1 hour
        await supabase
          .from("provider_onboarding_drip")
          .update({
            next_send_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", drip.id);
      }
    }

    console.log(`[DRIP v${VERSION}] Completed: ${sent} sent, ${errors} errors`);

    return new Response(
      JSON.stringify({ processed: pendingDrips.length, sent, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[DRIP v${VERSION}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
