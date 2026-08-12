import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Check, Loader2, PackageCheck, ScanLine, UserX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import QrScanner from "@/components/QrScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime, maskCitizenship, parseScanPayload, type EntryStatus } from "@/lib/gas";

export const Route = createFileRoute("/_authenticated/dealer/scan")({
  head: () => ({
    meta: [
      { title: "Verify a consumer — GasQueue" },
      {
        name: "description",
        content: "Scan a consumer's QR code to check their queue status and hand over a cylinder.",
      },
      { property: "og:title", content: "Verify a consumer — GasQueue" },
      { property: "og:description", content: "Instant verification at your depot counter." },
    ],
  }),
  component: DealerScan,
});

type Found = {
  id: string;
  status: EntryStatus;
  quantity: number;
  cylinder_size: string;
  note: string | null;
  created_at: string;
  allotted_at: string | null;
  consumer: {
    full_name: string | null;
    citizenship_no: string | null;
    address: string | null;
    phone: string | null;
  } | null;
};

function DealerScan() {
  const { dealer, refresh } = useAuth();
  const [result, setResult] = useState<Found | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState("");


  const lookup = useCallback(
    async (consumerId: string) => {
      if (!dealer) return;
      setNotFound(false);
      setResult(null);
      const { data } = await supabase
        .from("waitlist_entries")
        .select(
          "id, status, quantity, cylinder_size, note, created_at, allotted_at, consumer:profiles(full_name, citizenship_no, address, phone)",
        )
        .eq("dealer_id", dealer.id)
        .eq("consumer_id", consumerId)
        .in("status", ["waiting", "allotted"])
        .maybeSingle();
      if (!data) setNotFound(true);
      else setResult(data as unknown as Found);
    },
    [dealer],
  );

  const onResult = useCallback(
    (text: string) => {
      const parsed = parseScanPayload(text);
      if (parsed.kind === "depot") {
        toast.error("That's a depot code. Scan the consumer's code.");
        return;
      }
      void lookup(parsed.value);
    },
    [lookup],
  );

  const act = async (fn: "allot_entry" | "collect_entry") => {
    if (!result) return;
    setBusy(true);
    const { error } = await supabase.rpc(fn, { _entry_id: result.id });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(fn === "allot_entry" ? "Cylinder allotted" : "Handover complete");
    setResult(null);
    void refresh();
  };

  const manualLookup = async () => {
    const code = manual.trim().toUpperCase();
    if (code.length < 4) {
      toast.error("Enter the consumer's collection code");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("consumer_id_by_code", { _code: code });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data) {
      setResult(null);
      setNotFound(true);
      return;
    }
    setManual("");
    await lookup(data as string);
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <ScanLine className="size-6" />
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold">Verify a consumer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan their code to see whether they're in your queue and what they've been allotted.
        </p>
      </div>

      <QrScanner onResult={onResult} paused={Boolean(result)} />

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


      {notFound ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <UserX className="mx-auto size-7 text-destructive" />
          <p className="mt-3 font-semibold">Not in your queue</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This person has no active request at your depot. Ask them to join the waitlist first.
          </p>
        </div>
      ) : null}

      {result ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-bold">
                {result.consumer?.full_name ?? "Consumer"}
              </p>
              <p className="text-xs text-muted-foreground">
                Citizenship {maskCitizenship(result.consumer?.citizenship_no)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.consumer?.address ?? "No address"}
              </p>
              {result.consumer?.phone ? (
                <p className="text-sm text-muted-foreground">{result.consumer.phone}</p>
              ) : null}
            </div>
            <StatusBadge status={result.status} />
          </div>

          <div className="mt-5 rounded-xl bg-secondary/60 p-4 text-sm">
            <p>
              <span className="font-medium">Request:</span> {result.quantity} ×{" "}
              {result.cylinder_size}
            </p>
            <p className="mt-1 text-muted-foreground">
              Joined {formatDateTime(result.created_at)}
              {result.allotted_at ? ` · allotted ${formatDateTime(result.allotted_at)}` : ""}
            </p>
            {result.note ? <p className="mt-2">Note: {result.note}</p> : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {result.status === "waiting" ? (
              <Button
                className="flex-1"
                onClick={() => void act("allot_entry")}
                disabled={busy || (dealer?.stock ?? 0) < result.quantity}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {(dealer?.stock ?? 0) < result.quantity ? "Not enough stock" : "Allot & hand over"}
              </Button>
            ) : (
              <Button className="flex-1" onClick={() => void act("collect_entry")} disabled={busy}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <PackageCheck className="size-4" />
                )}
                Confirm handover
              </Button>
            )}
            <Button variant="outline" onClick={() => setResult(null)}>
              Scan next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
