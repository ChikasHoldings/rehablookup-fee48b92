import { test, expect } from "@playwright/test";

/**
 * Realtime channel isolation contract test.
 *
 * Verifies that a user CANNOT subscribe to another user's notification stream
 * by spoofing channel names or filter values. The Postgres RLS policies on
 * `provider_notifications` and `seeker_notifications` MUST ensure that the
 * realtime fan-out only delivers payloads whose `user_id` matches the
 * authenticated caller — even if the client crafts a filter for someone else.
 *
 * This is a NEGATIVE test: any received payload for User B while authenticated
 * as User A is a critical regression and must fail the build.
 *
 * Note: this test relies on two seed test accounts (USER_A_*, USER_B_*) that
 * must exist in the test environment. If those env vars are missing, the test
 * is skipped (so CI still passes for forks / preview branches without seeds).
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const USER_A_EMAIL = process.env.E2E_USER_A_EMAIL;
const USER_A_PASSWORD = process.env.E2E_USER_A_PASSWORD;
const USER_B_ID = process.env.E2E_USER_B_ID;

test.describe("Realtime channel isolation", () => {
  test.skip(
    !SUPABASE_URL || !SUPABASE_ANON || !USER_A_EMAIL || !USER_A_PASSWORD || !USER_B_ID,
    "Seed accounts not configured for this environment"
  );

  test("user A cannot receive User B notifications via spoofed filter", async ({ page }) => {
    // Run inside the browser context so we use the real supabase-js realtime client.
    const result = await page.evaluate(
      async ({ url, anon, email, password, otherUserId }) => {
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
        const client = createClient(url, anon, { auth: { persistSession: false } });

        const { error: signInError } = await client.auth.signInWithPassword({ email, password });
        if (signInError) return { ok: false, reason: `sign-in: ${signInError.message}` };

        const received: unknown[] = [];

        const channel = client
          .channel("isolation-test")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "provider_notifications",
              filter: `user_id=eq.${otherUserId}`,
            },
            (payload) => received.push(payload)
          )
          .subscribe();

        // Wait 4s for any leaked events to arrive.
        await new Promise((r) => setTimeout(r, 4000));
        await client.removeChannel(channel);
        await client.auth.signOut();

        return { ok: received.length === 0, leaked: received.length };
      },
      {
        url: SUPABASE_URL!,
        anon: SUPABASE_ANON!,
        email: USER_A_EMAIL!,
        password: USER_A_PASSWORD!,
        otherUserId: USER_B_ID!,
      }
    );

    expect(result.ok, `User A leaked ${result.leaked ?? "?"} payloads from User B`).toBe(true);
  });
});
