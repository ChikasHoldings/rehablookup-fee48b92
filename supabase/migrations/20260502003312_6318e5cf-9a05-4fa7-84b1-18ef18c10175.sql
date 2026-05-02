-- Domestic concierge is free for clients ($0). The legacy default of 2900
-- caused every domestic row to look like a paid case, which fee-calculation
-- code had been (incorrectly) using as a heuristic for "international".
-- Move all rows that still carry the legacy 2900 default to 0, and change
-- the column default so future inserts that omit the field are correct.
ALTER TABLE public.concierge_inquiries ALTER COLUMN payment_amount_cents SET DEFAULT 0;
UPDATE public.concierge_inquiries SET payment_amount_cents = 0 WHERE payment_amount_cents = 2900;