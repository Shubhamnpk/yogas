
-- 1) profiles: district + collection_code
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS collection_code text;

CREATE OR REPLACE FUNCTION public.gen_collection_code()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'GQ-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))
$$;

UPDATE public.profiles SET collection_code = public.gen_collection_code() WHERE collection_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_collection_code_key ON public.profiles(collection_code);

CREATE OR REPLACE FUNCTION public.set_collection_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.collection_code IS NULL THEN NEW.collection_code := public.gen_collection_code(); END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_collection_code ON public.profiles;
CREATE TRIGGER profiles_collection_code BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_collection_code();

-- 2) clean existing data first
DELETE FROM public.waitlist_entries w USING public.dealers d
  WHERE w.dealer_id = d.id AND d.owner_id IS NULL;
DELETE FROM public.dealers WHERE owner_id IS NULL;

UPDATE public.waitlist_entries w SET status = 'cancelled'
WHERE w.status IN ('waiting','allotted')
  AND w.id <> (
    SELECT w2.id FROM public.waitlist_entries w2
    WHERE w2.consumer_id = w.consumer_id AND w2.status IN ('waiting','allotted')
    ORDER BY (w2.status = 'allotted') DESC, w2.created_at DESC LIMIT 1
  );

-- one active request per person, no duplicate depot queue
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_active_per_consumer
  ON public.waitlist_entries(consumer_id)
  WHERE status IN ('waiting','allotted');

CREATE OR REPLACE FUNCTION public.check_entry_allowed()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.waitlist_entries w
             WHERE w.consumer_id = NEW.consumer_id AND w.status = 'allotted') THEN
    RAISE EXCEPTION 'You already have a cylinder allotted. Collect it before requesting again.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.waitlist_entries w
             WHERE w.consumer_id = NEW.consumer_id AND w.status = 'waiting') THEN
    RAISE EXCEPTION 'You are already waiting in a queue. Cancel it before joining another depot.';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS waitlist_check_allowed ON public.waitlist_entries;
CREATE TRIGGER waitlist_check_allowed BEFORE INSERT ON public.waitlist_entries
FOR EACH ROW EXECUTE FUNCTION public.check_entry_allowed();

-- 3) allot cancels the consumer's other waiting entries
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
  UPDATE public.waitlist_entries SET status = 'cancelled'
    WHERE consumer_id = e.consumer_id AND id <> e.id AND status = 'waiting';
  UPDATE public.waitlist_entries SET status = 'allotted', allotted_at = now() WHERE id = e.id RETURNING * INTO e;
  RETURN e;
END; $$;

-- 4) dealer lookup of a consumer by collection code
CREATE OR REPLACE FUNCTION public.consumer_id_by_code(_code text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id FROM public.profiles p
  WHERE upper(p.collection_code) = upper(trim(_code))
    AND EXISTS (SELECT 1 FROM public.dealers d WHERE d.owner_id = auth.uid())
$$;
