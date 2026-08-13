import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { DealerPendingApproval } from "@/components/DealerPendingApproval";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
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
  const { loading, profileComplete, user, role, dealer, profile } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const onOnboarding = pathname === "/onboarding";

  const dealerBlocked =
    role === "dealer" &&
    dealer !== null &&
    dealer.approval_status !== "approved";

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: "/auth", replace: true });
      return;
    }
    if (!loading && !profileComplete && !onOnboarding) {
      void navigate({ to: "/onboarding", replace: true });
    }
  }, [loading, profileComplete, user, onOnboarding, navigate]);

  if (loading) return <Spinner />;
  if (!user) return <Spinner />;
  if (onOnboarding) return <Outlet />;
  if (!profileComplete) return <Spinner />;

  if (dealerBlocked && dealer) {
    return <DealerPendingApproval dealer={dealer} profile={profile} />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
