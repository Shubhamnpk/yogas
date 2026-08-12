CREATE OR REPLACE FUNCTION public.queue_position(_entry_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT count(*) + 1
    FROM public.waitlist_entries w2
    WHERE w2.dealer_id = w.dealer_id
      AND w2.status = 'waiting'
      AND w2.created_at < w.created_at
  )::int
  FROM public.waitlist_entries w
  WHERE w.id = _entry_id
    AND w.status = 'waiting'
    AND (
      w.consumer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.dealers d WHERE d.id = w.dealer_id AND d.owner_id = auth.uid())
    )
$$;

REVOKE ALL ON FUNCTION public.queue_position(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.queue_position(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.dealer_waiting_count(_dealer_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int
  FROM public.waitlist_entries w
  WHERE w.dealer_id = _dealer_id AND w.status = 'waiting'
$$;

REVOKE ALL ON FUNCTION public.dealer_waiting_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dealer_waiting_count(uuid) TO anon, authenticated;