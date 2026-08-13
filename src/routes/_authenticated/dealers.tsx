import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Loader2, MapPin, Search, Store } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeModal, NativeModalHeader } from "@/components/NativeModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CYLINDER_LABEL,
  CYLINDER_SIZE,
  NEPAL_DISTRICTS,
  formatDateTime,
  friendlyError,
  stockLabel,
} from "@/lib/gas";

export const Route = createFileRoute("/_authenticated/dealers")({
  head: () => ({
    meta: [
      { title: "Find a depot - YoGas" },
      {
        name: "description",
        content: "Search verified LPG depots by name or district and join their waitlist.",
      },
      { property: "og:title", content: "Find a depot - YoGas" },
      { property: "og:description", content: "Browse LPG depots and their live cylinder stock." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { depot?: string } =>
    typeof search.depot === "string" ? { depot: search.depot } : {},
  component: DealersPage,
});

const requestSchema = z.object({
  quantity: z.literal(1),
  note: z.string().trim().max(240).optional().or(z.literal("")),
});

type DealerRow = Doc<"dealers"> & { waiting?: number };

function DealersPage() {
  const { depot } = Route.useSearch();
  const { user, profile, sessionToken } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState<string | null>(null);
  const [active, setActive] = useState<DealerRow | null>(null);
  const [form, setForm] = useState({ quantity: "1", note: "" });
  const [busy, setBusy] = useState(false);
  const list = useQuery(
    api.waitlist.listDealers,
    district === null
      ? "skip"
      : {
          district: district && district !== "all" ? district : undefined,
          search: query.trim() || undefined,
        },
  );
  const activeRequests = useQuery(
    api.waitlist.activeForConsumer,
    sessionToken ? { sessionToken } : "skip",
  );
  const scannedDealer = useQuery(api.waitlist.dealerByCode, depot ? { code: depot } : "skip");
  const joinDepot = useMutation(api.waitlist.joinDepot);

  useEffect(() => {
    if (district === null) setDistrict(profile?.district ?? "all");
  }, [profile?.district, district]);

  useEffect(() => {
    if (!depot) return;
    if (scannedDealer === undefined) return;
    if (scannedDealer) setActive(scannedDealer as DealerRow);
    else toast.error("No depot found for that code");
    void navigate({ to: "/dealers", search: {}, replace: true });
  }, [depot, scannedDealer, navigate]);

  const activeDealerIds = useMemo(
    () => new Set((activeRequests ?? []).map((request) => request.dealerId)),
    [activeRequests],
  );
  const hasAllottedRequest = (activeRequests ?? []).some(
    (request) => request.status === "allotted",
  );

  const submit = async () => {
    if (!user || !active) return;
    const parsed = requestSchema.safeParse({
      quantity: 1,
      note: form.note,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your request");
      return;
    }
    setBusy(true);
    try {
      await joinDepot({
        dealerId: active._id as Id<"dealers">,
        sessionToken: sessionToken ?? undefined,
        quantity: parsed.data.quantity,
        cylinderSize: CYLINDER_SIZE,
        note: parsed.data.note || undefined,
      });
      setActive(null);
      setForm({ quantity: "1", note: "" });
      toast.success("You've joined the waitlist");
      void navigate({ to: "/dashboard" });
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      if (/cooling period/i.test(raw)) {
        toast.error(
          profile?.cooldown_until && profile.cooldown_until > Date.now()
            ? `You're cooling down after your last collection. You can request gas again after ${formatDateTime(profile.cooldown_until)}.`
            : "You're cooling down after your last collection - try again later.",
        );
      } else {
        toast.error(friendlyError(error, "Could not join the waitlist"));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Find a depot</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Showing depots in {district && district !== "all" ? district : "every district"} - search
          by name to narrow it down.
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

      {hasAllottedRequest ? (
        <p className="rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
          You already have gas allotted. Collect or cancel it before requesting from another depot.
        </p>
      ) : null}

      {list === undefined ? (
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
            const isQueuedHere = activeDealerIds.has(d._id);
            const disabled = hasAllottedRequest || isQueuedHere;
            return (
              <div key={d._id} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 font-semibold">
                      <Store className="size-4 text-primary" /> {d.businessName}
                    </h2>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-3.5" /> {d.address ? `${d.address}, ` : ""}
                      {d.district}
                    </p>
                    {d.phone ? (
                      <a
                        href={`tel:${d.phone}`}
                        className="mt-1 flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {d.phone}
                      </a>
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

                <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-secondary/60 px-4 py-3 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="font-display text-lg font-bold">{d.stock}</span>
                    <span className="text-muted-foreground">
                      {d.stock === 1 ? "cylinder" : "cylinders"}
                    </span>
                  </span>
                  <span className="ml-auto text-muted-foreground">{d.waiting ?? 0} waiting</span>
                </div>

                <Button
                  className="mt-4 w-full"
                  disabled={disabled}
                  onClick={() => setActive(d)}
                  variant={disabled ? "outline" : "default"}
                >
                  {hasAllottedRequest
                    ? "Collect allotted gas first"
                    : isQueuedHere
                      ? "Already queued here"
                      : "Request a cylinder"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <NativeModal open={Boolean(active)} onOpenChange={(o) => !o && setActive(null)}>
        <NativeModalHeader
          title={`Join ${active?.businessName ?? "depot"}`}
          description="Your name, address and citizenship number will be shared with this depot for verification."
          onClose={() => setActive(null)}
        />
        <div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="rounded-xl bg-secondary/60 px-4 py-3 text-sm">
            <span className="font-medium">Cylinder:</span> {CYLINDER_LABEL} (the only size
            distributed right now)
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input value="1 cylinder" readOnly disabled />
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
      </NativeModal>
    </div>
  );
}
