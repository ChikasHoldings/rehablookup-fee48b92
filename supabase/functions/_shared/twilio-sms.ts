// Shared Twilio SMS sender.
//
// Normalizes a recipient to US E.164, POSTs to Twilio with one retry on
// transient 5xx/network errors, and writes an sms_outbound_log audit row.
//
// IMPORTANT: this helper only SENDS + logs. Callers are responsible for
// TCPA gating (verified phone, explicit opt-in, not opted-out) BEFORE
// calling — never call this for a recipient who hasn't consented.

export interface TwilioCreds {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export function normalizeUsPhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  let phone: string;
  if (digits.length === 10) phone = `+1${digits}`;
  else if (digits.length === 11 && digits.startsWith("1")) phone = `+${digits}`;
  else if (raw.trim().startsWith("+")) phone = `+${digits}`;
  else phone = `+${digits}`;
  return /^\+1\d{10}$/.test(phone) ? phone : null;
}

export interface SendSmsResult {
  sent: boolean;
  sid?: string;
  reason?: string;
}

// deno-lint-ignore no-explicit-any
export async function sendSms(
  supabase: any,
  creds: TwilioCreds,
  opts: { to: string; body: string; userId?: string | null; notificationType: string },
): Promise<SendSmsResult> {
  const to = normalizeUsPhone(opts.to);
  if (!to) return { sent: false, reason: "invalid_phone" };

  // Single-segment SMS is 160 chars; keep a little headroom and hard-cap so
  // a runaway body can't fan out into many billed segments.
  const body = opts.body.length > 320 ? opts.body.slice(0, 317) + "..." : opts.body;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`;
  const auth = btoa(`${creds.accountSid}:${creds.authToken}`);

  let resp: Response | null = null;
  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: creds.fromNumber, Body: body }),
      });
      if (resp.ok) break;
      lastErr = await resp.text();
      // 4xx (except 429) is permanent — don't retry.
      if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) break;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (!resp || !resp.ok) {
    try {
      await supabase.from("sms_outbound_log").insert({
        user_id: opts.userId ?? null,
        notification_type: opts.notificationType,
        recipient_phone: to,
        status: "failed",
        twilio_status: resp?.status ?? null,
        error_message: lastErr.slice(0, 500),
      });
    } catch (_e) {
      // sms_outbound_log may not exist in some envs — non-fatal.
    }
    return { sent: false, reason: "twilio_error" };
  }

  const result = await resp.json();
  try {
    await supabase.from("sms_outbound_log").insert({
      user_id: opts.userId ?? null,
      notification_type: opts.notificationType,
      recipient_phone: to,
      status: "sent",
      twilio_sid: result.sid,
    });
  } catch (_e) {
    // non-fatal
  }
  return { sent: true, sid: result.sid };
}
