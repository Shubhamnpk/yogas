import { createFileRoute, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function Spinner() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );
}

function AuthenticatedLayout() {
  const { loading, profileComplete } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const onOnboarding = pathname === "/onboarding";

  useEffect(() => {
    if (!loading && !profileComplete && !onOnboarding) {
      void navigate({ to: "/onboarding", replace: true });
    }
  }, [loading, profileComplete, onOnboarding, navigate]);

  if (loading) return <Spinner />;
  if (onOnboarding) return <Outlet />;
  if (!profileComplete) return <Spinner />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
