import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { useTranslation, I18nextProvider } from "react-i18next";
import {
  Bell,
  Boxes,
  Check,
  ChevronDown,
  ClipboardList,
  Flame,
  Languages,
  LayoutGrid,
  LogOut,
  ScanLine,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { appLocale, setAppLocale } from "@/lib/i18n";
import type { resources } from "@/lib/i18n/resources";
import i18n from "@/lib/i18n";
import { QrFab, ScanFabTrigger } from "@/components/QrFab";
import { Logo } from "@/components/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavKey = `nav.${keyof (typeof resources)["en"]["common"]["nav"]}` | "profile";

type NavItem = { to: string; labelKey: NavKey; icon: typeof Flame };

const CONSUMER_NAV: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.home", icon: LayoutGrid },
  { to: "/waitlist", labelKey: "nav.waitlist", icon: ClipboardList },
  { to: "/dealers", labelKey: "nav.depots", icon: Store },
];

const DEALER_NAV: NavItem[] = [
  { to: "/dealer", labelKey: "nav.home", icon: LayoutGrid },
  { to: "/dealer/waitlist", labelKey: "nav.waitlist", icon: ClipboardList },
  { to: "/dealer/stock", labelKey: "nav.stock", icon: Boxes },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutGrid },
  { to: "/notifications", labelKey: "nav.alerts", icon: Bell },
];

const PROFILE_NAV: NavItem = { to: "/profile", labelKey: "profile", icon: UserRound };

const ROLE_LABEL_KEY = {
  consumer: "roleConsumer",
  dealer: "roleDealer",
  admin: "roleAdmin",
  member: "roleMember",
} as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { role, profile, dealer, signOut, user, sessionToken } = useAuth();
  const { t } = useTranslation();
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
      ? (dealer?.business_name ?? t("depot"))
      : role === "admin"
        ? t("roleAdmin")
        : (profile?.full_name ?? t("roleConsumer"));

  const homeTo = role === "dealer" ? "/dealer" : "/dashboard";

  return (
    <I18nextProvider i18n={i18n}>
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
                  {t(item.labelKey)}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <Link
                to="/notifications"
                className="relative grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label={t("notifications")}
              >
                <Bell className="size-5" />
                {unread > 0 ? (
                  <span className="absolute right-0.5 top-0.5 size-2 rounded-full bg-primary ring-2 ring-background" />
                ) : null}
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    aria-label={t("language")}
                  >
                    <Languages className="size-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => setAppLocale("en")}>
                    <span className={cn(appLocale() === "en" && "font-semibold")}>English</span>
                    {appLocale() === "en" ? <Check className="ml-auto size-4" /> : null}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAppLocale("ne")}>
                    <span className={cn(appLocale() === "ne" && "font-semibold")}>नेपाली</span>
                    {appLocale() === "ne" ? <Check className="ml-auto size-4" /> : null}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="hidden items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent md:flex"
                  >
                    <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary font-semibold">
                      {role === "admin" ? (
                        <ShieldCheck className="size-4 text-primary" />
                      ) : (
                        <UserRound className="size-4" />
                      )}
                    </span>
                    <span className="hidden text-right sm:block">
                      <span className="block max-w-40 truncate text-sm font-semibold leading-tight">
                        {title}
                      </span>
                      <span className="block text-xs capitalize text-muted-foreground">
                        {t(ROLE_LABEL_KEY[role ?? "member"])}
                      </span>
                    </span>
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <UserRound className="size-4" /> {t("profile")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => void handleSignOut()}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="size-4" /> {t("signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:py-10">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden">
          <div className="border-t border-border/70 bg-background/95 pb-[max(0.4rem,env(safe-area-inset-bottom))] backdrop-blur">
            <div
              className={cn(
                "mx-auto grid max-w-lg items-end",
                role === "admin" ? "grid-cols-3" : "grid-cols-5",
              )}
            >
              {nav.slice(0, 2).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  active={pathname === item.to}
                  icon={item.icon}
                  label={t(item.labelKey)}
                />
              ))}

              {role !== "admin" ? (
                <>
                  <div className="flex flex-col items-center gap-1 pb-2">
                    <div className="rounded-full ring-4 ring-background">
                      <ScanFabTrigger onClick={() => setScanOpen(true)} />
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {t("scan")}
                    </span>
                  </div>

                  {nav.slice(2).map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      active={pathname === item.to}
                      icon={item.icon}
                      label={t(item.labelKey)}
                    />
                  ))}
                </>
              ) : null}

              <NavLink
                to={PROFILE_NAV.to}
                active={pathname === PROFILE_NAV.to}
                icon={UserRound}
                label={t(PROFILE_NAV.labelKey)}
              />
            </div>
          </div>
        </nav>

        {role !== "admin" ? <QrFab open={scanOpen} onOpenChange={setScanOpen} /> : null}
      </div>
    </I18nextProvider>
  );
}

function NavLink({
  to,
  active,
  icon: Icon,
  label,
}: {
  to: string;
  active: boolean;
  icon: typeof Flame;
  label: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "relative flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "grid size-9 place-items-center rounded-2xl transition-colors duration-200",
          active ? "bg-primary/10 text-primary" : "text-muted-foreground",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="leading-none">{label}</span>
    </Link>
  );
}
