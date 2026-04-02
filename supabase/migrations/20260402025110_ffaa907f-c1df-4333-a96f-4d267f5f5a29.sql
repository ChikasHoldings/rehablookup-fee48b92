CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_unlock_idempotency 
ON public.credit_transactions (reference_id, provider_id, transaction_type) 
WHERE transaction_type = 'unlock' AND reference_id IS NOT NULL;