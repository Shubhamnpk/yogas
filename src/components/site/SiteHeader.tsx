import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { appLocale } from "@/lib/i18n";

type NavItem = { to: string; key: string; external?: boolean };

const navItems: NavItem[] = [
  { to: "/", key: "site:nav.home" },
  { to: "/how-it-works", key: "site:nav.howItWorks" },
  { to: "/about", key: "site:nav.about" },
  { to: "/faq", key: "site:nav.faq" },
  { to: "/contact", key: "site:nav.contact" },
];

function NavLinks({ mobile = false, close = () => {} }: { mobile?: boolean; close?: () => void }) {
  const { t } = useTranslation();
  return (
    <>
      {navItems.map((item) => (
        <li key={item.to} className="list-none">
          <Link
            to={item.to}
            onClick={close}
            className={cn(
              "text-sm font-medium text-muted-foreground transition-all px-3 py-1.5 rounded-full hover:text-foreground hover:bg-secondary/65 [&.active]:bg-primary/10 [&.active]:text-primary [&.active]:font-semibold",
              mobile && "block w-full text-base py-3 px-4 rounded-xl",
            )}
          >
            {t(item.key)}
          </Link>
        </li>
      ))}
    </>
  );
}

export function SiteHeader() {
  const { t } = useTranslation();
  const lang = appLocale();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-2" onClick={close}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-2 md:flex">
          <NavLinks />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <LanguageToggle />
          </div>
          <div className="hidden sm:flex">
            <Button asChild size="sm" className="rounded-full shadow-soft px-4">
              <Link to="/auth">{t("site:signIn")}</Link>
            </Button>
          </div>
          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" aria-label={t("site:menu")} className="rounded-full">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] rounded-l-3xl p-6">
                <div className="mt-8 flex flex-col gap-6">
                  <div className="flex items-center gap-2 border-b border-border pb-4">
                    <Logo />
                  </div>
                  
                  <nav className="flex flex-col gap-2">
                    <NavLinks mobile close={close} />
                  </nav>
                  
                  <div className="border-t border-border pt-6 flex flex-col gap-4">
                    <div className="flex justify-between items-center px-2">
                      <span className="text-xs text-muted-foreground font-semibold">{lang === "ne" ? "भाषा / Language" : "Select Language"}</span>
                      <LanguageToggle />
                    </div>
                    <Button asChild size="lg" variant="default" className="rounded-xl w-full" onClick={close}>
                      <Link to="/auth">{t("site:signIn")}</Link>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
