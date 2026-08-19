import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, QrCode, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
          {m === "scan" ? t("common:scanQr") : t("common:myQr")}
        </button>
      ))}
    </div>
  );
}

export function QrFab({ open, onOpenChange }: Props) {
  const { role, user, profile, dealer } = useAuth();
  const { t } = useTranslation();
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
            ? t("common:scanDepotCodeWarning")
            : t("common:scanConsumerReadError"),
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
          ? t("common:scanConsumerCodeWrong")
          : t("common:scanDepotReadError"),
      );
      return;
    }
    handled.current = true;
    setPaused(true);
    onOpenChange(false);
    void navigate({ to: "/dealers", search: { depot: parsed.value } });
  };

  const title = role === "dealer" ? t("common:scanConsumerTitle") : t("common:scanDepotTitle");
  const description =
    role === "dealer" ? t("common:scanDealerDescription") : t("common:scanConsumerDescription");

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
      toast.success(t("common:codeCopied"));
    } catch {
      toast.error(t("common:copyFailed"));
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label={t("common:scan")}
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
          title={mode === "scan" ? title : t("common:myQr")}
          description={
            mode === "scan"
              ? description
              : role === "dealer"
                ? t("common:showToConsumer")
                : t("common:showToDepot")
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
              <p className="text-center text-xs text-muted-foreground">{t("common:cameraHint")}</p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {myQrValue ? (
                <div className="mx-auto w-fit rounded-2xl bg-white p-4">
                  <QRCodeSVG value={myQrValue} size={164} level="M" />
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  {t("common:scanYourQrNotReady")}
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
                    <Copy className="size-4" /> {t("common:copyCode")}
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
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("common:scan")}
      className="grid size-16 place-items-center rounded-full bg-flame text-primary-foreground shadow-lift transition-transform hover:scale-105 active:scale-95"
    >
      <ScanLine className="size-7" />
    </button>
  );
}
