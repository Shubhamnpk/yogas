import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Bell,
  Flame,
  LayoutGrid,
  LogOut,
  QrCode,
  Store,
  Boxes,
  ScanLine,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { QrFab } from "@/components/QrFab";

type NavItem = { to: string; label: string; icon: typeof Flame };


const CONSUMER_NAV: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: LayoutGrid },
  { to: "/dealers", label: "Depots", icon: Store },
  { to: "/scan", label: "Scan", icon: QrCode },
  { to: "/notifications", label: "Alerts", icon: Bell },
];

const DEALER_NAV: NavItem[] = [
  { to: "/dealer", label: "Queue", icon: LayoutGrid },
  { to: "/dealer/scan", label: "Verify", icon: ScanLine },
  { to: "/dealer/stock", label: "Stock", icon: Boxes },
  { to: "/notifications", label: "Alerts", icon: Bell },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { role, profile, dealer, signOut, user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = role === "dealer" ? DEALER_NAV : CONSUMER_NAV;
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const count = async () => {
      const { count: c } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (active) setUnread(c ?? 0);
    };
    void count();
    const channel = supabase
      .channel("notif-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void count(),
      )
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user, pathname]);

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/auth", replace: true });
  };

  const title = role === "dealer" ? (dealer?.business_name ?? "Depot") : (profile?.full_name ?? "Consumer");

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link to={role === "dealer" ? "/dealer" : "/dashboard"} className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-flame text-primary-foreground shadow-soft">
              <Flame className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold">GasQueue</span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  pathname === item.to && "bg-accent text-accent-foreground",
                )}
              >
                {item.label}
                {item.to === "/notifications" && unread > 0 ? (
                  <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {unread}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent"
            >
              <span className="grid size-8 place-items-center rounded-full bg-secondary text-secondary-foreground">
                <UserRound className="size-4" />
              </span>
              <span className="hidden text-right sm:block">
                <span className="block text-sm font-semibold leading-tight">{title}</span>
                <span className="block text-xs capitalize text-muted-foreground">
                  {role ?? "member"}
                </span>
              </span>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </div>

        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:py-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {item.label}
                {item.to === "/notifications" && unread > 0 ? (
                  <span className="absolute right-1/4 top-1.5 size-2 rounded-full bg-primary" />
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      <QrFab />
    </div>

  );
}
