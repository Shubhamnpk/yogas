import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, Loader2, PackageCheck, ScanLine, UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/lib/auth";
import QrScanner from "@/components/QrScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import {
  formatDateTime,
  friendlyError,
  maskCitizenship,
  parseScanPayload,
  type EntryStatus,
} from "@/lib/gas";

export const Route = createFileRoute("/_authenticated/dealer/scan")({
  validateSearch: (search: Record<string, unknown>): { code?: string } =>
    typeof search["code"] === "string" ? { code: search["code"] } : {},
  head: () => ({
    meta: [
      { title: "Verify a consumer - YoGas" },
      {
        name: "description",
        content: "Scan a consumer's QR code to check their queue status and hand over a cylinder.",
      },
      { property: "og:title", content: "Verify a consumer - YoGas" },
      { property: "og:description", content: "Instant verification at your depot counter." },
    ],
  }),
  component: DealerScan,
});

type Overview = {
  consumer: {
    fullName: string | undefined;
    citizenshipNo: string | undefined;
    address: string | undefined;
    phone: string | undefined;
    totalPurchasedQuantity: number;
    lastCollectedAt: number | null;
    cooldownUntil: number | null;
  } | null;
  activeEntry: {
    _id: Id<"waitlistEntries">;
    status: EntryStatus;
    quantity: number;
    cylinderSize: string;
    note: string | undefined;
    createdAt: number;
    allottedAt: number | undefined;
    consumer:
      | {
          fullName: string | undefined;
          citizenshipNo: string | undefined;
          address: string | undefined;
          phone: string | undefined;
          totalPurchasedQuantity: number;
          lastCollectedAt: number | null;
          cooldownUntil: number | null;
        }
      | undefined;
  } | null;
  totalQuantity: number;
  totalPurchases: number;
  recent: Array<{
    _id: string;
    dealerId: Id<"dealers">;
    quantity: number;
    cylinderSize: string;
    collectedAt: number | undefined;
    dealer: {
      businessName: string;
      district: string;
    } | null;
  }>;
};

function DealerScan() {
  const { dealer, user, sessionToken } = useAuth();
  const { code } = Route.useSearch();
  const allotEntry = useMutation(api.waitlist.allotEntry);
  const collectEntry = useMutation(api.waitlist.collectEntry);
  const addConsumerToQueue = useMutation(api.waitlist.addConsumerToQueue);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [manual, setManual] = useState("");
  const [targetAccountId, setTargetAccountId] = useState<string | null>(null);

  const resolvedManualAccount = useQuery(
    api.app.accountByCollectionCode,
    manual.trim() ? { code: manual.trim().toUpperCase() } : "skip",
  );
  const overview = useQuery(
    api.waitlist.consumerOverviewForDealer,
    dealer && targetAccountId
      ? sessionToken
        ? { sessionToken, dealerId: dealer.id, accountId: targetAccountId as Id<"accounts"> }
        : { dealerId: dealer.id, accountId: targetAccountId as Id<"accounts"> }
      : "skip",
  ) as Overview | null | undefined;

  const appliedCodeRef = useRef(false);
  useEffect(() => {
    if (appliedCodeRef.current) return;
    if (!code) return;
    appliedCodeRef.current = true;
    setTargetAccountId(code);
  }, [code]);

  useEffect(() => {
    if (resolvedManualAccount === undefined) return;
    if (resolvedManualAccount === null) {
      setNotFound(true);
      return;
    }
    setTargetAccountId(resolvedManualAccount);
    setManual("");
  }, [resolvedManualAccount]);

  useEffect(() => {
    if (overview === undefined || !targetAccountId) return;
    setNotFound(overview === null);
  }, [overview, targetAccountId]);

  const lookup = (consumerId: string) => {
    setNotFound(false);
    setTargetAccountId(consumerId);
  };

  const lastInvalidAt = useRef(0);
  const onResult = (text: string) => {
    const parsed = parseScanPayload(text);
    if (parsed.kind === "depot") {
      const now = Date.now();
      if (now - lastInvalidAt.current > 2000) {
        lastInvalidAt.current = now;
        toast.error("That is a depot code. Scan the consumer's code.");
      }
      return;
    }
    if (parsed.kind !== "consumer") return;
    lookup(parsed.value);
  };

  const act = async (fn: "allot" | "collect") => {
    if (!overview?.activeEntry || !dealer || !user) return;
    setBusy(true);
    try {
      if (fn === "allot") {
        await allotEntry(
          sessionToken
            ? { sessionToken, entryId: overview.activeEntry._id }
            : { ownerAccountId: user.accountId, entryId: overview.activeEntry._id },
        );
      } else {
        if (
          !window.confirm(
            "Confirm handover as the dealer? (The customer can also confirm on their device.)",
          )
        )
          return;
        await collectEntry(
          sessionToken
            ? { sessionToken, entryId: overview.activeEntry._id }
            : { ownerAccountId: user.accountId, entryId: overview.activeEntry._id },
        );
      }
      toast.success(
        fn === "allot"
          ? "Cylinder allotted — ask the customer to confirm on their device"
          : "Handover complete",
      );
      if (fn === "collect") setTargetAccountId(null);
    } catch (error) {
      toast.error(friendlyError(error, "Could not update request"));
    } finally {
      setBusy(false);
    }
  };

  const manualLookup = async () => {
    const code = manual.trim().toUpperCase();
    if (code.length < 4) {
      toast.error("Enter the consumer's collection code");
      return;
    }
    setTargetAccountId(null);
    setManual(code);
  };

  const addToQueueAction = async () => {
    if (!targetAccountId || !user) return;
    setAddBusy(true);
    try {
      await addConsumerToQueue(
        sessionToken
          ? { sessionToken, consumerAccountId: targetAccountId as Id<"accounts"> }
          : {
              ownerAccountId: user.accountId,
              consumerAccountId: targetAccountId as Id<"accounts">,
            },
      );
      toast.success("Added to your waitlist — they're now in the queue");
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      if (/cooldown/i.test(raw)) {
        const until = overview?.consumer?.cooldownUntil ?? 0;
        toast.error(
          until > Date.now()
            ? `This customer is still cooling down — they can rejoin after ${formatDateTime(until)}.`
            : "This customer is still in their cooldown period.",
        );
      } else {
        toast.error(friendlyError(error, "Could not add to waitlist"));
      }
    } finally {
      setAddBusy(false);
    }
  };

  const consumer = overview?.consumer ?? null;
  const activeEntry = overview?.activeEntry ?? null;
  const recentHere = (overview?.recent ?? []).filter((r) => r.dealerId === dealer?.id);
  const latestCollectedHere = recentHere[0];
  const coolingDown =
    Boolean(consumer?.cooldownUntil) && (consumer?.cooldownUntil ?? 0) > Date.now();

  const resetScan = () => {
    setNotFound(false);
    setTargetAccountId(null);
    setManual("");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <ScanLine className="size-6" />
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold">Verify a consumer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan the consumer code to see the active queue entry, cooldown status, and recent sales.
        </p>
      </div>

      {targetAccountId ? (
        <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm font-medium">
            Scan complete — review the result below, then scan the next customer.
          </p>
          <Button variant="outline" size="sm" onClick={resetScan}>
            <ScanLine className="size-4" /> Scan again
          </Button>
        </div>
      ) : null}

      {!targetAccountId ? (
        <>
          <QrScanner onResult={onResult} />

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="text-sm font-medium">Camera not working?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Type the collection code printed on the consumer's profile.
            </p>
            <div className="mt-3 flex gap-2">
              <Input
                value={manual}
                onChange={(e) => setManual(e.target.value.toUpperCase())}
                placeholder="e.g. 7KQ4M2"
                maxLength={12}
                className="tracking-widest"
              />
              <Button variant="outline" onClick={() => void manualLookup()} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null} Look up
              </Button>
            </div>
          </div>
        </>
      ) : null}

      {notFound ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <UserX className="mx-auto size-7 text-destructive" />
          <p className="mt-3 font-semibold">Not in your queue</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This person has no active request at your depot. Their profile history may still be
            visible below.
          </p>
        </div>
      ) : null}

      {overview ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-bold">{consumer?.fullName ?? "Consumer"}</p>
              <p className="text-xs text-muted-foreground">
                Citizenship {maskCitizenship(consumer?.citizenshipNo)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {consumer?.address ?? "No address"}
              </p>
              {consumer?.phone ? (
                <p className="text-sm text-muted-foreground">{consumer.phone}</p>
              ) : null}
              <p className="mt-1 text-sm text-muted-foreground">
                Total purchased {consumer?.totalPurchasedQuantity ?? 0} cylinders
              </p>
              {consumer?.lastCollectedAt ? (
                <p className="text-sm text-muted-foreground">
                  Last collected {formatDateTime(consumer.lastCollectedAt)}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-2">
              {activeEntry ? (
                <StatusBadge status={activeEntry.status} />
              ) : latestCollectedHere ? (
                <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success ring-1 ring-inset ring-success/30">
                  Already collected
                </span>
              ) : null}
              {consumer?.cooldownUntil && consumer.cooldownUntil > Date.now() ? (
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  Cooldown active
                </span>
              ) : null}
            </div>
          </div>

          {activeEntry ? (
            <>
              <div className="mt-5 rounded-xl bg-secondary/60 p-4 text-sm">
                <p>
                  <span className="font-medium">Request:</span> {activeEntry.quantity} x{" "}
                  {activeEntry.cylinderSize}
                </p>
                <p className="mt-1 text-muted-foreground">
                  Joined {formatDateTime(activeEntry.createdAt)}
                  {activeEntry.allottedAt
                    ? ` - allotted ${formatDateTime(activeEntry.allottedAt)}`
                    : ""}
                </p>
                {activeEntry.note ? <p className="mt-2">Note: {activeEntry.note}</p> : null}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {activeEntry.status === "waiting" ? (
                  <Button
                    className="flex-1"
                    onClick={() => void act("allot")}
                    disabled={busy || (dealer?.stock ?? 0) < activeEntry.quantity}
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    {(dealer?.stock ?? 0) < activeEntry.quantity ? "Not enough stock" : "Allot gas"}
                  </Button>
                ) : (
                  <Button className="flex-1" onClick={() => void act("collect")} disabled={busy}>
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <PackageCheck className="size-4" />
                    )}
                    Confirm handover
                  </Button>
                )}
                <Button variant="outline" onClick={resetScan}>
                  Scan again
                </Button>
              </div>

              {activeEntry.status === "allotted" ? (
                <div className="mt-3 rounded-xl border border-success/30 bg-success/10 p-3 text-sm">
                  <p className="font-medium text-success">Waiting for customer confirmation</p>
                  <p className="mt-1 text-muted-foreground">
                    The customer now sees "Confirm collection" in their app — the cylinder is
                    transferred the moment they confirm. Use "Confirm handover" above if they're not
                    carrying their device.
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-border p-4 text-sm">
              {latestCollectedHere ? (
                <div>
                  <p className="font-semibold text-success">Already collected at this depot</p>
                  <p className="mt-1 text-muted-foreground">
                    {latestCollectedHere.quantity} x {latestCollectedHere.cylinderSize} handed over
                    {latestCollectedHere.collectedAt
                      ? ` on ${formatDateTime(latestCollectedHere.collectedAt)}`
                      : ""}
                    .
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No active queue entry at this depot, but the person's history is shown below.
                </p>
              )}
              {coolingDown ? (
                <p className="mt-2 text-muted-foreground">
                  This customer is cooling down until{" "}
                  {consumer?.cooldownUntil ? formatDateTime(consumer.cooldownUntil) : "later"} —
                  they cannot rejoin yet.
                </p>
              ) : (
                <Button
                  className="mt-3"
                  size="sm"
                  onClick={() => void addToQueueAction()}
                  disabled={addBusy}
                >
                  {addBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UserPlus className="size-4" />
                  )}
                  Add to waitlist
                </Button>
              )}
            </div>
          )}

          {overview.recent.length > 0 ? (
            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">Recent purchases</p>
                <p className="text-xs text-muted-foreground">
                  {overview.totalPurchases} completed purchase
                  {overview.totalPurchases === 1 ? "" : "s"}
                </p>
              </div>
              <div className="mt-3 space-y-2">
                {overview.recent.map((row) => (
                  <div
                    key={row._id}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{row.dealer?.businessName ?? "Depot"}</p>
                      <span className="text-xs text-muted-foreground">
                        {row.collectedAt ? formatDateTime(row.collectedAt) : "Collected"}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      {row.quantity} x {row.cylinderSize}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
