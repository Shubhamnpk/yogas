import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { Boxes, Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { stockLabel } from "@/lib/gas";

export const Route = createFileRoute("/_authenticated/dealer/stock")({
  head: () => ({
    meta: [
      { title: "Stock & depot — YoGas" },
      { name: "description", content: "Update your cylinder stock and depot details." },
      { property: "og:title", content: "Stock & depot — YoGas" },
      { property: "og:description", content: "Keep your stock accurate so the queue stays honest." },
    ],
  }),
  component: DealerStock,
});

function DealerStock() {
  const { dealer, user, sessionToken } = useAuth();
  const updateDealerStock = useMutation(api.app.updateDealerStock);
  const updateDealerDetails = useMutation(api.app.updateDealerDetails);
  const toggleDealerActive = useMutation(api.app.toggleDealerActive);
  const [stock, setStock] = useState(0);
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState({ business_name: "", address: "", phone: "" });

  useEffect(() => {
    if (dealer) {
      setStock(dealer.stock);
      setDetails({
        business_name: dealer.business_name,
        address: dealer.address ?? "",
        phone: dealer.phone ?? "",
      });
    }
  }, [dealer]);

  if (!dealer || !user) return null;
  const s = stockLabel(stock);

  const saveStock = async () => {
    setBusy(true);
    try {
      await updateDealerStock({ sessionToken: sessionToken ?? undefined, stock: Math.max(0, Math.floor(stock)) });
      toast.success("Stock updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update stock");
    } finally {
      setBusy(false);
    }
  };

  const saveDetails = async () => {
    if (details.business_name.trim().length < 2) {
      toast.error("Enter a depot name");
      return;
    }
    setBusy(true);
    try {
      await updateDealerDetails({
        sessionToken: sessionToken ?? undefined,
        businessName: details.business_name.trim(),
        address: details.address.trim() || undefined,
        phone: details.phone.trim() || undefined,
      });
      toast.success("Depot details saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save depot details");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (value: boolean) => {
    try {
      await toggleDealerActive({ sessionToken: sessionToken ?? undefined, isActive: value });
      toast.success(value ? "Depot is now visible" : "Depot hidden from consumers");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update depot visibility");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Stock & depot</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stock drops automatically each time you allot a cylinder.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground">
            <Boxes className="size-4" />
          </span>
          <div>
            <h2 className="font-semibold">Cylinders available</h2>
            <p
              className={
                s.tone === "success"
                  ? "text-sm text-success"
                  : s.tone === "warning"
                    ? "text-sm text-warning"
                    : "text-sm text-destructive"
              }
            >
              {s.label}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setStock((v) => Math.max(0, v - 1))}>
            <Minus className="size-4" />
          </Button>
          <Input
            type="number"
            min={0}
            value={stock}
            onChange={(e) => setStock(Math.max(0, Number(e.target.value) || 0))}
            className="h-16 w-32 text-center font-display text-3xl font-bold"
          />
          <Button variant="outline" size="icon" onClick={() => setStock((v) => v + 1)}>
            <Plus className="size-4" />
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {[10, 25, 50, 100].map((n) => (
            <Button key={n} variant="secondary" size="sm" onClick={() => setStock((v) => v + n)}>
              +{n}
            </Button>
          ))}
        </div>

        <Button className="mt-6 w-full" onClick={() => void saveStock()} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null} Save stock
        </Button>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="font-semibold">Depot details</h2>
        <div className="space-y-2">
          <Label>Depot name</Label>
          <Input
            value={details.business_name}
            onChange={(e) => setDetails({ ...details, business_name: e.target.value })}
            maxLength={90}
          />
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Textarea
            value={details.address}
            onChange={(e) => setDetails({ ...details, address: e.target.value })}
            rows={2}
            maxLength={160}
          />
        </div>
        <div className="space-y-2">
          <Label>Contact phone</Label>
          <Input
            value={details.phone}
            onChange={(e) => setDetails({ ...details, phone: e.target.value })}
            maxLength={20}
          />
        </div>
        <Button variant="outline" onClick={() => void saveDetails()} disabled={busy}>
          Save details
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div>
          <h2 className="font-semibold">Accept new requests</h2>
          <p className="text-sm text-muted-foreground">
            Turn off to hide your depot from consumer search.
          </p>
        </div>
        <Switch checked={dealer.is_active} onCheckedChange={(v) => void toggleActive(v)} />
      </div>
    </div>
  );
}
