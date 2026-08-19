import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Shield, Database, Users, Globe, Calendar, Lock, Ban, Hourglass } from "lucide-react";
import { privacy } from "@/lib/i18n/ns/privacy";
import { appLocale } from "@/lib/i18n";

export const Route = createFileRoute("/_site/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy - YoGas" },
      { name: "description", content: "How we collect, use, and protect your information on YoGas." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { t } = useTranslation();
  const lang = appLocale();
  const content = lang === "ne" ? privacy.ne : privacy.en;
  const date = new Date().toLocaleDateString(lang === "ne" ? "ne-NP" : "en-NP");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:py-16 space-y-12">
      {/* Title */}
      <div className="text-center space-y-3">
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">{t("privacy:title")}</h1>
        <div className="flex justify-center items-center gap-4 text-xs text-muted-foreground">
          <p>{t("privacy:lastUpdated", { date })}</p>
          <span>•</span>
          <p>{lang === "ne" ? "पढ्ने समय: ४ मिनेट" : "4 min read"}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Compliance highlight panel */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              {lang === "ne" ? "मुख्य अंशहरू" : "Privacy Highlights"}
            </h3>
            <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <div className="p-3 bg-secondary/50 rounded-xl border border-border/60">
                <p className="font-semibold text-foreground mb-1"><Lock className="size-3.5 text-primary mr-1 inline-block" />{lang === "ne" ? "सुरक्षित इन्क्रिप्सन" : "Secure Encryption"}</p>
                <p>{lang === "ne" ? "तपाईंको नागरिकता नम्बर डेटाबेस स्तरमा इन्क्रिप्ट गरिएको छ।" : "Citizenship details are fully encrypted at rest and in transit."}</p>
              </div>
              <div className="p-3 bg-secondary/50 rounded-xl border border-border/60">
                <p className="font-semibold text-foreground mb-1"><Ban className="size-3.5 text-primary mr-1 inline-block" />{lang === "ne" ? "कुनै व्यावसायिक सेयरिङ छैन" : "No Third-Party Ads"}</p>
                <p>{lang === "ne" ? "हामी तपाईंको व्यक्तिगत डाटा कसैलाई बेच्दैनौं वा विज्ञापनका लागि साझा गर्दैनौं।" : "We never sell or share your contact data for marketing purposes."}</p>
              </div>
              <div className="p-3 bg-secondary/50 rounded-xl border border-border/60">
                <p className="font-semibold text-foreground mb-1"><Hourglass className="size-3.5 text-primary mr-1 inline-block" />{lang === "ne" ? "डेटा मेटाउने अधिकार" : "Right to Erase"}</p>
                <p>{lang === "ne" ? "खाता हटाउँदा तपाईंको सबै जैविक विवरणहरू स्थायी रूपमा मेटिन्छन्।" : "Your verification tokens are purged when you close your account."}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Text */}
        <article className="lg:col-span-8 bg-card border border-border rounded-3xl p-6 md:p-10 shadow-soft prose prose-slate max-w-none dark:prose-invert">
          <p className="lead text-base text-muted-foreground leading-relaxed mb-6">{content.intro}</p>

          <div className="space-y-6 divide-y divide-border/40">
            <div className="pt-2">
              <h2 className="text-lg font-bold text-foreground mb-2" id="info">{content.sections[0].title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{content.sections[0].body}</p>
            </div>

            <div className="pt-6">
              <h2 className="text-lg font-bold text-foreground mb-2" id="use">{content.sections[1].title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{content.sections[1].body}</p>
            </div>

            <div className="pt-6">
              <h2 className="text-lg font-bold text-foreground mb-2" id="citizenship">{content.sections[2].title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{content.sections[2].body}</p>
            </div>

            <div className="pt-6">
              <h2 className="text-lg font-bold text-foreground mb-2" id="retention">{content.sections[3].title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{content.sections[3].body}</p>
            </div>

            <div className="pt-6">
              <h2 className="text-lg font-bold text-foreground mb-2" id="rights">{content.sections[4].title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{content.sections[4].body}</p>
            </div>

            <div className="pt-6">
              <h2 className="text-lg font-bold text-foreground mb-2" id="third">{content.sections[5].title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{content.sections[5].body}</p>
            </div>

            <div className="pt-6">
              <h2 className="text-lg font-bold text-foreground mb-2" id="changes">{content.sections[6].title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{content.sections[6].body}</p>
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