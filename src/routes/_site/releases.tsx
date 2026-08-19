import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ChevronDown,
  GitBranch,
  Rocket,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { appLocale } from "@/lib/i18n";
import { releases, type ChangeKind, type Release, type ReleaseChange } from "@/lib/releases";
import pkg from "../../../package.json";

export const Route = createFileRoute("/_site/releases")({
  head: () => ({
    meta: [
      { title: "YoGas Release Notes" },
      {
        name: "description",
        content: "Track every YoGas update — features, fixes, improvements, and security.",
      },
    ],
  }),
  component: ReleasesPage,
});

const kindConfig: Record<ChangeKind, { icon: LucideIcon; className: string; labelKey: string }> = {
  feature: {
    icon: Sparkles,
    className: "text-primary bg-primary/10 border-primary/20",
    labelKey: "releases:feature",
  },
  fix: {
    icon: Wrench,
    className: "text-warning bg-warning/10 border-warning/20",
    labelKey: "releases:fix",
  },
  improvement: {
    icon: Zap,
    className: "text-info bg-info/10 border-info/20",
    labelKey: "releases:improvement",
  },
  security: {
    icon: ShieldCheck,
    className: "text-success bg-success/10 border-success/20",
    labelKey: "releases:security",
  },
};

function ChangeList({ changes }: { changes: ReleaseChange[] }) {
  const { t } = useTranslation();
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {changes.map((change, i) => {
        const cfg = kindConfig[change.kind];
        const Icon = cfg.icon;
        return (
          <li
            key={i}
            className="flex items-start gap-2.5 rounded-xl border bg-secondary/40 px-3 py-2.5"
          >
            <span
              className={`grid size-5 shrink-0 place-items-center rounded-md border ${cfg.className}`}
            >
              <Icon className="size-3" />
            </span>
            <span className="text-sm leading-snug text-foreground/90">{change.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function VersionChip({ version }: { version: string }) {
  const [major] = version.split(".").map(Number);
  const isMajor = typeof major === "number" && major >= 1;
  return isMajor ? (
    <span className="rounded-lg bg-flame px-2.5 py-1 font-mono text-xs font-bold text-primary-foreground shadow-soft">
      v{version}
    </span>
  ) : (
    <span className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 font-mono text-xs font-bold text-primary">
      v{version}
    </span>
  );
}

function ReleaseCard({ release, date }: { release: Release; date: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-200 group-hover:border-primary/25 group-hover:shadow-lift sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <VersionChip version={release.version} />
          <span className="text-sm font-bold text-foreground">{release.name}</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {t("releases:released")} {date}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{release.summary}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:border-primary/30 hover:text-primary"
      >
        <ChevronDown
          className={`size-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
        {open ? t("releases:collapse") : t("releases:expand")}
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${open ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <ChangeList changes={release.changes} />
        </div>
      </div>
    </article>
  );
}

function ReleasesPage() {
  const { t } = useTranslation();
  const lang = appLocale();
  const latest = releases[0]!;
  const older = releases.slice(1);
  const currentVersion = pkg.version;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "ne" ? "ne-NP" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute top-0 left-1/2 -z-10 size-[520px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 -z-10 size-72 rounded-full bg-primary-glow/5 blur-[100px]" />

      <div className="mx-auto max-w-4xl px-4 py-10 md:py-16">
        {/* Header */}
        <div className="text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
            <Rocket className="size-3.5" /> {t("releases:latest")}
          </span>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">
            {t("releases:title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            {t("releases:subtitle")}
          </p>
        </div>

        {/* Latest release hero card */}
        <section className="relative mt-14 overflow-hidden rounded-3xl border border-primary/25 bg-card p-8 shadow-lift md:p-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary-glow to-primary" />
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg bg-flame px-3 py-1 font-mono text-sm font-bold text-primary-foreground shadow-soft">
                v{latest.version}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                {t("releases:current")}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                {latest.name} · {formatDate(latest.date)}
              </span>
            </div>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
              {latest.summary}
            </p>
            <ChangeList changes={latest.changes} />
          </div>
        </section>

        {/* History timeline */}
        <section className="mt-16">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-2xl font-bold text-foreground">
              {t("releases:seeChangelog")}
            </h2>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 font-mono text-[11px] font-bold text-muted-foreground">
              v{currentVersion}
            </span>
          </div>
          <ol className="relative mt-8 space-y-6 sm:space-y-8">
            <span
              aria-hidden
              className="absolute bottom-3 top-2 left-[7px] w-0.5 -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/50 via-border to-border/0"
            />
            {older.map((release) => (
              <li key={release.version} className="group relative pl-10 sm:pl-12">
                <span className="absolute left-[7px] top-6 grid size-4 -translate-x-1/2 place-items-center rounded-full border-2 border-primary bg-background shadow-soft transition-all duration-200 group-hover:scale-125 group-hover:border-primary-glow">
                  <span className="size-1.5 rounded-full bg-primary transition-transform duration-200 group-hover:scale-150" />
                </span>
                <ReleaseCard release={release} date={formatDate(release.date)} />
              </li>
            ))}
          </ol>
        </section>

        {/* Footer CTA */}
        <section className="mt-16 space-y-5 text-center">
          <p className="text-sm text-muted-foreground">
            {lang === "ne"
              ? "हरेक कमिटको पूरा इतिहास GitHub मा खुला रूपमा उपलब्ध छ।"
              : "Want the full commit history? It's all open on GitHub."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline" className="rounded-full bg-card px-5">
              <Link to="/">
                <ArrowLeft className="mr-1.5 size-4" /> {t("releases:backHome")}
              </Link>
            </Button>
            <Button asChild className="rounded-full px-5">
              <a
                href="https://github.com/shubhamnpk/yogas/releases"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitBranch className="mr-1.5 size-4" /> {t("releases:viewOnGitHub")}
              </a>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
