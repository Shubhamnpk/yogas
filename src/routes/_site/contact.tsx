import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Mail, MapPin, Send, CheckCircle2, ShieldCheck, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contact } from "@/lib/i18n/ns/contact";
import { appLocale } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_site/contact")({
  head: () => ({
    meta: [
      { title: "Contact - YoGas Support" },
      { name: "description", content: "Contact us about your queue, depot, or general questions about YoGas." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { t } = useTranslation();
  const lang = appLocale();
  const c = lang === "ne" ? contact.ne : contact.en;

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [topic, setTopic] = useState("general");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      toast.error(lang === "ne" ? "कृपया सबै आवश्यक क्षेत्रहरू भर्नुहोस्।" : "Please fill in all required fields.");
      return;
    }

    setLoading(true);
    // Simulate API request
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLoading(false);
    setSubmitted(true);
    toast.success(lang === "ne" ? "सन्देश सफलतापूर्वक पठाइयो!" : "Message sent successfully!");
  };

  const handleSendMailto = () => {
    const mailSubject = encodeURIComponent(`YoGas [${topic}] - ${subject || "Support Inquiry"}`);
    const mailBody = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\nMessage:\n${message}`);
    window.location.href = `mailto:support@yogas.app?subject=${mailSubject}&body=${mailBody}`;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-16 space-y-16">
      {/* Header */}
      <div className="text-center space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Phone className="size-3.5" /> Support Center
        </span>
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">{t("contact:title")}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground text-base md:text-lg leading-relaxed">{t("contact:subtitle")}</p>
      </div>

      <div className="grid gap-12 md:grid-cols-12 items-start">
        {/* Contact Info Sidebar */}
        <div className="md:col-span-5 space-y-8">
          <div className="space-y-6">
            <div className="flex gap-4 p-5 bg-card rounded-2xl border border-border shadow-soft">
              <Mail className="size-6 text-primary shrink-0 mt-1" />
              <div className="space-y-1">
                <h3 className="font-bold text-foreground">{c.email}</h3>
                <p className="text-sm font-semibold text-primary">support@yogas.app</p>
                <p className="text-xs text-muted-foreground">{c.emailBody}</p>
              </div>
            </div>

            <div className="flex gap-4 p-5 bg-card rounded-2xl border border-border shadow-soft">
              <MapPin className="size-6 text-primary shrink-0 mt-1" />
              <div className="space-y-1">
                <h3 className="font-bold text-foreground">{lang === "ne" ? "नेपाल" : "Nepal"}</h3>
                <p className="text-sm text-foreground/80">{lang === "ne" ? "काठमाडौं उपत्यका (अनलाइन परियोजना)" : "Kathmandu Valley (Remote / Online)"}</p>
                <p className="text-xs text-muted-foreground">{lang === "ne" ? "यो एउटा स्वतन्त्र OSS परियोजना हो।" : "This is an independent OSS project."}</p>
              </div>
            </div>
          </div>

          {/* OSS Community Links */}
          <div className="bg-secondary/40 rounded-3xl p-6 border border-border space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              {lang === "ne" ? "समुदाय र समर्थन" : "Community & Support"}
            </h3>
            <div className="space-y-3 text-xs text-muted-foreground">
              <div className="flex justify-between border-b border-border/40 pb-2 items-center">
                <span>{lang === "ne" ? "GitHub समस्या रिपोर्ट" : "GitHub Issue Tracker"}</span>
                <a
                  href="https://github.com/shubhamnpk/yogas/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-primary hover:underline"
                >
                  github.com/shubhamnpk/yogas
                </a>
              </div>
              <div className="flex justify-between pb-1 items-center">
                <span>{lang === "ne" ? "सुझाव र योगदान" : "Contribute / Feedback"}</span>
                <a
                  href="https://github.com/shubhamnpk/yogas/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-primary hover:underline"
                >
                  Discussions
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-secondary p-2 rounded-lg border border-border/50 mt-3">
              <ShieldCheck className="size-3.5 shrink-0 text-primary" />
              <span>{lang === "ne" ? "यो परियोजना गैरव्यावसायिक र खुला स्रोत हो।" : "Non-commercial, open-source civic tech project."}</span>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="md:col-span-7 bg-card border border-border rounded-3xl p-6 md:p-8 shadow-lift relative">
          {submitted ? (
            <div className="py-12 text-center space-y-6">
              <div className="inline-flex size-16 place-items-center justify-center rounded-full bg-success/10 text-success mx-auto">
                <CheckCircle2 className="size-10" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-2xl font-bold text-foreground">
                  {lang === "ne" ? "सन्देश प्राप्त भयो!" : "Message Received!"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  {lang === "ne"
                    ? "तपाईंको सन्देश सफलपूर्वक रेकर्ड गरिएको छ। हाम्रो टिमले २४ घण्टा भित्र पुन: सम्पर्क गर्नेछ।"
                    : "Thanks for reaching out! A ticket has been created and we will get back to you within 24 hours."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button variant="outline" onClick={() => setSubmitted(false)}>
                  {lang === "ne" ? "नयाँ सन्देश पठाउनुहोस्" : "Send Another Message"}
                </Button>
                <Button onClick={handleSendMailto}>
                  <Send className="size-4 mr-2" />
                  {lang === "ne" ? "इमेल क्लाइन्टबाट पठाउनुहोस्" : "Open in Mail App"}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-bold">{c.formName} *</Label>
                  <Input
                    id="name"
                    required
                    placeholder="e.g. Maya Shrestha"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold">{c.formEmail} *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="maya@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="topic" className="text-xs font-bold">{lang === "ne" ? "सम्पर्कको विषय" : "Topic Category"}</Label>
                  <select
                    id="topic"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  >
                    <option value="general">{lang === "ne" ? "साधारण सोधपुछ" : "General Inquiry"}</option>
                    <option value="depot">{lang === "ne" ? "डिलर / डिपो अनबोर्डिङ" : "Dealer/Depot Partnership"}</option>
                    <option value="quota">{lang === "ne" ? "कोटा र नागरिकता समस्या" : "Quota / Verification Issue"}</option>
                    <option value="bug">{lang === "ne" ? "एपमा समस्या / बग रिपोर्ट" : "App Bug Report"}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-xs font-bold">{c.formSubject}</Label>
                  <Input
                    id="subject"
                    placeholder={lang === "ne" ? "ग्याँस र लामको विषय" : "e.g. Queue waiting error"}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-xs font-bold">{c.formMessage} *</Label>
                <Textarea
                  id="message"
                  required
                  placeholder={lang === "ne" ? "तपाईंको प्रश्न वा समस्या यहाँ लेख्नुहोस्..." : "Write your inquiry details here..."}
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  <Send className="mr-2 size-4" />
                  {loading ? (lang === "ne" ? "पठाउँदै..." : "Sending...") : c.formSubmit}
                </Button>
              </div>

              <div className="flex items-center gap-2 justify-center text-[10px] text-muted-foreground border-t border-border/40 pt-4 mt-2">
                <ShieldCheck className="size-3.5 text-primary" />
                <span>{lang === "ne" ? "हामी तपाईंको व्यक्तिगत डाटा सुरक्षित राख्छौं।" : "Your verification details are securely transmitted."}</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}