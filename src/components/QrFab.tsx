import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ScanLine } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { parseScanPayload } from "@/lib/gas";
import QrScanner from "@/components/QrScanner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function QrFab({ open, onOpenChange }: Props) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [paused, setPaused] = useState(false);
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
      ? "Use the camera to open a consumer record in the verification screen."
      : "Use the camera to jump straight into a depot's waitlist.";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) handled.current = false;
        if (!next) setPaused(false);
      }}
    >
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label="Scan QR code"
        className="fixed bottom-8 right-8 z-50 hidden size-14 place-items-center rounded-full bg-flame text-primary-foreground shadow-lift transition-transform hover:scale-105 active:scale-95 md:grid"
      >
        <ScanLine className="size-6" />
      </button>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md lg:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <QrScanner onResult={handleResult} paused={paused || !open} />
          <p className="text-center text-xs text-muted-foreground">
            Point the camera at the QR code and wait for it to lock on.
          </p>
        </div>
      </DialogContent>
    </Dialog>
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
