import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, QrCode, Search, Store, Ticket, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import {
  consumerQrValue,
  formatDateTime,
  maskCitizenship,
  timeAgo,
  type EntryStatus,
} from "@/lib/gas";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your queue — GasQueue" },
      { name: "description", content: "Track your LPG cylinder requests and queue positions." },
      { property: "og:title", content: "Your queue — GasQueue" },
      { property: "og:description", content: "Live LPG waitlist status for your household." },
    ],
  }),
  component: ConsumerDashboard,
});

type Row = {
  id: string;
  status: EntryStatus;
  quantity: number;
  cylinder_size: string;
  note: string | null;
  created_at: string;
  allotted_at: string | null;
  dealer: { business_name: string; district: string; address: string | null; phone: string | null } | null;
  position?: number | null;
};

function ConsumerDashboard() {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("waitlist_entries")
      .select(
        "id, status, quantity, cylinder_size, note, created_at, allotted_at, dealer:dealers(business_name, district, address, phone)",
      )
      .eq("consumer_id", user.id)
      .order("created_at", { ascending: false });

    const list = (data as unknown as Row[]) ?? [];
    const withPos = await Promise.all(
      list.map(async (r) => {
        if (r.status !== "waiting") return r;
        const { data: pos } = await supabase.rpc("queue_position", { _entry_id: r.id });
        return { ...r, position: (pos as number | null) ?? null };
      }),
    );
    setRows(withPos);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
    if (!user) return;
    const channel = supabase
      .channel("my-entries")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "waitlist_entries",
          filter: `consumer_id=eq.${user.id}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, load]);

  const cancel = async (id: string) => {
    const { error } = await supabase.rpc("cancel_entry", { _entry_id: id });
    if (error) toast.error(error.message);
    else {
      toast.success("Request cancelled");
      void load();
    }
  };

  const active = rows.filter((r) => r.status === "waiting" || r.status === "allotted");
  const past = rows.filter((r) => r.status === "collected" || r.status === "cancelled");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Namaste, {profile?.full_name?.split(" ")[0] ?? "friend"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {active.length > 0
              ? `You have ${active.length} active request${active.length > 1 ? "s" : ""}.`
              : "You're not in any queue right now."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/scan">
              <QrCode className="size-4" /> Scan depot
            </Link>
          </Button>
          <Button asChild>
            <Link to="/dealers">
              <Search className="size-4" /> Find a depot
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {loading ? (
            <div className="grid h-40 place-items-center rounded-2xl border border-border bg-card">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : active.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <Ticket className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">No active requests</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Scan a depot's QR code or search for one nearby to join its waitlist.
              </p>
              <Button asChild className="mt-5">
                <Link to="/dealers">Browse depots</Link>
              </Button>
            </div>
          ) : (
            active.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Store className="size-4 text-primary" />
                      <h2 className="font-semibold">{r.dealer?.business_name ?? "Depot"}</h2>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {r.dealer?.district} · requested {timeAgo(r.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-secondary/60 p-4 text-center">
                  <Stat
                    label={r.status === "waiting" ? "Your position" : "Status"}
                    value={
                      r.status === "waiting"
                        ? r.position
                          ? `#${r.position}`
                          : "—"
                        : "Ready"
                    }
                  />
                  <Stat label="Cylinder" value={r.cylinder_size.split(" ")[0] ?? "—"} />
                  <Stat label="Quantity" value={String(r.quantity)} />
                </div>

                {r.status === "allotted" ? (
                  <p className="mt-4 rounded-xl bg-accent px-4 py-3 text-sm font-medium text-accent-foreground">
                    Allotted {r.allotted_at ? formatDateTime(r.allotted_at) : ""}. Show your QR code
                    at {r.dealer?.business_name} to collect.
                  </p>
                ) : null}

                {r.note ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Your note:</span> {r.note}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {r.dealer?.phone ? <span>Call: {r.dealer.phone}</span> : null}
                  {r.dealer?.address ? <span>· {r.dealer.address}</span> : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-destructive hover:text-destructive"
                    onClick={() => void cancel(r.id)}
                  >
                    <X className="size-4" /> Cancel
                  </Button>
                </div>
              </div>
            ))
          )}

          {past.length > 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold">History</h2>
              <ul className="mt-4 divide-y divide-border">
                {past.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium">{r.dealer?.business_name}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
          <h2 className="font-semibold">Your collection code</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The dealer scans this to verify you.
          </p>
          <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-4">
            {user ? <QRCodeSVG value={consumerQrValue(user.id)} size={168} level="M" /> : null}
          </div>
          <p className="mt-4 text-sm font-semibold">{profile?.full_name}</p>
          <p className="text-xs text-muted-foreground">
            Citizenship {maskCitizenship(profile?.citizenship_no)}
          </p>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
