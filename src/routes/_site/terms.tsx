import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Shield, Users, Award, AlertTriangle, User, Timer, Ban } from "lucide-react";
import { terms } from "@/lib/i18n/ns/terms";
import { appLocale } from "@/lib/i18n";

export const Route = createFileRoute("/_site/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service - YoGas" },
      { name: "description", content: "Terms and conditions for using YoGas, the virtual LPG queue platform in Nepal." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { t } = useTranslation();
  const lang = appLocale();
  const content = lang === "ne" ? terms.ne : terms.en;
  const date = new Date().toLocaleDateString(lang === "ne" ? "ne-NP" : "en-NP");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:py-16 space-y-12">
      {/* Title */}
      <div className="text-center space-y-3">
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          {t("terms:title")}
        </h1>
        <div className="flex justify-center items-center gap-4 text-xs text-muted-foreground">
          <p>{t("terms:lastUpdated", { date })}</p>
          <span>•</span>
          <p>{lang === "ne" ? "पढ्ने समय: ६ मिनेट" : "6 min read"}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Anti-hoarding quick rules */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              {lang === "ne" ? "मुख्य नियमहरू" : "Key Waitlist Rules"}
            </h3>
            <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <div className="p-3 bg-secondary/50 rounded-xl border border-border/60">
                <p className="font-semibold text-foreground mb-1"><User className="size-3.5 text-primary mr-1 inline-block" />{lang === "ne" ? "एक नागरिकता, एक लाइन" : "1 Citizen = 1 Spot"}</p>
                <p>{lang === "ne" ? "दोहोरो खाता खोल्ने वा झुटा नागरिकता पेश गर्ने खाताहरू निलम्बित गरिनेछ।" : "Multi-account creation or using false citizenship details results in permanent bans."}</p>
              </div>
              <div className="p-3 bg-secondary/50 rounded-xl border border-border/60">
                <p className="font-semibold text-foreground mb-1"><Timer className="size-3.5 text-primary mr-1 inline-block" />{lang === "ne" ? "कूलडाउन नियम" : "Fair Cooldowns"}</p>
                <p>{lang === "ne" ? "सिलिन्डर प्राप्त गरेपछि अर्को बुकिङ गर्न निश्चित दिन प्रतीक्षा गर्नुपर्छ।" : "Cylinder collections trigger a cooling-off period configured by the depot to halt hoarding."}</p>
              </div>
              <div className="p-3 bg-secondary/50 rounded-xl border border-border/60">
                <p className="font-semibold text-foreground mb-1"><Ban className="size-3.5 text-primary mr-1 inline-block" />{lang === "ne" ? "कालोबजारी निषेध" : "Anti-Black Market"}</p>
                <p>{lang === "ne" ? "क्यु टिकटकको व्यापार वा पुन: बिक्री गैरकानुनी मानिनेछ।" : "Queue positions or scannable tokens cannot be sold, transferred, or traded."}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Terms Text */}
        <article className="lg:col-span-8 bg-card border border-border rounded-3xl p-6 md:p-10 shadow-soft prose prose-slate max-w-none dark:prose-invert">
          <p className="lead text-base text-muted-foreground leading-relaxed mb-6">{content.intro}</p>

          <div className="space-y-6 divide-y divide-border/40">
            <div className="pt-2">
              <h2 className="text-lg font-bold text-foreground mb-2" id="use">{content.sections[0].title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{content.sections[0].body}</p>
            </div>

            <div className="pt-6">
              <h2 className="text-lg font-bold text-foreground mb-2" id="eligibility">{content.sections[1].title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{content.sections[1].body}</p>
            </div>

            <div className="pt-6">
              <h2 className="text-lg font-bold text-foreground mb-2" id="anti-hoarding">{content.sections[2].title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{content.sections[2].body}</p>
            </div>

            <div className="pt-6">
              <h2 className="text-lg font-bold text-foreground mb-2" id="dealer">{content.sections[3].title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{content.sections[3].body}</p>
            </div>

            <div className="pt-6">
              <h2 className="text-lg font-bold text-foreground mb-2" id="accuracy">{content.sections[4].title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{content.sections[4].body}</p>
            </div>

            <div className="pt-6">
              <h2 className="text-lg font-bold text-foreground mb-2" id="warranty">{content.sections[5].title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{content.sections[5].body}</p>
            </div>

            <div className="pt-6">
              <h2 className="text-lg font-bold text-foreground mb-2" id="liability">{content.sections[6].title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{content.sections[6].body}</p>
            </div>

            <div className="pt-6">
              <h2 className="text-lg font-bold text-foreground mb-2" id="changes">{content.sections[7].title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{content.sections[7].body}</p>
            </div>
          </div>
        </article>
      </div>

      <div className="text-center py-6 border-t border-border">
        <p className="text-sm text-muted-foreground">{content.contactCta}</p>
      </div>
    </div>
  );
}