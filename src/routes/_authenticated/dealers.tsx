import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, MapPin, Phone, Search, Store } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CYLINDER_LABEL, CYLINDER_SIZE, NEPAL_DISTRICTS, stockLabel } from "@/lib/gas";
import type { Dealer } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/dealers")({
  head: () => ({
    meta: [
      { title: "Find a depot — GasQueue" },
      {
        name: "description",
        content: "Search verified LPG depots by name or district and join their waitlist.",
      },
      { property: "og:title", content: "Find a depot — GasQueue" },
      { property: "og:description", content: "Browse LPG depots and their live cylinder stock." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { depot?: string } =>
    typeof search['depot'] === "string" ? { depot: search['depot'] } : {},
  component: DealersPage,
});

const requestSchema = z.object({
  quantity: z.number().int().min(1).max(3),
  note: z.string().trim().max(240).optional().or(z.literal("")),
});

function DealersPage() {
  const { depot } = Route.useSearch();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState<string | null>(null);
  const [list, setList] = useState<(Dealer & { waiting?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Dealer | null>(null);
  const [form, setForm] = useState({ quantity: "1", note: "" });
  const [busy, setBusy] = useState(false);
  const [hasActiveRequest, setHasActiveRequest] = useState(false);

  // Default the filter to the consumer's own district.
  useEffect(() => {
    if (district === null) setDistrict(profile?.district ?? "all");
  }, [profile?.district, district]);

  const load = useCallback(async () => {
    if (district === null) return;
    setLoading(true);
    let q = supabase.from("dealers").select("*").eq("is_active", true);
    if (district !== "all") q = q.eq("district", district);
    if (query.trim()) q = q.ilike("business_name", `%${query.trim()}%`);
    const { data } = await q.order("stock", { ascending: false }).limit(50);
    const rows = ((data as Dealer[]) ?? []) as (Dealer & { waiting?: number })[];
    const withCounts = await Promise.all(
      rows.map(async (d) => {
        const { data: c } = await supabase.rpc("dealer_waiting_count", { _dealer_id: d.id });
        return { ...d, waiting: (c as number | null) ?? 0 };
      }),
    );
    setList(withCounts);
    setLoading(false);
  }, [query, district]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("waitlist_entries")
      .select("id, status")
      .eq("consumer_id", user.id)
      .in("status", ["waiting", "allotted"])
      .then(({ data }) => setHasActiveRequest((data ?? []).length > 0));
  }, [user, active]);

  useEffect(() => {
    if (!depot) return;
    void supabase
      .from("dealers")
      .select("*")
      .eq("code", depot.toUpperCase())
      .maybeSingle()
      .then(({ data }) => {
        if (data) setActive(data as Dealer);
        else toast.error("No depot found for that code");
        void navigate({ to: "/dealers", search: {}, replace: true });
      });
  }, [depot, navigate]);

  const submit = async () => {
    if (!user || !active) return;
    const parsed = requestSchema.safeParse({
      quantity: Number(form.quantity),
      note: form.note,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your request");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("waitlist_entries").insert({
      dealer_id: active.id,
      consumer_id: user.id,
      quantity: parsed.data.quantity,
      cylinder_size: CYLINDER_SIZE,
      note: parsed.data.note || null,
    });
    setBusy(false);
    if (error) {
      toast.error(
        error.code === "23505"
          ? "You already have an active request. Cancel it before joining another queue."
          : error.message,
      );
      return;
    }
    setActive(null);
    setForm({ quantity: "1", note: "" });
    toast.success("You've joined the waitlist");
    void navigate({ to: "/dashboard" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Find a depot</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Showing depots in{" "}
          {district && district !== "all" ? district : "every district"} — search by name to narrow
          it down.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search depot name"
            className="pl-9"
            maxLength={60}
          />
        </div>
        <Select value={district ?? "all"} onValueChange={setDistrict}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="All districts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All districts</SelectItem>
            {NEPAL_DISTRICTS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveRequest ? (
        <p className="rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
          You already have an active request. Collect or cancel it before joining another depot's
          queue.
        </p>
      ) : null}

      {loading ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No depots {district && district !== "all" ? `in ${district}` : ""} match your search.
          </p>
          {district && district !== "all" ? (
            <Button variant="outline" className="mt-4" onClick={() => setDistrict("all")}>
              Search all districts
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((d) => {
            const s = stockLabel(d.stock);
            return (
              <div key={d.id} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 font-semibold">
                      <Store className="size-4 text-primary" /> {d.business_name}
                    </h2>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-3.5" /> {d.address ? `${d.address}, ` : ""}
                      {d.district}
                    </p>
                    {d.phone ? (
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="size-3.5" /> {d.phone}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={
                      s.tone === "success"
                        ? "rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success"
                        : s.tone === "warning"
                          ? "rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning"
                          : "rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive"
                    }
                  >
                    {s.label}
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3 text-sm">
                  <span>
                    <span className="font-display text-lg font-bold">{d.stock}</span>{" "}
                    <span className="text-muted-foreground">cylinders</span>
                  </span>
                  <span className="text-muted-foreground">{d.waiting ?? 0} waiting</span>
                </div>

                <Button
                  className="mt-4 w-full"
                  disabled={hasActiveRequest}
                  onClick={() => setActive(d)}
                  variant={hasActiveRequest ? "outline" : "default"}
                >
                  {hasActiveRequest ? "You're already in a queue" : "Request a cylinder"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(active)} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join {active?.business_name}</DialogTitle>
            <DialogDescription>
              Your name, address and citizenship number will be shared with this depot for
              verification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl bg-secondary/60 px-4 py-3 text-sm">
              <span className="font-medium">Cylinder:</span> {CYLINDER_LABEL} (the only size
              distributed right now)
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Select value={form.quantity} onValueChange={(v) => setForm({ ...form, quantity: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["1", "2", "3"].map((q) => (
                    <SelectItem key={q} value={q}>
                      {q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note for the dealer (optional)</Label>
              <Textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={3}
                maxLength={240}
                placeholder="e.g. Elderly household, need it urgently"
              />
            </div>
            <Button className="w-full" onClick={() => void submit()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null} Join waitlist
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
