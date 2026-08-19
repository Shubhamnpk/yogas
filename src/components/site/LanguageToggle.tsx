import { Check, Globe } from "lucide-react";
import { appLocale, setAppLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function LanguageToggle({
  variant = "ghost",
  size = "sm",
}: { variant?: "default" | "outline" | "ghost" | "destructive" | "secondary" | "link"; size?: "default" | "sm" | "lg" }) {
  const locale = appLocale();
  return (
    <div className="flex items-center gap-1.5 rounded-xl bg-secondary px-1.5 py-1 text-xs font-medium text-muted-foreground">
      <Globe className="size-3.5 text-muted-foreground/60" />
      <Button
        size={size}
        variant={locale === "en" ? "default" : variant}
        className="h-6 px-2 text-xs font-semibold"
        onClick={() => setAppLocale("en")}
      >
        EN {locale === "en" ? <Check className="ml-1 size-3" /> : null}
      </Button>
      <Button
        size={size}
        variant={locale === "ne" ? "default" : variant}
        className="h-6 px-2 text-xs font-semibold"
        onClick={() => setAppLocale("ne")}
      >
        ने {locale === "ne" ? <Check className="ml-1 size-3" /> : null}
      </Button>
    </div>
  );
}