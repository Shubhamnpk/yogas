import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "consumer" | "dealer";

export type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  citizenship_no: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
};

export type Dealer = {
  id: string;
  owner_id: string | null;
  business_name: string;
  license_no: string | null;
  district: string;
  address: string | null;
  phone: string | null;
  stock: number;
  code: string;
  is_active: boolean;
};

type AuthValue = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  dealer: Dealer | null;
  profileComplete: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      setRole(null);
      setDealer(null);
      return;
    }
    const [{ data: p }, { data: roles }, { data: d }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("dealers").select("*").eq("owner_id", uid).maybeSingle(),
    ]);
    setProfile((p as Profile) ?? null);
    setRole(((roles?.[0]?.role as AppRole | undefined) ?? null) as AppRole | null);
    setDealer((d as Dealer) ?? null);
  }, []);

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      void load(next?.user.id).then(() => active && setLoading(false));
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void load(data.session?.user.id).then(() => active && setLoading(false));
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    await load(data.session?.user.id);
  }, [load]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setRole(null);
    setDealer(null);
  }, []);

  const value = useMemo<AuthValue>(() => {
    const user = session?.user ?? null;
    const profileComplete = Boolean(
      role === "dealer"
        ? dealer && profile?.full_name && profile?.username
        : profile?.full_name && profile?.username && profile?.citizenship_no && profile?.address,
    );
    return { loading, user, session, profile, role, dealer, profileComplete, refresh, signOut };
  }, [loading, session, profile, role, dealer, refresh, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
