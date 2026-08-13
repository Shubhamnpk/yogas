import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const SESSION_KEY = "YoGas_session_token";

export type AppRole = "consumer" | "dealer" | "admin";

export type AppUser = {
  id: string;
  accountId: Id<"accounts">;
  email: string;
};

export type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  citizenship_no: string | null;
  address: string | null;
  district: string | null;
  collection_code: string | null;
  phone: string | null;
  email: string | null;
  total_purchased_quantity: number;
  last_collected_at: number | null;
  cooldown_until: number | null;
};

export type Dealer = {
  id: Id<"dealers">;
  owner_id: Id<"accounts">;
  business_name: string;
  license_no: string | null;
  district: string;
  address: string | null;
  phone: string | null;
  stock: number;
  code: string;
  is_active: boolean;
  approval_status: "pending" | "approved" | "rejected";
  requested_at: number;
  reviewed_at: number | null;
};

type AuthValue = {
  loading: boolean;
  user: AppUser | null;
  profile: Profile | null;
  role: AppRole | null;
  dealer: Dealer | null;
  profileComplete: boolean;
  sessionToken: string | null;
  setSessionToken: (token: string) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

function storedSessionToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionToken, setSessionTokenState] = useState<string | null>(() => storedSessionToken());
  const viewer = useQuery(api.app.viewer, { sessionToken: sessionToken ?? undefined });

  useEffect(() => {
    if (viewer === null && sessionToken) {
      window.localStorage.removeItem(SESSION_KEY);
      setSessionTokenState(null);
    }
  }, [viewer, sessionToken]);

  const setSessionToken = useCallback((next: string) => {
    window.localStorage.setItem(SESSION_KEY, next);
    setSessionTokenState(next);
  }, []);

  const refresh = useCallback(async () => {}, []);

  const signOut = useCallback(async () => {
    window.localStorage.removeItem(SESSION_KEY);
    setSessionTokenState(null);
  }, []);

  const value = useMemo<AuthValue>(() => {
    const account = viewer?.account ?? null;
    const userProfile = viewer?.user ?? null;
    const d = viewer?.dealer ?? null;
    const role = account?.role ?? null;
    const profile: Profile | null = userProfile
      ? {
          id: userProfile._id,
          username: userProfile.username ?? null,
          full_name: userProfile.fullName ?? null,
          citizenship_no: userProfile.citizenshipNo ?? null,
          address: userProfile.address ?? null,
          district: userProfile.district ?? null,
          collection_code: userProfile.collectionCode ?? null,
          phone: userProfile.phone ?? null,
          email: account?.email ?? null,
          total_purchased_quantity: userProfile.totalPurchasedQuantity ?? 0,
          last_collected_at: userProfile.lastCollectedAt ?? null,
          cooldown_until: userProfile.cooldownUntil ?? null,
        }
      : null;
    const dealer: Dealer | null = d
      ? {
          id: d._id,
          owner_id: d.ownerAccountId,
          business_name: d.businessName,
          license_no: d.licenseNo ?? null,
          district: d.district,
          address: d.address ?? null,
          phone: d.phone ?? null,
          stock: d.stock,
          code: d.code,
          is_active: d.isActive,
          approval_status: d.approvalStatus,
          requested_at: d.requestedAt,
          reviewed_at: d.reviewedAt ?? null,
        }
      : null;
    const user = account ? { id: account._id, email: account.email } : null;
    const currentUser = account && sessionToken
      ? { id: sessionToken, accountId: account._id, email: account.email }
      : null;
    const profileComplete = Boolean(
      role === "admin"
        ? true
        : role === "dealer"
          ? dealer && profile?.full_name && profile?.username
          : profile?.full_name &&
              profile?.username &&
              profile?.citizenship_no &&
              profile?.address &&
              profile?.district,
    );
    return {
      loading: viewer === undefined,
      user: currentUser,
      profile,
      role,
      dealer,
      profileComplete,
      sessionToken,
      setSessionToken,
      refresh,
      signOut,
    };
  }, [viewer, sessionToken, setSessionToken, refresh, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
