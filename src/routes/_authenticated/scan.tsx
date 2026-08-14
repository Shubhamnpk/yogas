import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { QrCode } from "lucide-react";
import { toast } from "sonner";
import QrScanner from "@/components/QrScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseScanPayload } from "@/lib/gas";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Scan a depot - YoGas" },
      { name: "description", content: "Scan a depot QR code to join its LPG waitlist instantly." },
      { property: "og:title", content: "Scan a depot - YoGas" },
      { property: "og:description", content: "Point your camera at the depot's code to join." },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const handled = useRef(false);

  const go = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    void navigate({ to: "/dealers", search: { depot: clean.toUpperCase() } });
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <QrCode className="size-6" />
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold">Scan a depot code</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Point your camera at the QR code displayed at the depot counter.
        </p>
      </div>

      <QrScanner
        onResult={(text) => {
          if (handled.current) return;
          const parsed = parseScanPayload(text);
          if (parsed.kind === "consumer") {
            toast.error("That's a consumer code. Scan the depot's code instead.");
            return;
          }
          handled.current = true;
          go(parsed.value);
        }}
      />

      <div className="rounded-2xl border border-border bg-card p-6">
        <Label htmlFor="code">Or enter the depot code</Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. KTM-4821"
            maxLength={20}
          />
          <Button onClick={() => go(code)}>Go</Button>
        </div>
      </div>
    </div>
  );
}
