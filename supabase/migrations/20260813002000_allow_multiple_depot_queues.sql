DROP INDEX IF EXISTS public.waitlist_active_per_consumer;

CREATE OR REPLACE FUNCTION public.check_entry_allowed()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.waitlist_entries w
             WHERE w.consumer_id = NEW.consumer_id AND w.status = 'allotted') THEN
    RAISE EXCEPTION 'You already have gas allotted. Collect it before requesting again.';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS waitlist_check_allowed ON public.waitlist_entries;
CREATE TRIGGER waitlist_check_allowed BEFORE INSERT ON public.waitlist_entries
FOR EACH ROW EXECUTE FUNCTION public.check_entry_allowed();

CREATE OR REPLACE FUNCTION public.allot_entry(_entry_id uuid)
RETURNS public.waitlist_entries LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.waitlist_entries; d public.dealers;
BEGIN
  SELECT * INTO e FROM public.waitlist_entries WHERE id = _entry_id FOR UPDATE;
  IF e IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  SELECT * INTO d FROM public.dealers WHERE id = e.dealer_id FOR UPDATE;
  IF d.owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Not your depot'; END IF;
  IF e.status <> 'waiting' THEN RAISE EXCEPTION 'Entry is not waiting'; END IF;
  IF d.stock < e.quantity THEN RAISE EXCEPTION 'Not enough stock'; END IF;
  UPDATE public.dealers SET stock = stock - e.quantity WHERE id = d.id;
  UPDATE public.waitlist_entries SET status = 'allotted', allotted_at = now() WHERE id = e.id RETURNING * INTO e;
  UPDATE public.waitlist_entries SET status = 'cancelled'
    WHERE consumer_id = e.consumer_id AND id <> e.id AND status = 'waiting';
  RETURN e;
END; $$;

REVOKE ALL ON FUNCTION public.allot_entry(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.allot_entry(uuid) TO authenticated;
