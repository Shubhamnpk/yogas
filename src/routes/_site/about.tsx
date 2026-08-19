import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { about } from "@/lib/i18n/ns/about";
import { appLocale } from "@/lib/i18n";

export const Route = createFileRoute("/_site/about")({
  head: () => ({
    meta: [
      { title: "About YoGas - Our Mission" },
      { name: "description", content: "Learn about YoGas and our mission to make LPG distribution fair for every Nepali household." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { t } = useTranslation();
  const lang = appLocale();
  const values = lang === "ne" ? about.ne.values.items : about.en.values.items;



  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-16 space-y-20">
      {/* Hero Section */}
      <div className="relative text-center py-6">
        <div className="absolute inset-0 -z-10 flex items-center justify-center blur-3xl opacity-20">
          <div className="aspect-square w-96 rounded-full bg-gradient-to-tr from-primary to-primary-glow" />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <ShieldCheck className="size-3.5" /> {lang === "ne" ? "डिजिटल नागरिक पहल" : "Civic Tech Initiative"}
        </span>
        <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight md:text-6xl text-foreground">
          {t("about:title")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
          {t("about:subtitle")}
        </p>
      </div>

      {/* Story & Context Section */}
      <section className="grid gap-12 md:grid-cols-12 items-center">
        <div className="md:col-span-7 space-y-6">
          <div className="inline-block rounded-lg bg-accent/60 px-3 py-1 text-xs font-semibold text-accent-foreground">
            {lang === "ne" ? "हाम्रो पृष्ठभूमि" : "The Context"}
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight">{t("about:story.title")}</h2>
          <p className="text-base text-muted-foreground leading-relaxed">{t("about:story.body1")}</p>
          <p className="text-base text-muted-foreground leading-relaxed">{t("about:story.body2")}</p>
          <p className="text-base text-muted-foreground leading-relaxed">{t("about:story.body3")}</p>
        </div>
        <div className="md:col-span-5 flex flex-col items-center justify-center p-8 rounded-3xl border border-border bg-card shadow-lift relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full" />
          <div className="grid size-20 place-items-center rounded-2xl bg-primary/15 text-primary">
            <ShieldCheck className="size-10" />
          </div>
          <div className="mt-6 text-center space-y-1">
            <p className="font-display text-4xl font-extrabold text-primary">{lang === "ne" ? "१०,०००+" : "10,000+"}</p>
            <p className="text-sm font-semibold text-foreground">{lang === "ne" ? "समवर्ती उपयोगकर्ता" : "Concurrent Users Supported"}</p>
            <p className="text-xs text-muted-foreground">{lang === "ne" ? "कन्भेक्स सर्भरलेस ब्याकएन्डमा" : "On Convex Serverless Backend"}</p>
          </div>
          <div className="mt-6 pt-6 border-t border-border w-full grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="font-display text-lg font-bold text-foreground">{"99.9%"}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">{lang === "ne" ? "अपटाइम" : "Uptime SLA"}</p>
            </div>
            <div>
              <p className="font-display text-lg font-bold text-foreground">{"<100ms"}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">{lang === "ne" ? "प्रतिक्रिया समय" : "Response Time"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Capabilities Section */}
      <section className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            {lang === "ne" ? "प्राविधिक क्षमता" : "Technical Capabilities"}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {lang === "ne" ? "हाम्रो प्लेटफर्ममा जुनसुकै ठाउँबाट पहुँच गर्न सकिन्छ" : "Built for scale, accessible from anywhere"}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-3 mb-3">
              <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm">{lang === "ne" ? "तत्काल सिंक" : "Real-time Sync"}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {lang === "ne" ? "कन्भेक्सको रियल-टाइम डाटाबेसले क्यामेरा अनलाइन र ब्याकएन्ड स्वचालित रूपमा सिंक हुन्छ।" : "Convex's real-time database automatically syncs the frontend and backend. Queue updates appear instantly."}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-3 mb-3">
              <div className="grid size-8 place-items-center rounded-lg bg-success/10 text-success">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm">{lang === "ne" ? "सुरक्षा" : "Security"}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {lang === "ne" ? "एन्क्रिप्टेड सत्र, दर-सीमित लगिन, र अडिट लगिङले आपरेसनल सुरक्षा प्रदान गर्दछ।" : "Encrypted sessions, rate-limited login attempts, and audit logging provide defense-in-depth security."}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-3 mb-3">
              <div className="grid size-8 place-items-center rounded-lg bg-info/10 text-info">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm">{lang === "ne" ? "ग्लोबल एक्सेस" : "Global Access"}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {lang === "ne" ? "स्वचालित विश्वव्यापी वितरणले नेपालभरका उपयोगकर्ताहरूलाई कुनै पनि डिभाइसबाट पहुँच दिन्छ।" : "Automatic worldwide distribution lets users across Nepal access from any device, anywhere."}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-secondary/40 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {lang === "ne"
              ? "हाम्रो प्लेटफर्मले एकैसाथ हजारौं उपयोगकर्तालाई सहयोग गर्न सक्छ। स्वचालित स्केलिङको कारण डाटा भण्डारणमा कुनै सीमा छैन।"
              : "Our platform can handle thousands of concurrent users. Thanks to auto-scaling architecture, there are no hard limits on data storage."}
          </p>
        </div>
      </section>
      <section className="relative rounded-3xl overflow-hidden bg-primary text-primary-foreground p-8 md:p-12 shadow-soft">
        <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-white/5 rounded-full blur-xl" />
        <div className="relative max-w-3xl space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-primary-foreground/80">{lang === "ne" ? "हाम्रो प्रतिबद्धता" : "OUR MISSION"}</span>
          <h2 className="font-display text-2xl md:text-4xl font-bold leading-tight">{t("about:mission.title")}</h2>
          <p className="text-base md:text-lg text-primary-foreground/90 leading-relaxed">
            {t("about:mission.body")}
          </p>
        </div>
      </section>

      {/* Values Section */}
      <section className="space-y-10">
        <div className="text-center space-y-3">
          <h2 className="font-display text-3xl font-bold tracking-tight">{t("about:values.title")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {lang === "ne" ? "निष्पक्ष वितरण र सुशासनका लागि हाम्रा मूल स्तम्भहरू" : "The pillars guiding how we build software for public transparency."}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {values.map((v, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card p-6 shadow-soft hover:shadow-lift transition-all duration-200 group"
            >
              <div className="flex gap-4 items-start">
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground font-display font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust & Security Section */}
      <section className="bg-secondary/40 rounded-3xl p-6 md:p-10 border border-border grid gap-6 md:grid-cols-2 items-center">
        <div>
          <h3 className="font-display text-xl font-bold text-foreground">
            {lang === "ne" ? "सुरक्षा र पारदर्शिता" : "Security & Transparency"}
          </h3>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {lang === "ne"
              ? "हाम्रो प्लेटफर्मले दर-सीमित लगिन, एन्क्रिप्टेड सत्र, र पूर्ण अडिट लगिङ प्रदान गर्दछ। प्रत्येक लेनदेन ट्र्याक गरिन्छ, र सिलिन्डर स्वचालित रूपमा आवश्यक गरिन्छ।"
              : "Our platform provides rate-limited login attempts, encrypted sessions, and full audit logging. Every transaction is tracked, and cylinders are automatically required."}
          </p>
        </div>
        <div className="flex gap-4 justify-around text-center border-t border-border md:border-t-0 md:border-l border-border/80 pt-6 md:pt-0 md:pl-6">
          <div className="space-y-1">
            <div className="text-xs font-bold text-muted-foreground uppercase">
              {lang === "ne" ? "सत्र" : "Sessions"}
            </div>
            <div className="text-sm font-semibold text-foreground">Token-based</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-bold text-muted-foreground uppercase">
              {lang === "ne" ? "अडिट" : "Audit Trail"}
            </div>
            <div className="text-sm font-semibold text-foreground">Full Log</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-bold text-muted-foreground uppercase">
              {lang === "ne" ? "दर सीमा" : "Rate Limiting"}
            </div>
            <div className="text-sm font-semibold text-foreground">5 attempts</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="rounded-3xl border border-border bg-card py-12 text-center shadow-soft">
        <div className="max-w-xl mx-auto px-4 space-y-4">
          <h2 className="font-display text-2xl font-bold">{t("about:contact")}</h2>
          <p className="text-muted-foreground text-sm">{lang === "ne" ? "हाम्रो टिम २४/७ सहयोग र गुनासो व्यवस्थापनका लागि तत्पर छ।" : "Our team is happy to answer questions from civic groups, depots, and users."}</p>
          <Button asChild size="lg" className="mt-2">
            <Link to="/contact">{t("about:contactBtn")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}