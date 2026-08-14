import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import {
  Bell,
  ClipboardList,
  Flame,
  LayoutGrid,
  LogOut,
  ShieldCheck,
  Store,
  Boxes,
  UserRound,
  ScanLine,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { QrFab, ScanFabTrigger } from "@/components/QrFab";
import { Logo } from "@/components/Logo";

type NavItem = { to: string; label: string; icon: typeof Flame };

const CONSUMER_NAV: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: LayoutGrid },
  { to: "/waitlist", label: "Waitlist", icon: ClipboardList },
  { to: "/dealers", label: "Depots", icon: Store },
];

const DEALER_NAV: NavItem[] = [
  { to: "/dealer", label: "Home", icon: LayoutGrid },
  { to: "/dealer/waitlist", label: "Waitlist", icon: ClipboardList },
  { to: "/dealer/stock", label: "Stock", icon: Boxes },
];

const ADMIN_NAV: NavItem[] = [{ to: "/dashboard", label: "Home", icon: LayoutGrid }];

const PROFILE_NAV: NavItem = { to: "/profile", label: "Profile", icon: UserRound };

export function AppShell({ children }: { children: ReactNode }) {
  const { role, profile, dealer, signOut, user, sessionToken } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [scanOpen, setScanOpen] = useState(false);
  const nav = role === "dealer" ? DEALER_NAV : role === "admin" ? ADMIN_NAV : CONSUMER_NAV;
  const unread =
    useQuery(api.notifications.unreadCount, sessionToken ? { sessionToken } : "skip") ?? 0;

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/auth", replace: true });
  };

  const title =
    role === "dealer"
      ? (dealer?.business_name ?? "Depot")
      : role === "admin"
        ? "Administrator"
        : (profile?.full_name ?? "Consumer");

  const homeTo = role === "dealer" ? "/dealer" : "/dashboard";

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link to={homeTo} className="flex items-center gap-2">
            <Logo />
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
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/notifications"
              className="relative grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
              {unread > 0 ? (
                <span className="absolute right-0.5 top-0.5 size-2 rounded-full bg-primary ring-2 ring-background" />
              ) : null}
            </Link>
            <Link
              to="/profile"
              className="hidden items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent md:flex"
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
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end">
          {nav.slice(0, 2).map((item) => {
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
              </Link>
            );
          })}

          {role !== "admin" ? (
            <div className="-mt-6 flex justify-center">
              <ScanFabTrigger onClick={() => setScanOpen(true)} />
            </div>
          ) : (
            <span />
          )}

          {nav.slice(2).map((item) => {
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
              </Link>
            );
          })}

          <Link
            to={PROFILE_NAV.to}
            className={cn(
              "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              pathname === PROFILE_NAV.to ? "text-primary" : "text-muted-foreground",
            )}
          >
            <UserRound className="size-5" />
            {PROFILE_NAV.label}
          </Link>
        </div>
      </nav>

      {role !== "admin" ? <QrFab open={scanOpen} onOpenChange={setScanOpen} /> : null}
    </div>
  );
}
