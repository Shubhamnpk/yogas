-- ROLES ENUM
CREATE TYPE public.app_role AS ENUM ('consumer', 'dealer');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  full_name text,
  citizenship_no text,
  address text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- DEALERS
CREATE TABLE public.dealers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  license_no text,
  district text NOT NULL,
  address text,
  phone text,
  stock integer NOT NULL DEFAULT 0,
  code text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dealers TO anon;
GRANT SELECT, INSERT, UPDATE ON public.dealers TO authenticated;
GRANT ALL ON public.dealers TO service_role;
ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dealers are public" ON public.dealers FOR SELECT USING (true);
CREATE POLICY "dealer creates own depot" ON public.dealers FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'dealer'));
CREATE POLICY "dealer updates own depot" ON public.dealers FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- WAITLIST ENTRIES
CREATE TABLE public.waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  consumer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cylinder_size text NOT NULL DEFAULT '14.2kg',
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 5),
  note text,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','allotted','collected','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  allotted_at timestamptz,
  collected_at timestamptz
);
CREATE INDEX waitlist_dealer_status_idx ON public.waitlist_entries (dealer_id, status, created_at);
CREATE INDEX waitlist_consumer_idx ON public.waitlist_entries (consumer_id, created_at DESC);
CREATE UNIQUE INDEX waitlist_one_open_per_dealer ON public.waitlist_entries (dealer_id, consumer_id) WHERE status IN ('waiting','allotted');

GRANT SELECT, INSERT, UPDATE ON public.waitlist_entries TO authenticated;
GRANT ALL ON public.waitlist_entries TO service_role;
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consumer reads own entries" ON public.waitlist_entries FOR SELECT TO authenticated USING (auth.uid() = consumer_id);
CREATE POLICY "dealer reads depot entries" ON public.waitlist_entries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dealers d WHERE d.id = dealer_id AND d.owner_id = auth.uid()));
CREATE POLICY "consumer joins queue" ON public.waitlist_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = consumer_id);
CREATE POLICY "consumer updates own entry" ON public.waitlist_entries FOR UPDATE TO authenticated USING (auth.uid() = consumer_id) WITH CHECK (auth.uid() = consumer_id);
CREATE POLICY "dealer updates depot entries" ON public.waitlist_entries FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dealers d WHERE d.id = dealer_id AND d.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.dealers d WHERE d.id = dealer_id AND d.owner_id = auth.uid()));

-- PROFILES POLICIES (after waitlist so the dealer policy can reference it)
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "dealer reads queued consumer profile" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.waitlist_entries w
    JOIN public.dealers d ON d.id = w.dealer_id
    WHERE w.consumer_id = profiles.id AND d.owner_id = auth.uid()
  ));
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER dealers_touch BEFORE UPDATE ON public.dealers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- new user -> profile
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'username')
  ON CONFLICT (id) DO NOTHING;
  IF NEW.raw_user_meta_data->>'role' IN ('consumer','dealer') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- notify consumer on status change
CREATE OR REPLACE FUNCTION public.notify_entry_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dname text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT business_name INTO dname FROM public.dealers WHERE id = NEW.dealer_id;
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (
      NEW.consumer_id,
      CASE NEW.status
        WHEN 'allotted' THEN 'Cylinder allotted'
        WHEN 'collected' THEN 'Cylinder collected'
        WHEN 'cancelled' THEN 'Request cancelled'
        ELSE 'Request updated' END,
      CASE NEW.status
        WHEN 'allotted' THEN 'Your cylinder at ' || dname || ' is reserved. Show your QR code at the depot to collect it.'
        WHEN 'collected' THEN 'Your cylinder was handed over at ' || dname || '. Thank you.'
        WHEN 'cancelled' THEN 'Your request at ' || dname || ' was cancelled.'
        ELSE 'Your request at ' || dname || ' was updated.' END
    );
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER waitlist_notify AFTER UPDATE ON public.waitlist_entries FOR EACH ROW EXECUTE FUNCTION public.notify_entry_status();

-- ALLOT (atomic stock decrement, dealer-owned only)
CREATE OR REPLACE FUNCTION public.allot_entry(_entry_id uuid) RETURNS public.waitlist_entries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  RETURN e;
END; $$;
REVOKE ALL ON FUNCTION public.allot_entry(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.allot_entry(uuid) TO authenticated;

-- COLLECT
CREATE OR REPLACE FUNCTION public.collect_entry(_entry_id uuid) RETURNS public.waitlist_entries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.waitlist_entries; d public.dealers;
BEGIN
  SELECT * INTO e FROM public.waitlist_entries WHERE id = _entry_id FOR UPDATE;
  IF e IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  SELECT * INTO d FROM public.dealers WHERE id = e.dealer_id;
  IF d.owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Not your depot'; END IF;
  IF e.status <> 'allotted' THEN RAISE EXCEPTION 'Cylinder is not allotted yet'; END IF;
  UPDATE public.waitlist_entries SET status = 'collected', collected_at = now() WHERE id = e.id RETURNING * INTO e;
  RETURN e;
END; $$;
REVOKE ALL ON FUNCTION public.collect_entry(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.collect_entry(uuid) TO authenticated;

-- CANCEL (dealer or consumer); returns stock if it was allotted
CREATE OR REPLACE FUNCTION public.cancel_entry(_entry_id uuid) RETURNS public.waitlist_entries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.waitlist_entries; d public.dealers;
BEGIN
  SELECT * INTO e FROM public.waitlist_entries WHERE id = _entry_id FOR UPDATE;
  IF e IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  SELECT * INTO d FROM public.dealers WHERE id = e.dealer_id FOR UPDATE;
  IF e.consumer_id <> auth.uid() AND d.owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF e.status NOT IN ('waiting','allotted') THEN RAISE EXCEPTION 'Cannot cancel this request'; END IF;
  IF e.status = 'allotted' THEN UPDATE public.dealers SET stock = stock + e.quantity WHERE id = d.id; END IF;
  UPDATE public.waitlist_entries SET status = 'cancelled' WHERE id = e.id RETURNING * INTO e;
  RETURN e;
END; $$;
REVOKE ALL ON FUNCTION public.cancel_entry(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.cancel_entry(uuid) TO authenticated;

-- DEMO DEPOTS
INSERT INTO public.dealers (business_name, license_no, district, address, phone, stock, code) VALUES
  ('Everest Gas Suppliers', 'LPG-KTM-1042', 'Kathmandu', 'Chabahil Chowk, Kathmandu', '+977-9801000001', 42, 'EVEREST1'),
  ('Himal LP Gas Depot', 'LPG-LTP-2210', 'Lalitpur', 'Kupondole, Lalitpur', '+977-9801000002', 18, 'HIMAL002'),
  ('Bagmati Gas Udhyog', 'LPG-BKT-3391', 'Bhaktapur', 'Suryabinayak, Bhaktapur', '+977-9801000003', 0, 'BAGMATI3'),
  ('Pokhara Fewa Gas Center', 'LPG-KSK-4408', 'Kaski', 'Lakeside Road, Pokhara', '+977-9801000004', 63, 'FEWAGAS4'),
  ('Lumbini Gas Traders', 'LPG-RUP-5517', 'Rupandehi', 'Butwal Bus Park Road', '+977-9801000005', 25, 'LUMBINI5'),
  ('Koshi Gas Depot', 'LPG-MOR-6620', 'Morang', 'Dharan Road, Biratnagar', '+977-9801000006', 9, 'KOSHI006');