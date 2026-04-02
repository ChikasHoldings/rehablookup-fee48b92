CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_purchase_idempotency 
ON public.credit_transactions (reference_id, transaction_type) 
WHERE transaction_type = 'purchase' AND reference_id IS NOT NULL;