import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Loader2, MapPin, Search, Store } from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth, sessionArgs } from "@/lib/auth";
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
import { formatNumber } from "@/lib/i18n";

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
    typeof search["depot"] === "string" ? { depot: search["depot"] } : {},
  component: DealersPage,
});

const requestSchema = z.object({
  quantity: z.literal(1),
  note: z.string().trim().max(240).optional().or(z.literal("")),
});

type DealerRow = {
  _id: Id<"dealers">;
  businessName: string;
  district: string;
  address: string | null;
  phone: string | null;
  stock: number;
  code: string;
  waiting?: number;
};

function DealersPage() {
  const { t } = useTranslation();
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
          ...(district && district !== "all" ? { district } : {}),
          ...(query.trim() ? { search: query.trim() } : {}),
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
    else toast.error(t("dealers:noDepotFound"));
    void navigate({ to: "/dealers", search: {}, replace: true });
  }, [depot, scannedDealer, navigate, t]);

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
      toast.error(parsed.error.issues[0]?.message ?? t("dealers:checkYourRequest"));
      return;
    }
    setBusy(true);
    try {
      await joinDepot({
        dealerId: active._id as Id<"dealers">,
        ...sessionArgs(sessionToken),
        quantity: parsed.data.quantity,
        cylinderSize: CYLINDER_SIZE,
        ...(parsed.data.note ? { note: parsed.data.note } : {}),
      });
      setActive(null);
      setForm({ quantity: "1", note: "" });
      toast.success(t("dealers:joinedWaitlist"));
      void navigate({ to: "/dashboard" });
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      if (/cooling period/i.test(raw)) {
        toast.error(
          profile?.cooldown_until && profile.cooldown_until > Date.now()
            ? t("dealers:cooldownUntil", { date: formatDateTime(profile.cooldown_until) })
            : t("dealers:cooldownRetryLater"),
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
        <h1 className="font-display text-3xl font-bold">{t("dealers:findDepot")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dealers:showingDepotsIn", {
            district: district && district !== "all" ? district : t("dealers:everyDistrict"),
          })}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("dealers:searchDepotName")}
            className="pl-9"
            maxLength={60}
          />
        </div>
        <Select value={district ?? "all"} onValueChange={setDistrict}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder={t("dealers:allDistricts")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("dealers:allDistricts")}</SelectItem>
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
          {t("dealers:alreadyAllotted")}
        </p>
      ) : null}

      {list === undefined ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {district && district !== "all"
              ? t("dealers:noDepotsMatchIn", { district })
              : t("dealers:noDepotsMatch")}
          </p>
          {district && district !== "all" ? (
            <Button variant="outline" className="mt-4" onClick={() => setDistrict("all")}>
              {t("dealers:searchAllDistricts")}
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
                    {t(s.key)}
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-secondary/60 px-4 py-3 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="font-display text-lg font-bold">{formatNumber(d.stock)}</span>
                    <span className="text-muted-foreground">
                      {t("dealers:cylinders", { count: d.stock })}
                    </span>
                  </span>
                  <span className="ml-auto text-muted-foreground">
                    {t("dealers:waiting", { count: formatNumber(d.waiting ?? 0) })}
                  </span>
                </div>

                <Button
                  className="mt-4 w-full"
                  disabled={disabled}
                  onClick={() => setActive(d)}
                  variant={disabled ? "outline" : "default"}
                >
                  {hasAllottedRequest
                    ? t("dealers:collectAllottedFirst")
                    : isQueuedHere
                      ? t("dealers:alreadyQueuedHere")
                      : t("dealers:requestCylinder")}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <NativeModal open={Boolean(active)} onOpenChange={(o) => !o && setActive(null)}>
        <NativeModalHeader
          title={t("dealers:joinDepot", { name: active?.businessName ?? t("dealers:depot") })}
          description={t("dealers:joinShareInfo")}
          onClose={() => setActive(null)}
        />
        <div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="rounded-xl bg-secondary/60 px-4 py-3 text-sm">
            <span className="font-medium">{t("common:cylinder")}:</span> {CYLINDER_LABEL} (
            {t("dealers:onlySizeDistributed")})
          </div>
          <div className="space-y-2">
            <Label>{t("dealers:quantity")}</Label>
            <Input value={t("dealers:oneCylinder")} readOnly disabled />
          </div>
          <div className="space-y-2">
            <Label>{t("dealers:noteForDealerOptional")}</Label>
            <Textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={3}
              maxLength={240}
              placeholder={t("dealers:notePlaceholder")}
            />
          </div>
          <Button className="w-full" onClick={() => void submit()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} {t("dealers:joinWaitlist")}
          </Button>
        </div>
      </NativeModal>
    </div>
  );
}
