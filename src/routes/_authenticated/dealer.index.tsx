import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Loader2, PackageCheck, Users, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { depotQrValue, maskCitizenship, timeAgo, type EntryStatus } from "@/lib/gas";

export const Route = createFileRoute("/_authenticated/dealer/")({
  head: () => ({
    meta: [
      { title: "Depot queue — GasQueue" },
      { name: "description", content: "Manage your depot's LPG waitlist and allot cylinders." },
      { property: "og:title", content: "Depot queue — GasQueue" },
      { property: "og:description", content: "Allot cylinders fairly, in queue order." },
    ],
  }),
  component: DealerQueue,
});

type Entry = {
  id: string;
  status: EntryStatus;
  quantity: number;
  cylinder_size: string;
  note: string | null;
  created_at: string;
  consumer: {
    full_name: string | null;
    citizenship_no: string | null;
    address: string | null;
    phone: string | null;
  } | null;
};

function DealerQueue() {
  const { dealer, refresh } = useAuth();
  const [rows, setRows] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!dealer) return;
    const { data } = await supabase
      .from("waitlist_entries")
      .select(
        "id, status, quantity, cylinder_size, note, created_at, consumer:profiles(full_name, citizenship_no, address, phone)",
      )
      .eq("dealer_id", dealer.id)
      .in("status", ["waiting", "allotted"])
      .order("created_at", { ascending: true });
    setRows((data as unknown as Entry[]) ?? []);
    setLoading(false);
  }, [dealer]);

  useEffect(() => {
    void load();
    if (!dealer) return;
    const channel = supabase
      .channel("depot-queue")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "waitlist_entries",
          filter: `dealer_id=eq.${dealer.id}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [dealer, load]);

  const act = async (fn: "allot_entry" | "collect_entry" | "cancel_entry", id: string) => {
    setBusyId(id);
    const { error } = await supabase.rpc(fn, { _entry_id: id });
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      fn === "allot_entry" ? "Cylinder allotted" : fn === "collect_entry" ? "Marked collected" : "Request removed",
    );
    void load();
    void refresh();
  };

  const waiting = rows.filter((r) => r.status === "waiting");
  const allotted = rows.filter((r) => r.status === "allotted");

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Cylinders in stock" value={dealer?.stock ?? 0} icon={PackageCheck} />
        <StatCard label="Waiting in queue" value={waiting.length} icon={Users} />
        <StatCard label="Awaiting pickup" value={allotted.length} icon={Check} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Section title={`Waiting (${waiting.length})`}>
            {loading ? (
              <Loader2 className="mx-auto my-8 size-5 animate-spin text-primary" />
            ) : waiting.length === 0 ? (
              <Empty text="Nobody is waiting right now." />
            ) : (
              waiting.map((e, i) => (
                <EntryRow
                  key={e.id}
                  entry={e}
                  index={i + 1}
                  busy={busyId === e.id}
                  outOfStock={(dealer?.stock ?? 0) < e.quantity}
                  onAllot={() => void act("allot_entry", e.id)}
                  onCancel={() => void act("cancel_entry", e.id)}
                />
              ))
            )}
          </Section>

          <Section title={`Ready for pickup (${allotted.length})`}>
            {allotted.length === 0 ? (
              <Empty text="No allotted cylinders waiting for collection." />
            ) : (
              allotted.map((e) => (
                <EntryRow
                  key={e.id}
                  entry={e}
                  busy={busyId === e.id}
                  onCollect={() => void act("collect_entry", e.id)}
                  onCancel={() => void act("cancel_entry", e.id)}
                />
              ))
            )}
          </Section>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
          <h2 className="font-semibold">Your depot code</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Print this. Consumers scan it to join your queue.
          </p>
          <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-4">
            {dealer ? <QRCodeSVG value={depotQrValue(dealer.code)} size={168} level="M" /> : null}
          </div>
          <p className="mt-4 font-display text-lg font-bold tracking-wide">{dealer?.code}</p>
          <p className="text-xs text-muted-foreground">{dealer?.business_name}</p>
        </aside>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="size-4" />
      </span>
      <p className="mt-3 font-display text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-semibold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function EntryRow({
  entry,
  index,
  busy,
  outOfStock,
  onAllot,
  onCollect,
  onCancel,
}: {
  entry: Entry;
  index?: number;
  busy: boolean;
  outOfStock?: boolean;
  onAllot?: () => void;
  onCollect?: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-start gap-3">
        {index ? (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary font-display text-sm font-bold">
            {index}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{entry.consumer?.full_name ?? "Consumer"}</p>
          <p className="text-xs text-muted-foreground">
            Citizenship {maskCitizenship(entry.consumer?.citizenship_no)} ·{" "}
            {entry.consumer?.address ?? "No address"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {entry.quantity} × {entry.cylinder_size} · {timeAgo(entry.created_at)}
          </p>
          {entry.note ? (
            <p className="mt-2 rounded-lg bg-secondary/60 px-3 py-2 text-sm">{entry.note}</p>
          ) : null}
        </div>
        <StatusBadge status={entry.status} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {onAllot ? (
          <Button size="sm" onClick={onAllot} disabled={busy || outOfStock}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {outOfStock ? "Not enough stock" : "Allot cylinder"}
          </Button>
        ) : null}
        {onCollect ? (
          <Button size="sm" onClick={onCollect} disabled={busy}>
            <PackageCheck className="size-4" /> Mark collected
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={onCancel}
          disabled={busy}
        >
          <X className="size-4" /> Remove
        </Button>
      </div>
    </div>
  );
}
