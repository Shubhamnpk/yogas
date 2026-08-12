REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.allot_entry(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.collect_entry(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.cancel_entry(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.notify_entry_status() FROM anon, authenticated, public;