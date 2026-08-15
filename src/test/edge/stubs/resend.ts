/**
 * Test double for `https://esm.sh/resend`.
 *
 * Captures outbound email sends instead of delivering them. Tests can inspect
 * `__sentEmails()` to assert notification behaviour without touching Resend.
 */
interface SentEmail {
  payload: unknown;
}

let sent: SentEmail[] = [];

export function __resetResend(): void {
  sent = [];
}

export function __sentEmails(): SentEmail[] {
  return sent;
}

export class Resend {
  emails = {
    send: async (payload: unknown) => {
      sent.push({ payload });
      return { data: { id: `test-email-${sent.length}` }, error: null };
    },
  };

  batch = {
    send: async (payload: unknown) => {
      sent.push({ payload });
      return { data: [{ id: `test-batch-${sent.length}` }], error: null };
    },
  };

  constructor(_apiKey?: string) {}
}

export default Resend;
