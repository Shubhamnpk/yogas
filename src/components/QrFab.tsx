import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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

  const handleResult = (text: string) => {
    const parsed = parseScanPayload(text);
    if (role === "dealer") {
      if (parsed.kind !== "consumer") {
        toast.error("Scan a consumer code here.");
        return;
      }
      setPaused(true);
      onOpenChange(false);
      void navigate({ to: "/dealer/scan", search: { code: parsed.value } });
      return;
    }

    if (parsed.kind !== "depot") {
      toast.error("Scan a depot code here.");
      return;
    }
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
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-sm">
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
