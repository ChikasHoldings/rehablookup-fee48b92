import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOG = "[SEEKER-DRIP]";

/**
 * Seeker Onboarding Drip Campaign
 * 5-step automated email sequence over 14 days:
 *   Step 0 → welcome (sent at signup, handled by auth trigger)
 *   Step 1 → welcome_followup (Day 1, 24h after signup)
 *   Step 2 → tips_finding_treatment (Day 3)
 *   Step 3 → placement_intro (Day 7)
 *   Step 4 → account_reminder (Day 14) — only if no activity
 */

const DRIP_STEPS = [
  { step: 1, type: "welcome_followup",      delayHours: 24,  label: "Welcome follow-up" },
  { step: 2, type: "tips_finding_treatment", delayHours: 72,  label: "Treatment tips" },
  { step: 3, type: "placement_intro",        delayHours: 168, label: "Placement intro" },
  { step: 4, type: "account_reminder",       delayHours: 336, label: "Re-engagement" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`${LOG} Starting seeker drip processing`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Enroll new seekers who don't have a drip record yet
    const { data: unenrolled } = await supabase
      .from("seeker_profiles")
      .select("user_id")
      .not("user_id", "in", `(SELECT user_id FROM seeker_onboarding_drip)`)
      .limit(50);

    // Manual approach since subqueries don't work in PostgREST
    const { data: allSeekers } = await supabase
      .from("seeker_profiles")
      .select("user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    const { data: existingDrips } = await supabase
      .from("seeker_onboarding_drip")
      .select("user_id");

    const enrolledIds = new Set((existingDrips || []).map(d => d.user_id));
    const newSeekers = (allSeekers || []).filter(s => !enrolledIds.has(s.user_id));

    let enrolled = 0;
    for (const seeker of newSeekers.slice(0, 50)) {
      const { data: authUser } = await supabase.auth.admin.getUserById(seeker.user_id);
      if (!authUser?.user?.email) continue;

      await supabase.from("seeker_onboarding_drip").upsert({
        user_id: seeker.user_id,
        email: authUser.user.email,
        current_step: 0,
        completed: false,
        opted_out: false,
      }, { onConflict: "user_id" });
      enrolled++;
    }

    if (enrolled > 0) console.log(`${LOG} Enrolled ${enrolled} new seeker(s)`);

    // 2. Process active drips
    const { data: activeDrips } = await supabase
      .from("seeker_onboarding_drip")
      .select("*")
      .eq("completed", false)
      .eq("opted_out", false)
      .lt("current_step", DRIP_STEPS.length)
      .limit(100);

    if (!activeDrips?.length) {
      console.log(`${LOG} No active drips to process`);
      return new Response(
        JSON.stringify({ success: true, enrolled, sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    const now = Date.now();

    for (const drip of activeDrips) {
      const nextStepIndex = drip.current_step;
      if (nextStepIndex >= DRIP_STEPS.length) {
        // Mark completed
        await supabase.from("seeker_onboarding_drip").update({ completed: true }).eq("id", drip.id);
        continue;
      }

      const stepConfig = DRIP_STEPS[nextStepIndex];
      const createdAt = new Date(drip.created_at).getTime();
      const hoursElapsed = (now - createdAt) / (1000 * 60 * 60);

      // Check if enough time has passed
      if (hoursElapsed < stepConfig.delayHours) continue;

      // Check minimum gap between emails (at least 20h between sends)
      if (drip.last_email_sent_at) {
        const lastSent = new Date(drip.last_email_sent_at).getTime();
        const hoursSinceLast = (now - lastSent) / (1000 * 60 * 60);
        if (hoursSinceLast < 20) continue;
      }

      // For step 4 (re-engagement), check if seeker has been active
      if (stepConfig.step === 4) {
        // Check for recent leads or concierge inquiries
        const { count: recentActivity } = await supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("email", drip.email)
          .gte("created_at", new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString());

        if ((recentActivity || 0) > 0) {
          // Active user — skip re-engagement, mark completed
          await supabase.from("seeker_onboarding_drip").update({ completed: true }).eq("id", drip.id);
          console.log(`${LOG} Skipping re-engagement for active seeker ${drip.user_id}`);
          continue;
        }
      }

      // Send the email via send-seeker-emails
      try {
        const { error } = await supabase.functions.invoke("send-seeker-emails", {
          body: {
            type: stepConfig.type,
            seekerId: drip.user_id,
            email: drip.email,
          },
        });

        if (error) {
          console.error(`${LOG} Failed to send ${stepConfig.label} to ${drip.email}:`, error);
          continue;
        }

        // Update drip progress
        const newStep = nextStepIndex + 1;
        await supabase.from("seeker_onboarding_drip").update({
          current_step: newStep,
          last_email_sent_at: new Date().toISOString(),
          completed: newStep >= DRIP_STEPS.length,
        }).eq("id", drip.id);

        sent++;
        console.log(`${LOG} ✓ Sent ${stepConfig.label} (step ${stepConfig.step}) to ${drip.email}`);
      } catch (err) {
        console.error(`${LOG} Error sending to ${drip.email}:`, err);
      }
    }

    console.log(`${LOG} Complete: enrolled=${enrolled}, sent=${sent}`);

    return new Response(
      JSON.stringify({ success: true, enrolled, sent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`${LOG} Error:`, msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
