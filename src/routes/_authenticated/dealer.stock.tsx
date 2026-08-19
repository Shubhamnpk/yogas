import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { Boxes, Loader2, Minus, Pencil, Plus, Store } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import i18n, { formatNumber } from "@/lib/i18n";
import { useAuth, sessionArgs } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { friendlyError, stockLabel } from "@/lib/gas";

export const Route = createFileRoute("/_authenticated/dealer/stock")({
  head: () => ({
    meta: [
      { title: i18n.t("dealer:stockTitle") },
      { name: "description", content: i18n.t("dealer:stockDescription") },
      { property: "og:title", content: i18n.t("dealer:stockTitle") },
      {
        property: "og:description",
        content: i18n.t("dealer:stockOgDescription"),
      },
    ],
  }),
  component: DealerStock,
});

function DealerStock() {
  const { t } = useTranslation();
  const { dealer, user, sessionToken } = useAuth();
  const updateDealerStock = useMutation(api.app.updateDealerStock);
  const toggleDealerActive = useMutation(api.app.toggleDealerActive);
  const [stock, setStock] = useState(0);
  const [stockInput, setStockInput] = useState("0");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (dealer) {
      setStock(dealer.stock);
      setStockInput(String(dealer.stock));
    }
  }, [dealer]);

  if (!dealer || !user) return null;
  const s = stockLabel(stock);

  const adjustStock = (delta: number) => {
    const next = Math.max(0, stock + delta);
    setStock(next);
    setStockInput(String(next));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStockInput(val);
    if (val !== "" && !Number.isNaN(Number(val))) {
      setStock(Math.max(0, Math.floor(Number(val))));
    }
  };

  const handleInputBlur = () => {
    if (stockInput === "" || Number.isNaN(Number(stockInput))) {
      setStockInput(String(stock));
    } else {
      const parsed = Math.max(0, Math.floor(Number(stockInput)));
      setStock(parsed);
      setStockInput(String(parsed));
    }
  };

  const saveStock = async () => {
    setBusy(true);
    try {
      await updateDealerStock({
        ...sessionArgs(sessionToken),
        stock: Math.max(0, Math.floor(stock)),
      });
      toast.success(t("dealer:stockUpdatedSuccess"));
    } catch (error) {
      toast.error(friendlyError(error, "Could not update stock"));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (value: boolean) => {
    try {
      await toggleDealerActive({ ...sessionArgs(sessionToken), isActive: value });
      toast.success(value ? t("dealer:depotNowVisible") : t("dealer:depotHidden"));
    } catch (error) {
      toast.error(friendlyError(error, "Could not update depot visibility"));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">
          {t("dealer:stockAvailabilityTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dealer:stockCountNote")}
        </p>
      </div>

      {/* Stock Management Card */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Boxes className="size-5" />
            </span>
            <div>
              <h2 className="font-bold text-base">{t("dealer:cylindersAvailable")}</h2>
              <p
                className={
                  s.tone === "success"
                    ? "text-xs font-semibold text-success"
                    : s.tone === "warning"
                      ? "text-xs font-semibold text-warning"
                      : "text-xs font-semibold text-destructive"
                }
              >
                {t(s.key)}
              </p>
            </div>
          </div>
          <span className="font-mono text-xs font-bold text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
            {t("dealer:depotLabel", { code: dealer.code })}
          </span>
        </div>

        <div className="flex items-center justify-center gap-4 py-2">
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-2xl shrink-0"
            onClick={() => adjustStock(-1)}
          >
            <Minus className="size-6 text-foreground" />
          </Button>

          <Input
            type="number"
            min={0}
            value={stockInput}
            onFocus={() => {
              if (stockInput === "0") setStockInput("");
            }}
            onBlur={handleInputBlur}
            onChange={handleInputChange}
            placeholder="0"
            className="h-20 w-36 text-center font-display text-4xl font-extrabold rounded-2xl border-2 border-primary/20 focus:border-primary"
          />

          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-2xl shrink-0"
            onClick={() => adjustStock(1)}
          >
            <Plus className="size-6 text-foreground" />
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-2 pt-1">
          {[10, 25, 50, 100].map((n) => (
            <Button
              key={n}
              variant="secondary"
              size="sm"
              className="rounded-xl px-4 font-semibold text-xs h-9"
              onClick={() => adjustStock(n)}
            >
              {t("dealer:addCylinders", { count: n, formatted: formatNumber(n) })}
            </Button>
          ))}
        </div>

        <Button className="w-full h-12 rounded-xl text-base font-semibold" onClick={() => void saveStock()} disabled={busy}>
          {busy ? <Loader2 className="size-5 animate-spin mr-2" /> : null} {t("dealer:saveUpdatedStock")}
        </Button>
      </div>

      {/* Queue Visibility Toggle */}
      <div className="flex items-center justify-between rounded-3xl border border-border/80 bg-card p-6 shadow-soft">
        <div className="pr-4">
          <h2 className="font-bold text-base text-foreground">{t("dealer:acceptNewRequests")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("dealer:acceptNewRequestsNote")}
          </p>
        </div>
        <Switch checked={dealer.is_active} onCheckedChange={(v) => void toggleActive(v)} />
      </div>

      {/* Direct Link to Edit Business Profile */}
      <div className="flex items-center justify-between rounded-3xl border border-border/80 bg-secondary/30 p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Store className="size-4.5" />
          </span>
          <div>
            <h3 className="font-semibold text-sm">Need to update depot address or phone?</h3>
            <p className="text-xs text-muted-foreground">Manage your depot business details on your profile.</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-xl h-9 text-xs font-semibold shrink-0">
          <Link to="/profile">
            <Pencil className="size-3.5 mr-1 text-primary" /> Edit Profile
          </Link>
        </Button>
      </div>
    </div>
  );
}
