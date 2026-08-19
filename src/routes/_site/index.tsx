import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  Bell,
  QrCode,
  ShieldCheck,
  Store,
  Users,
  Search,
  Building,
  MapPin,
  Sprout,
  Star,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { stockLabel } from "@/lib/gas";
import { formatNumber, appLocale } from "@/lib/i18n";
import { faq } from "@/lib/i18n/ns/faq";

export const Route = createFileRoute("/_site/")({
  head: () => ({
    meta: [
      { title: "YoGas - Fair LPG cylinder queues for Nepal" },
      {
        name: "description",
        content:
          "Join a verified LPG depot's virtual waitlist with your citizenship details, track your queue position live, and collect your cylinder with a QR code.",
      },
      { property: "og:title", content: "YoGas - Fair LPG cylinder queues for Nepal" },
      {
        property: "og:description",
        content: "A transparent virtual queue between LPG dealers and consumers.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useTranslation();
  const lang = appLocale();
  const dealers = useQuery(api.waitlist.listDealers, { limit: 50 });

  const [depotSearch, setDepotSearch] = useState("");
  const [districtFilter, setDistrictFilter] = useState("all");

  const faqIndexes = [0, 1, 2, 3];

  const filteredDealers = useMemo(() => {
    if (!dealers) return [];
    return dealers.filter((d) => {
      const matchesSearch =
        d.businessName.toLowerCase().includes(depotSearch.toLowerCase()) ||
        d.district.toLowerCase().includes(depotSearch.toLowerCase());
      const matchesDistrict =
        districtFilter === "all" ||
        d.district.toLowerCase() === districtFilter.toLowerCase();
      return matchesSearch && matchesDistrict;
    });
  }, [dealers, depotSearch, districtFilter]);

  const activeDistricts = useMemo(() => {
    if (!dealers) return [];
    const set = new Set<string>();
    dealers.forEach((d) => { if (d.district) set.add(d.district); });
    return Array.from(set);
  }, [dealers]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-0 left-1/4 -z-10 size-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 -z-10 size-[400px] rounded-full bg-primary-glow/5 blur-[100px] pointer-events-none" />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:pt-20">
        <div className="grid items-center gap-12 md:grid-cols-12">
          <div className="md:col-span-7 space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/20">
              <ShieldCheck className="size-3.5" /> {t("landing:badgeTagline")}
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.08] md:text-6xl text-foreground">
              {t("landing:heroTitle")}{" "}
              <span className="text-flame tracking-tight block mt-1">{t("landing:heroTitleAccent")}</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              {t("landing:heroBody")}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" className="rounded-full px-6 shadow-lift">
                <Link to="/auth">{t("landing:joinWaitlist")} <ArrowRight className="ml-1.5 size-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-6 bg-card">
                <Link to="/auth">{t("landing:registerDepot")}</Link>
              </Button>
            </div>
          </div>

          <div className="md:col-span-5 rounded-3xl border border-border bg-card p-6 shadow-lift relative overflow-hidden">
            <div className="absolute top-0 right-0 size-24 bg-primary/5 rounded-bl-full -z-10" />
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div>
                <h3 className="font-bold text-foreground">{t("landing:liveDepotStock")}</h3>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">
                  {lang === "ne" ? "लाइभ स्थिति" : "Real-Time Stock Updates"}
                </p>
              </div>
              <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {lang === "ne" ? "सक्रिय" : "LIVE"}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 mb-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                <Input
                  placeholder={lang === "ne" ? "डिपो खोज्नुहोस्..." : "Search name..."}
                  className="pl-8 h-8 text-xs rounded-lg"
                  value={depotSearch}
                  onChange={(e) => setDepotSearch(e.target.value)}
                />
              </div>
              <select
                className="h-8 text-xs rounded-lg border border-input bg-transparent px-2 shadow-sm focus:outline-none"
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
              >
                <option value="all">{lang === "ne" ? "सबै जिल्ला" : "All Districts"}</option>
                {activeDistricts.map((dist) => (
                  <option key={dist} value={dist.toLowerCase()}>{dist}</option>
                ))}
              </select>
            </div>

            <ul className="space-y-2.5 max-h-64 overflow-y-auto hide-scrollbars">
              {dealers === undefined ? (
                <li className="text-center py-6 text-sm text-muted-foreground">{t("landing:loadingDepots")}</li>
              ) : filteredDealers.length === 0 ? (
                <li className="text-center py-6 text-xs text-muted-foreground">
                  {lang === "ne" ? "कुनै डिपो फेला परेन।" : "No matching depots active."}
                </li>
              ) : (
                filteredDealers.slice(0, 5).map((d) => {
                  const s = stockLabel(d.stock);
                  return (
                    <li key={d._id} className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3 border border-border/40 hover:border-primary/20 transition-all duration-150">
                      <div>
                        <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Building className="size-3 text-primary shrink-0" />
                          {d.businessName}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="size-2.5 shrink-0" />
                          {d.district}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-sm font-extrabold text-foreground">{formatNumber(d.stock)}</p>
                        <p className={`text-[10px] font-bold ${s.tone === "success" ? "text-success" : s.tone === "warning" ? "text-warning" : "text-destructive"}`}>
                          {t(s.key)}
                        </p>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
            {dealers && filteredDealers.length > 5 ? (
              <div className="text-center pt-3 border-t border-border/50 mt-3">
                <Link to="/auth" className="text-xs font-semibold text-primary hover:underline flex items-center justify-center gap-1">
                  +{filteredDealers.length - 5} {lang === "ne" ? "थप डिपोहरू" : "more active depots"} <ArrowRight className="size-3" />
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* OSS Mission Strip */}
      <section className="bg-secondary/30 border-y border-border/60 py-10">
        <div className="mx-auto max-w-6xl px-4 grid gap-6 grid-cols-2 md:grid-cols-4 text-center">
          <div className="space-y-1">
            <p className="font-display text-3xl font-extrabold text-primary">OSS</p>
            <p className="text-xs font-semibold text-foreground">{lang === "ne" ? "खुला स्रोत" : "Open Source"}</p>
            <p className="text-[10px] text-muted-foreground">{lang === "ne" ? "सबैका लागि निःशुल्क" : "Free & transparent for all"}</p>
          </div>
          <div className="space-y-1 border-l border-border/60">
            <p className="font-display text-3xl font-extrabold text-primary">2025</p>
            <p className="text-xs font-semibold text-foreground">{lang === "ne" ? "शुरुवात भयो" : "Started"}</p>
            <p className="text-[10px] text-muted-foreground">{lang === "ne" ? "यही वर्ष पाइलट" : "Pilot launched this year"}</p>
          </div>
          <div className="space-y-1 border-l border-border/60">
            <p className="font-display text-3xl font-extrabold text-primary">NP</p>
            <p className="text-xs font-semibold text-foreground">{lang === "ne" ? "नेपालका लागि" : "Built for Nepal"}</p>
            <p className="text-[10px] text-muted-foreground">{lang === "ne" ? "नेपाली परिवारका लागि" : "By the community, for the people"}</p>
          </div>
          <div className="space-y-1 border-l border-border/60">
            <p className="font-display text-3xl font-extrabold text-primary">0%</p>
            <p className="text-xs font-semibold text-foreground">{lang === "ne" ? "व्यापारिक उद्देश्य" : "Commercial Motive"}</p>
            <p className="text-[10px] text-muted-foreground">{lang === "ne" ? "नाफाका लागि होइन" : "Non-profit civic tech"}</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-secondary/20 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight md:text-4xl text-foreground">
            {t("landing:howItWorksSection")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground text-sm md:text-base leading-relaxed">
            {t("landing:howItWorksSectionBody")}
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: Users, titleKey: "landing:stepJoin", bodyKey: "landing:stepJoinBody", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
              { icon: Bell, titleKey: "landing:stepTrack", bodyKey: "landing:stepTrackBody", color: "bg-primary/10 text-primary border-primary/20" },
              { icon: QrCode, titleKey: "landing:stepCollect", bodyKey: "landing:stepCollectBody", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
            ].map((f, index) => (
              <div key={f.titleKey} className="rounded-2xl border border-border bg-card p-6 shadow-soft relative overflow-hidden group hover:border-primary/30 transition-all duration-200">
                <div className="absolute top-0 left-0 w-full h-1 bg-muted group-hover:bg-primary transition-colors" />
                <span className={`inline-flex size-10 items-center justify-center rounded-xl font-bold text-sm ${f.color} border mb-4`}>
                  {index + 1}
                </span>
                <h3 className="text-lg font-bold text-foreground">{t(f.titleKey)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(f.bodyKey)}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button asChild variant="outline" size="sm" className="rounded-full px-5 bg-card">
              <Link to="/how-it-works">
                {lang === "ne" ? "विस्तृत विवरण हेर्नुहोस्" : "Learn More About Workflow"}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* For Consumers / For Dealers */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-soft relative overflow-hidden group hover:shadow-lift transition-all duration-200">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />
            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Users className="size-5 text-primary" /> {t("landing:forConsumers")}
            </h2>
            <ol className="mt-6 space-y-4 text-sm text-muted-foreground">
              {(["landing:consumerStep1","landing:consumerStep2","landing:consumerStep3","landing:consumerStep4"] as const).map((key, i) => (
                <li key={key} className="flex gap-3">
                  <span className="font-bold text-primary bg-primary/10 rounded-full size-5 flex items-center justify-center shrink-0 text-xs">{i+1}</span>
                  <span>{t(key)}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-3xl border border-border bg-card p-8 shadow-soft relative overflow-hidden group hover:shadow-lift transition-all duration-200">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-primary-glow" />
            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Store className="size-5 text-primary-glow" /> {t("landing:forDealers")}
            </h2>
            <ol className="mt-6 space-y-4 text-sm text-muted-foreground">
              {(["landing:dealerStep1","landing:dealerStep2","landing:dealerStep3","landing:dealerStep4"] as const).map((key, i) => (
                <li key={key} className="flex gap-3">
                  <span className="font-bold text-primary-glow bg-primary-glow/10 rounded-full size-5 flex items-center justify-center shrink-0 text-xs">{i+1}</span>
                  <span>{t(key)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Anti-Hoarding Pillars */}
      <section className="bg-secondary/40 border-y border-border py-16">
        <div className="mx-auto max-w-4xl px-4 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
              {lang === "ne" ? "पक्षपात र कालोबजारी नियन्त्रण" : "Anti-Hoarding & Fair Lines Pillars"}
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {lang === "ne" ? "डबल बुकिङ रोक्ने र नागरिकता प्रमाणीकरण गर्ने नियमहरू" : "Built-in checks to ensure gas reaches genuine families."}
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="bg-card rounded-2xl border border-border p-6 shadow-soft space-y-3">
              <div className="size-8 rounded-full bg-primary/15 text-primary grid place-items-center"><Users className="size-4" /></div>
              <h3 className="font-bold text-foreground text-sm">{lang === "ne" ? "१ नागरिक = १ लाम स्थान" : "1 Citizen = 1 Spot"}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {lang === "ne" ? "प्रणालीमा दोहोरो वा नक्कली परिचय दर्ता गर्न मिल्दैन। यसले बिचौलियालाई नियन्त्रण गर्छ।" : "Every consumer signs up with a verified citizenship number, keeping hoarding lines clean."}
              </p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-6 shadow-soft space-y-3">
              <div className="size-8 rounded-full bg-primary/15 text-primary grid place-items-center"><QrCode className="size-4" /></div>
              <h3 className="font-bold text-foreground text-sm">{lang === "ne" ? "स्वचालित रूपमा रद्द" : "Auto-Cancellation"}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {lang === "ne" ? "कुनै एक डिपोमा सिलिन्डर बुझिलिएमा अन्य डिपोका बाँकी अनुरोध स्वतः रद्द हुन्छन्।" : "Once you collect a cylinder, your active requests at other depots are automatically cancelled."}
              </p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-6 shadow-soft space-y-3">
              <div className="size-8 rounded-full bg-primary/15 text-primary grid place-items-center"><ShieldCheck className="size-4" /></div>
              <h3 className="font-bold text-foreground text-sm">{lang === "ne" ? "सङ्कलन कूलडाउन" : "Allotment Cooldown"}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {lang === "ne" ? "ग्यास प्राप्त गरेपछि अर्को बुकिङ गर्न डिपोले तोकेको कूलडाउन समय कुर्नुपर्छ।" : "Depots enforce cooling-off days post-handover so each neighbor gets their cylinder next."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-8 md:p-12 text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/20">
            <Sprout className="size-3.5" /> {lang === "ne" ? "प्रारम्भिक चरणको परियोजना" : "Early-Stage Project"}
          </div>
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            {lang === "ne" ? "तपाईं पहिलो प्रयोगकर्ता हुन सक्नुहुन्छ!" : "You Could Be Our First Story"}
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
            {lang === "ne"
              ? "YoGas भर्खरै सुरु भएको एउटा स्वतन्त्र नागरिक टेक पहल हो। हामी यसलाई नेपालका ग्यास उपभोक्ताहरूको लागि उपयोगी बनाउन प्रतिबद्ध छौं।"
              : "YoGas is a fresh, independent civic tech project launched in 2025. No fake reviews, no inflated stats. If it helps you, we'd love to hear."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
            <a href="https://github.com/shubhamnpk/yogas/issues" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lift hover:opacity-90 transition-opacity">
              {lang === "ne" ? "GitHub मा प्रतिक्रिया दिनुहोस्" : "Share Feedback on GitHub"}
            </a>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-accent transition-colors">
              {lang === "ne" ? "सम्पर्क गर्नुहोस्" : "Contact Us Directly"}
            </Link>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {lang === "ne" ? "यो एउटा खुला स्रोत परियोजना हो। कुनै व्यावसायिक उद्देश्य छैन।" : "Open-source, non-commercial civic tech. No investors, no ads."}
          </p>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="border-t border-border bg-secondary/15 py-16">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-center font-display text-3xl font-bold text-foreground">
            {t("landing:faqTitle")}
          </h2>
          <p className="mt-3 text-center text-muted-foreground text-sm max-w-md mx-auto">
            {t("landing:faqDesc")}
          </p>
          <div className="mt-10 max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqIndexes.map((i) => (
                <AccordionItem value={String(i)} key={i} className="border border-border bg-card rounded-2xl px-5 py-1 shadow-soft">
                  <AccordionTrigger className="text-left text-base font-semibold hover:no-underline text-foreground">
                    {lang === "ne" ? faq.ne.items[i]?.q : faq.en.items[i]?.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-2 border-t border-border/40">
                    {lang === "ne" ? faq.ne.items[i]?.a : faq.en.items[i]?.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <div className="mt-8 text-center">
              <Button asChild variant="outline" size="sm" className="rounded-full bg-card px-5">
                <Link to="/faq">{t("landing:viewFullFaq")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-3xl bg-flame p-8 text-white md:p-16 shadow-lift text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-44 h-44 bg-white/5 rounded-full blur-2xl" />
          <h2 className="font-display text-3xl font-extrabold md:text-5xl max-w-xl mx-auto leading-tight">
            {t("landing:ctaTitle")}
          </h2>
          <p className="mx-auto max-w-lg text-sm text-white/90 leading-relaxed">
            {t("landing:ctaBody")}
          </p>
          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button asChild size="lg" variant="secondary" className="rounded-full shadow-soft font-semibold text-primary px-8">
              <Link to="/auth">
                {t("landing:getStarted")} <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
            <a href="https://github.com/shubhamnpk/yogas" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-white/80 font-medium hover:text-white transition-colors underline">
              <Star className="size-3.5 fill-current" /> {lang === "ne" ? "GitHub मा स्टार दिनुहोस्" : "Star us on GitHub"}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
