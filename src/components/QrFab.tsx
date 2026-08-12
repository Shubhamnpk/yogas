import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, QrCode } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { consumerQrValue, depotQrValue } from "@/lib/gas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Floating action button that shows the signed-in person's QR code. */
export function QrFab() {
  const { role, user, profile, dealer } = useAuth();
  const [open, setOpen] = useState(false);

  const isDealer = role === "dealer";
  const value = isDealer
    ? dealer
      ? depotQrValue(dealer.code)
      : null
    : user
      ? consumerQrValue(user.id)
      : null;
  const code = isDealer ? (dealer?.code ?? "") : (profile?.collection_code ?? "");

  if (!value) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied");
    } catch {
      toast.error("Could not copy — write it down instead");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={isDealer ? "Show depot QR code" : "Show my collection QR code"}
        className="fixed bottom-24 right-4 z-50 grid size-14 place-items-center rounded-full bg-flame text-primary-foreground shadow-lift transition-transform hover:scale-105 active:scale-95 md:bottom-8 md:right-8"
      >
        <QrCode className="size-6" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{isDealer ? "Your depot QR" : "Your collection QR"}</DialogTitle>
            <DialogDescription>
              {isDealer
                ? "Consumers scan this to join your depot's waitlist."
                : "Show this at the depot counter to be verified and collect your cylinder."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-2xl bg-white p-4">
              <QRCodeSVG value={value} size={200} level="M" />
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {isDealer ? "Depot code" : "Collection code"}
              </p>
              <p className="font-display text-2xl font-bold tracking-widest">{code || "—"}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => void copy()}>
              <Copy className="size-4" /> Copy code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
