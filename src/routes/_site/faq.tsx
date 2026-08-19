import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { faq } from "@/lib/i18n/ns/faq";
import { appLocale } from "@/lib/i18n";
import { Search, HelpCircle, Phone, MessageSquare, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_site/faq")({
  head: () => ({
    meta: [
      { title: "FAQ - YoGas LPG Waitlist" },
      { name: "description", content: "Frequently asked questions about YoGas, the virtual LPG queue for Nepali households." },
    ],
  }),
  component: FAQPage,
});

type Category = "all" | "consumer" | "dealer" | "security";

function FAQPage() {
  const { t } = useTranslation();
  const lang = appLocale();
  const items = lang === "ne" ? faq.ne.items : faq.en.items;
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("all");

  // Dynamically assign categories to FAQ items based on content search
  const categorizedItems = useMemo(() => {
    return items.map((item, index) => {
      let category: Category = "consumer";
      const textToScan = (item.q + " " + item.a).toLowerCase();
      
      if (textToScan.includes("dealer") || textToScan.includes("डिलर") || textToScan.includes("डिपो") || textToScan.includes("stock") || textToScan.includes("स्टक")) {
        category = "dealer";
      } else if (textToScan.includes("citizenship") || textToScan.includes("नागरिकता") || textToScan.includes("cooldown") || textToScan.includes("कूलडाउन") || textToScan.includes("security") || textToScan.includes("सुरक्षित")) {
        category = "security";
      }
      
      return {
        ...item,
        category,
        id: `faq-${index}`
      };
    });
  }, [items]);

  // Filter FAQs based on search and category tabs
  const filteredItems = useMemo(() => {
    return categorizedItems.filter(item => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      const matchesSearch = searchQuery === "" || 
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.a.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCategory && matchesSearch;
    });
  }, [categorizedItems, activeCategory, searchQuery]);

  const categories = [
    { id: "all" as Category, label: lang === "ne" ? "सबै प्रश्नहरू" : "All Questions" },
    { id: "consumer" as Category, label: lang === "ne" ? "उपभोक्ता र परिवार" : "For Consumers" },
    { id: "dealer" as Category, label: lang === "ne" ? "डिलर र डिपोहरू" : "For Depots" },
    { id: "security" as Category, label: lang === "ne" ? "सुरक्षा र कोटा नियम" : "Quota & Security" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:py-16 space-y-16">
      {/* Title */}
      <div className="text-center space-y-4">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <HelpCircle className="size-3.5" /> FAQ Hub
        </span>
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          {t("faq:title")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground text-base md:text-lg leading-relaxed">
          {t("faq:subtitle")}
        </p>
      </div>

      {/* Search and Category Filter Bar */}
      <div className="space-y-6">
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={lang === "ne" ? "प्रश्नोत्तर खोज्नुहोस्..." : "Search questions or keywords..."}
            className="pl-10 h-11 bg-card border-border rounded-xl shadow-soft"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-full border transition-all duration-150 ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground border-primary shadow-soft"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="mx-auto max-w-3xl space-y-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-card space-y-3">
            <AlertCircle className="size-8 mx-auto text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">
              {lang === "ne" ? "कुनै नतिजा भेटिएन" : "No results match your search"}
            </p>
            <p className="text-xs text-muted-foreground">
              {lang === "ne" ? "कृपया फरक शब्द प्रयोग गरी पुन: प्रयास गर्नुहोस्।" : "Try adjusting your search keywords or categories."}
            </p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-4">
            {filteredItems.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className="border border-border bg-card rounded-2xl px-5 py-1 shadow-soft data-[state=open]:shadow-lift data-[state=open]:border-primary/30 transition-all duration-200"
              >
                <AccordionTrigger className="text-left text-base font-semibold hover:no-underline text-foreground py-4">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4 border-t border-border/40 pt-3">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      {/* High-Fidelity Callout / Support Card */}
      <div className="rounded-3xl border border-border bg-secondary/30 p-8 md:p-10 shadow-soft max-w-3xl mx-auto space-y-6">
        <div className="grid gap-6 md:grid-cols-12 items-center">
          <div className="md:col-span-8 space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">
              {lang === "ne" ? "तपाईंको प्रश्नको उत्तर भेटिएन?" : "Still have questions?"}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {lang === "ne" 
                ? "हाम्रो नागरिक सहायता टिम तपाईंलाई सहयोग गर्न तयार छ। हामीलाई सिधै सम्पर्क गर्नुहोस् वा सन्देश पठाउनुहोस्।"
                : "Our consumer support team is online 9 AM - 5 PM to assist you with registration, citizenship verification, or dealer onboarding."}
            </p>
          </div>
          <div className="md:col-span-4 flex flex-col gap-2.5">
            <Button asChild className="w-full" size="sm">
              <Link to="/contact">
                <MessageSquare className="size-4 mr-2" />
                {lang === "ne" ? "हामीलाई लेख्नुहोस्" : "Contact Desk"}
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full bg-card" size="sm">
              <a href="https://wa.me/9779800000000" target="_blank" rel="noopener noreferrer">
                <Phone className="size-4 mr-2 text-emerald-500" />
                {lang === "ne" ? "व्हाट्सएप सपोर्ट" : "WhatsApp Help"}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}