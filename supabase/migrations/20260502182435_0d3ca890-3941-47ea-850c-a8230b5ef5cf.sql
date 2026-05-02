-- Grant SELECT to anon on every facilities column EXCEPT email + reply_email.
-- Use pg_attribute to enumerate, so we never miss columns added later by other migrations.
DO $$
DECLARE
  col_list text;
BEGIN
  SELECT string_agg(quote_ident(attname), ', ')
  INTO col_list
  FROM pg_attribute
  WHERE attrelid = 'public.facilities'::regclass
    AND attnum > 0
    AND NOT attisdropped
    AND attname NOT IN ('email', 'reply_email');

  EXECUTE format('GRANT SELECT (%s) ON public.facilities TO anon', col_list);
END $$;