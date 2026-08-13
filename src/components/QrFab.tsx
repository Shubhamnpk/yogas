import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, QrCode, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { consumerQrValue, depotQrValue, parseScanPayload } from "@/lib/gas";
import QrScanner from "@/components/QrScanner";
import { Button } from "@/components/ui/button";
import { NativeModal, NativeModalHeader } from "@/components/NativeModal";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Mode = "scan" | "myqr";

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="grid grid-cols-2 rounded-xl bg-secondary/60 p-1">
      {(["scan", "myqr"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors",
            mode === m
              ? "bg-card text-primary shadow-soft"
              : "text-muted-foreground hover:text-accent-foreground",
          )}
        >
          {m === "scan" ? <ScanLine className="size-4" /> : <QrCode className="size-4" />}
          {m === "scan" ? "Scan QR" : "My QR"}
        </button>
      ))}
    </div>
  );
}

export function QrFab({ open, onOpenChange }: Props) {
  const { role, user, profile, dealer } = useAuth();
  const navigate = useNavigate();
  const [paused, setPaused] = useState(false);
  const [mode, setMode] = useState<Mode>("scan");
  const handled = useRef(false);

  const handleResult = (text: string) => {
    if (handled.current) return;
    const parsed = parseScanPayload(text);
    if (role === "dealer") {
      if (parsed.kind !== "consumer") {
        toast.error(
          parsed.kind === "depot"
            ? "That's the depot's code (for customers to join). Scan the customer's QR from their phone instead."
            : "Couldn't read a consumer code. Show the customer's QR to the camera.",
        );
        return;
      }
      handled.current = true;
      setPaused(true);
      onOpenChange(false);
      void navigate({ to: "/dealer/scan", search: { code: parsed.value } });
      return;
    }

    if (parsed.kind !== "depot") {
      toast.error(
        parsed.kind === "consumer"
          ? "That's a consumer's code. Scan the depot's code at the counter instead."
          : "Couldn't read a depot code. Point the camera at the depot's QR.",
      );
      return;
    }
    handled.current = true;
    setPaused(true);
    onOpenChange(false);
    void navigate({ to: "/dealers", search: { depot: parsed.value } });
  };

  const title = role === "dealer" ? "Scan a consumer code" : "Scan a depot code";
  const description =
    role === "dealer"
      ? "Use the camera to open a consumer record, or show your own depot QR."
      : "Use the camera to jump into a depot's waitlist, or show your own collection QR.";

  const isDealer = role === "dealer";
  const myCode = isDealer ? (dealer?.code ?? "") : (profile?.collection_code ?? "");
  const myQrValue = isDealer
    ? dealer
      ? depotQrValue(dealer.code)
      : null
    : user
      ? consumerQrValue(user.accountId)
      : null;

  const copyMyCode = async () => {
    if (!myCode) return;
    try {
      await navigator.clipboard.writeText(myCode);
      toast.success("Code copied");
    } catch {
      toast.error("Could not copy - write it down instead");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label="Scan QR code"
        className="fixed bottom-8 right-8 z-50 hidden size-14 place-items-center rounded-full bg-flame text-primary-foreground shadow-lift transition-transform hover:scale-105 active:scale-95 md:grid"
      >
        <ScanLine className="size-6" />
      </button>
      <NativeModal
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (next) {
            handled.current = false;
            setMode("scan");
          }
          if (!next) setPaused(false);
        }}
        contentClassName="w-[calc(100vw-1rem)] sm:max-w-md lg:max-w-xl"
      >
        <NativeModalHeader
          title={mode === "scan" ? title : "Your QR code"}
          description={
            mode === "scan"
              ? description
              : `Show this to ${role === "dealer" ? "consumers so they can join your queue" : "your depot to verify you."}`
          }
          onClose={() => onOpenChange(false)}
        />
        <div className="px-4 sm:px-6">
          <div className="py-2">
            <ModeToggle mode={mode} onChange={setMode} />
          </div>

          {mode === "scan" ? (
            <div className="space-y-3">
              <QrScanner onResult={handleResult} paused={paused || !open} />
              <p className="text-center text-xs text-muted-foreground">
                Point the camera at the QR code and wait for it to lock on.
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {myQrValue ? (
                <div className="mx-auto w-fit rounded-2xl bg-white p-4">
                  <QRCodeSVG value={myQrValue} size={164} level="M" />
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Your QR code is not ready yet.
                </p>
              )}
              {myCode ? (
                <div className="rounded-xl bg-secondary/60 px-4 py-3 text-center">
                  <p className="font-display text-2xl font-bold tracking-widest">{myCode}</p>
                  <Button
                    variant="outline"
                    className="mt-3 w-full"
                    onClick={() => void copyMyCode()}
                  >
                    <Copy className="size-4" /> Copy code
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </NativeModal>
    </>
  );
}

export function ScanFabTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Scan QR code"
      className="grid size-14 place-items-center rounded-full bg-flame text-primary-foreground shadow-lift transition-transform hover:scale-105 active:scale-95"
    >
      <ScanLine className="size-6" />
    </button>
  );
}
