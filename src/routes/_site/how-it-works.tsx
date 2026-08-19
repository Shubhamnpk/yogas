import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Users, Store, QrCode, ShieldCheck, Bell, Check, Megaphone, TriangleAlert, X, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { howItWorks } from "@/lib/i18n/ns/howItWorks";
import { appLocale } from "@/lib/i18n";

export const Route = createFileRoute("/_site/how-it-works")({
  head: () => ({
    meta: [
      { title: "How YoGas Works - No More Street Queues" },
      { name: "description", content: "Learn how YoGas works in three simple steps for consumers and dealers." },
    ],
  }),
  component: HowItWorksPage,
});

import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";

function HowItWorksPage() {
  const { t } = useTranslation();
  const lang = appLocale();
  const content = lang === "ne" ? howItWorks.ne : howItWorks.en;

  const [activeTab, setActiveTab] = useState<"consumer" | "dealer">("consumer");

  // Queue Simulator State
  const [simName, setSimName] = useState("");
  const [simCitizenship, setSimCitizenship] = useState("");
  const [simStep, setSimStep] = useState(0); // 0: Idle, 1: Joined, 2: Position 3, 3: Position 2, 4: Position 1 (Ready)
  const [simQueuePos, setSimQueuePos] = useState(4);
  const [simMessage, setSimMessage] = useState("");

  const startSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simName || !simCitizenship) return;
    setSimStep(1);
    setSimQueuePos(4);
    setSimMessage(lang === "ne" ? "लाममा प्रवेश सफल! तपाईँको क्रम #४ हो।" : "Queue joined! Your position is #4.");
  };

  useEffect(() => {
    if (simStep === 0 || simStep >= 4) return;

    const timer = setTimeout(() => {
      const nextStep = simStep + 1;
      setSimStep(nextStep);
      const nextPos = 4 - (nextStep - 1);
      setSimQueuePos(nextPos);

      if (nextStep === 2) {
        setSimMessage(lang === "ne" ? "डिपोमा ग्यास अनलोड भइरहेको छ... क्रम #३।" : "Depot unloading truck... position is #3.");
      } else if (nextStep === 3) {
        setSimMessage(lang === "ne" ? "सिलिन्डर प्रमाणित र तयार गरिँदै... क्रम #२।" : "Preparing your cylinder... position is #2.");
      } else if (nextStep === 4) {
        setSimMessage(lang === "ne" ? "वितरणका लागि तयारी! डिपो काउन्टरमा स्क्यान गर्नुहोस्।" : "Ready for collection! Scan this QR at counter.");
      }
    }, 4500);

    return () => clearTimeout(timer);
  }, [simStep, lang]);

  const resetSimulation = () => {
    setSimStep(0);
    setSimName("");
    setSimCitizenship("");
    setSimMessage("");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-16 space-y-24">
      {/* Header */}
      <div className="text-center space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <QrCode className="size-3.5" /> {lang === "ne" ? "डिजिटल वितरण प्रणाली" : "Digital Distribution"}
        </span>
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-6xl">
          {t("howItWorks:title")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
          {t("howItWorks:subtitle")}
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="space-y-12">
        <div className="flex justify-center border-b border-border">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab("consumer")}
              className={`pb-4 text-base font-bold transition-all relative ${
                activeTab === "consumer"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("howItWorks:consumerTitle")}
            </button>
            <button
              onClick={() => setActiveTab("dealer")}
              className={`pb-4 text-base font-bold transition-all relative ${
                activeTab === "dealer"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("howItWorks:dealerTitle")}
            </button>
          </div>
        </div>

        {/* Steps Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {activeTab === "consumer"
            ? [content.consumer.step1, content.consumer.step2, content.consumer.step3, content.consumer.step4].map(
                (step, i) => (
                  <Card key={i} className="relative rounded-2xl border border-border bg-card shadow-soft overflow-hidden hover:shadow-lift transition-all duration-200">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-glow" />
                    <CardHeader className="pb-3 pt-6">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground font-display text-sm font-bold">
                          {i + 1}
                        </span>
                        <CardTitle className="text-base font-bold text-foreground">{step.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                    </CardContent>
                  </Card>
                ),
              )
            : [content.dealer.step1, content.dealer.step2, content.dealer.step3, content.dealer.step4].map(
                (step, i) => (
                  <Card key={i} className="relative rounded-2xl border border-border bg-card shadow-soft overflow-hidden hover:shadow-lift transition-all duration-200">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-glow" />
                    <CardHeader className="pb-3 pt-6">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground font-display text-sm font-bold">
                          {i + 1}
                        </span>
                        <CardTitle className="text-base font-bold text-foreground">{step.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                    </CardContent>
                  </Card>
                ),
              )}
        </div>
      </div>

      {/* Interactive Queue Simulator Widget */}
      <section className="rounded-3xl border border-border bg-secondary/30 p-6 md:p-10 shadow-soft">
        <div className="grid gap-12 lg:grid-cols-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {lang === "ne" ? "लाइभ सिमुलेटर" : "Try The Live Simulator"}
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight">
              {lang === "ne" ? "भर्चुअल लामको अनुभव गर्नुहोस्" : "Experience the Virtual Queue"}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {lang === "ne"
                ? "योग्यासको डिजिटल प्रणालीले कसरी काम गर्छ भनी हेर्नको लागि आफ्नो काल्पनिक विवरणहरू भरेर भर्चुअल लाममा समावेश हुनुहोस् र कसरी तपाईंको पालो लाइभ अपडेट हुन्छ र संकलन क्यूआर कोड सिर्जना हुन्छ हेर्नुहोस्।"
                : "Fill in mock details to experience the step-by-step consumer workflow. See how your virtual ticket is updated, how the queue changes live, and how you receive your scannable cylinder collect pass."}
            </p>

            {simStep === 0 ? (
              <form onSubmit={startSimulation} className="space-y-4 bg-card p-6 rounded-2xl border border-border shadow-soft">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground">{lang === "ne" ? "पूरा नाम" : "Full Name"}</label>
                    <Input
                      placeholder={lang === "ne" ? "जस्तै: रमेश थापा" : "e.g. Ramesh Thapa"}
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground">{lang === "ne" ? "काल्पनिक नागरिकता नं" : "Mock Citizenship No."}</label>
                    <Input
                      placeholder={lang === "ne" ? "जस्तै: २७-०१-७२-१२३४५" : "e.g. 27-01-72-12345"}
                      value={simCitizenship}
                      onChange={(e) => setSimCitizenship(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  {lang === "ne" ? "भर्चुअल लाममा जोडिनुहोस्" : "Simulate Queue Entry"}
                </Button>
              </form>
            ) : (
              <div className="bg-card p-6 rounded-2xl border border-border shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {lang === "ne" ? "प्रणाली स्थिति:" : "System Status:"}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-xs font-bold ${simStep === 4 ? "text-success" : "text-primary animate-pulse"}`}>
                    ● {simStep === 4 ? (lang === "ne" ? "तयार (सङ्कलन गर्नू)" : "Ready for pickup") : (lang === "ne" ? "प्रतीक्षा सूचीमा" : "In Queue")}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground bg-secondary/50 p-3 rounded-lg border border-border/60">
                  <Megaphone className="size-4 text-primary inline-block mr-1.5 -mt-0.5" /> {simMessage}
                </p>
                <div className="flex justify-between items-center text-xs text-muted-foreground pt-2">
                  <span>{lang === "ne" ? "उपभोक्ता: " : "Consumer: "}<strong>{simName}</strong></span>
                  <span>{lang === "ne" ? "नागरिकता: " : "Citizenship: "}<strong>{simCitizenship}</strong></span>
                </div>
                <Button onClick={resetSimulation} variant="outline" className="w-full">
                  {lang === "ne" ? "सिमुलेटर रिसेट गर्नुहोस्" : "Reset Simulator"}
                </Button>
              </div>
            )}
          </div>

          <div className="lg:col-span-6 flex justify-center">
            {simStep === 0 ? (
              <div className="w-72 h-96 border border-dashed border-border rounded-3xl flex flex-col items-center justify-center bg-card/60 p-6 text-center space-y-3">
                <QrCode className="size-16 text-muted-foreground/60" />
                <p className="text-sm font-semibold text-muted-foreground">
                  {lang === "ne" ? "विवरणहरू भरेर सिमुलेशन सुरु गर्नुहोस्" : "Enter details to view mock cylinder pass"}
                </p>
              </div>
            ) : (
              <div className="w-72 min-h-96 border border-border bg-card rounded-3xl shadow-lift overflow-hidden flex flex-col relative">
                {/* Header card styling */}
                <div className="bg-primary p-4 text-primary-foreground text-center space-y-1 border-b-2 border-dashed border-white/40">
                  <p className="text-xs uppercase font-bold tracking-widest opacity-80">YoGas Waitlist Ticket</p>
                  <p className="text-lg font-bold truncate">{simName}</p>
                </div>

                {/* Ticket Details */}
                <div className="p-6 flex-1 flex flex-col items-center justify-center text-center space-y-6">
                  {simStep < 4 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-semibold uppercase">{lang === "ne" ? "लामको स्थान" : "WAITLIST POSITION"}</p>
                      <p className="text-6xl font-display font-extrabold text-foreground">#{simQueuePos}</p>
                      <p className="text-xs text-primary font-bold">{lang === "ne" ? "अनुमानित समय: १५-४५ मिनेट" : "Est. Wait: 15-45 mins"}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-success/15 border border-success/30 rounded-xl p-3">
                        <p className="text-xs font-bold text-success uppercase">{lang === "ne" ? "बुझिलिनुहोस्!" : "COLLECTION TICKET ACTIVE"}</p>
                      </div>
                      <div className="flex items-center justify-center rounded-2xl border border-border/80 bg-white p-3 shadow-soft">
                        <QRCodeSVG value={`yogas-collect-${simCitizenship}`} size={140} className="block h-auto w-auto" />
                      </div>
                      <p className="text-xs font-mono text-muted-foreground">TOKEN: YG-{simCitizenship.slice(-5)}</p>
                    </div>
                  )}

                  <div className="border-t border-dashed border-border/70 pt-4 w-full text-left space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{lang === "ne" ? "डिपो साझेदार" : "DEPOT"}</p>
                    <p className="text-xs font-bold text-foreground">Sajha Gas Depot, Lalitpur</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold pt-1">{lang === "ne" ? "सिलिन्डर आकार" : "CYLINDER SIZE"}</p>
                    <p className="text-xs font-bold text-foreground">14.2 kg (Standard Red)</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Comparison Grid */}
      <section className="space-y-12">
        <div className="text-center space-y-3">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            {lang === "ne" ? "परम्परागत सडक लाम बनाम योग्यास" : "Street Queues vs. YoGas Queues"}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {lang === "ne" ? "हामीले ग्यास वितरण प्रक्रियालाई कसरी पारदर्शी र मर्यादित बनायौं" : "How we bring transparency and dignity to Nepalese LPG distribution."}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {/* Physical queues */}
          <div className="border border-border bg-card rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-destructive flex items-center gap-2">
              <TriangleAlert className="size-5 text-destructive" /> {lang === "ne" ? "परम्परागत सडक लामहरू" : "Traditional Street Queues"}
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <X className="size-4 text-destructive shrink-0 mt-0.5" />
                {lang === "ne" ? "घण्टौंसम्म घाम, पानी वा चिसोमा लाइन बस्नुपर्ने" : "Standing under direct sun or rain for hours"}
              </li>
              <li className="flex items-start gap-2">
                <X className="size-4 text-destructive shrink-0 mt-0.5" />
                {lang === "ne" ? "पक्षपात, भण्डारण र कालोबजारीको उच्च जोखिम" : "High risk of hoarding, back-channel deals, or scalping"}
              </li>
              <li className="flex items-start gap-2">
                <X className="size-4 text-destructive shrink-0 mt-0.5" />
                {lang === "ne" ? "ग्यास स्टक कहिले आइपुग्छ र कति छ भन्ने कुनै जानकारी नहुने" : "Zero visibility into stock delivery timing or exact quantities"}
              </li>
              <li className="flex items-start gap-2">
                <X className="size-4 text-destructive shrink-0 mt-0.5" />
                {lang === "ne" ? "बिचौलियाहरूले कृत्रिम अभाव सिर्जना गर्न सक्ने" : "Middlemen grabbing cards to resell queue spots"}
              </li>
            </ul>
          </div>

          {/* YoGas queues */}
          <div className="border border-primary/30 bg-primary/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-primary flex items-center gap-2">
              <CheckCircle2 className="size-5 text-primary" /> {lang === "ne" ? "योग्यास पारदर्शी प्रणाली" : "YoGas Virtual Queues"}
            </h3>
            <ul className="space-y-3 text-sm text-foreground/80">
              <li className="flex items-start gap-2">
                <Check className="size-4 text-primary shrink-0 mt-0.5" />
                {lang === "ne" ? "घरमै बसी मोबाइलमा आफ्नो स्थान र पालो प्रत्यक्ष रूपमा हेर्न मिल्ने" : "Track position from home and only go to the depot when ready"}
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-4 text-primary shrink-0 mt-0.5" />
                {lang === "ne" ? "एक नागरिकता नम्बर = एक कोटा लाम, पक्षपात र भण्डारण बन्द" : "One citizenship = one line limit, cutting off hoarding"}
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-4 text-primary shrink-0 mt-0.5" />
                {lang === "ne" ? "डिपोको लाइभ स्टक र दैनिक वितरणको पूर्ण पारदर्शिता" : "Full audit trail of active stock numbers and handovers"}
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-4 text-primary shrink-0 mt-0.5" />
                {lang === "ne" ? "संकलन कोड म्यानुअल वा QR स्क्यान गरी तत्काल प्रमाणित हुने" : "Rapid verification at counter in 3 seconds flat"}
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-center bg-card border border-border rounded-3xl p-8 max-w-xl mx-auto space-y-4">
        <h3 className="font-display text-2xl font-bold">{content.cta.title}</h3>
        <p className="text-muted-foreground text-sm">
          {lang === "ne"
            ? "बिचौलिया र सडकको लामबाट बच्नुहोस्। आजै आफ्नो खाता दर्ता गर्नुहोस्।"
            : "Register with your citizenship details once and start tracking queues immediately."}
        </p>
        <Button asChild size="lg" className="mt-2">
          <Link to="/auth">{lang === "ne" ? "पर्खाइ सूचीमा जोडिनुहोस्" : "Register / Sign In"}</Link>
        </Button>
      </section>
    </div>
  );
}
