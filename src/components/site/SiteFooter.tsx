import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, ArrowUp, Flag, Github, Mail, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import pkg from "../../../package.json";

type FooterLink = { to: string; key: string };

const productLinks: FooterLink[] = [
  { to: "/how-it-works", key: "site:nav.howItWorks" },
  { to: "/faq", key: "site:nav.faq" },
  { to: "/contact", key: "site:nav.contact" },
];

const companyLinks: FooterLink[] = [{ to: "/about", key: "site:nav.about" }];

const legalLinks: FooterLink[] = [
  { to: "/privacy", key: "site:privacy" },
  { to: "/terms", key: "site:terms" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/60">
      {children}
    </p>
  );
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <SectionTitle>{title}</SectionTitle>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-all duration-200 hover:translate-x-0.5 hover:text-foreground"
            >
              <ArrowRight className="size-3 -translate-x-1 text-primary opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
              {t(link.key)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const version = pkg.version;

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="relative overflow-hidden border-t border-border/60 bg-secondary/20">
      {/* Flame hairline accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -top-32 left-1/4 -z-10 size-80 rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-24 right-1/4 -z-10 size-64 rounded-full bg-primary-glow/10 blur-[100px]" />

      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-12 py-14 md:grid-cols-12 md:py-20">
          {/* Brand */}
          <div className="space-y-5 md:col-span-5">
            <Link to="/" className="inline-flex items-center gap-2">
              <Logo />
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t("site:footerDesc")}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <a
                href="https://github.com/shubhamnpk/yogas"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="grid size-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
              >
                <Github className="size-4" />
              </a>
              <a
                href="mailto:support@yogas.app"
                className="group inline-flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="grid size-9 place-items-center rounded-xl border border-border bg-card text-primary shadow-soft transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/40">
                  <Mail className="size-4" />
                </span>
                support@yogas.app
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="grid gap-10 sm:grid-cols-3 md:col-span-7">
            <FooterColumn title={t("site:footerProduct")} links={productLinks} />
            <FooterColumn title={t("site:footerCompany")} links={companyLinks} />
            <FooterColumn title={t("site:footerLegal")} links={legalLinks} />
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center justify-between gap-4 border-t border-border/60 py-6 text-xs text-muted-foreground sm:flex-row">
          <span className="flex items-center gap-1.5">
            <Flag className="size-3.5 text-primary" /> {t("site:footerMadeInNepal")}
          </span>
          <span className="text-center">
            © {year} YoGas Inc. {t("site:rights")}
          </span>
          <div className="flex items-center gap-3">
            <Link
              to="/releases"
              title={t("site:releases")}
              className="group inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 py-1 font-mono text-[10px] font-semibold text-muted-foreground shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
            >
              <Sparkles className="size-3 transition-transform duration-200 group-hover:scale-125 group-hover:text-primary" />
              v{version}
            </Link>
            <button
              onClick={scrollTop}
              aria-label={t("site:backToTop")}
              title={t("site:backToTop")}
              className="grid size-8 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
            >
              <ArrowUp className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
