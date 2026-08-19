import { Loader2, PackageCheck, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Doc } from "../../convex/_generated/dataModel";
import { StatusBadge } from "@/components/StatusBadge";
import { NativeModal, NativeModalFooter, NativeModalHeader } from "@/components/NativeModal";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/gas";

export type RequestRow = Doc<"waitlistEntries"> & {
  dealer: Doc<"dealers"> | null;
  position: number | undefined;
};

function Details({ entry }: { entry: RequestRow }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3 text-sm">
        <span className="font-medium">{t("common:status")}</span>
        <StatusBadge status={entry.status} />
      </div>
      {entry.status === "waiting" ? (
        <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3 text-sm">
          <span className="font-medium">{t("common:yourPlaceInLine")}</span>
          <span className="font-display text-lg font-bold">#{entry.position ?? "?"}</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3 text-sm">
        <span className="font-medium">{t("common:cylinder")}</span>
        <span>
          {entry.quantity} × {entry.cylinderSize}
        </span>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3 text-sm">
        <span className="font-medium">{t("common:requested")}</span>
        <span className="text-muted-foreground">{formatDateTime(entry.createdAt)}</span>
      </div>
      {entry.dealer?.phone ? (
        <a
          href={`tel:${entry.dealer.phone}`}
          className="flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3 text-sm transition-colors hover:bg-secondary"
        >
          <span className="font-medium">{t("common:depotPhone")}</span>
          <span className="text-primary">{entry.dealer.phone}</span>
        </a>
      ) : null}
      {entry.status === "cancelled" && entry.cancelledReason ? (
        <div className="rounded-xl bg-secondary/60 px-4 py-3 text-sm">
          <p className="font-medium">{t("common:cancelledByDepot")}</p>
          <p className="mt-1 text-muted-foreground">“{entry.cancelledReason}”</p>
        </div>
      ) : null}
      {entry.note ? (
        <div className="rounded-xl bg-secondary/60 px-4 py-3 text-sm">
          <p className="font-medium">{t("common:noteForDealer")}</p>
          <p className="mt-1 text-muted-foreground">{entry.note}</p>
        </div>
      ) : null}
    </div>
  );
}

function CancelConfirm({
  entry,
  busy,
  onCancel,
}: {
  entry: RequestRow;
  busy: boolean;
  onCancel: ((id: string) => void) | undefined;
}) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button
        variant="outline"
        className="text-destructive hover:text-destructive"
        onClick={() => setConfirming(true)}
        disabled={!onCancel}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}{" "}
        {t("common:cancelRequest")}
      </Button>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-center text-sm font-medium">{t("common:cancelConfirmQuestion")}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="destructive"
          onClick={() => onCancel?.(entry._id)}
          disabled={busy || !onCancel}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null} {t("common:yesCancel")}
        </Button>
        <Button variant="outline" onClick={() => setConfirming(false)} disabled={busy}>
          {t("common:noKeep")}
        </Button>
      </div>
    </div>
  );
}

function Actions({
  entry,
  busy,
  onCancel,
  onConfirm,
}: {
  entry: RequestRow;
  busy: boolean;
  onCancel: ((id: string) => void) | undefined;
  onConfirm: ((id: string) => void) | undefined;
}) {
  const { t } = useTranslation();
  if (entry.status === "allotted") {
    return (
      <>
        <Button onClick={() => onConfirm?.(entry._id)} disabled={busy || !onConfirm}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}{" "}
          {t("common:confirmCollection")}
        </Button>
        <CancelConfirm entry={entry} busy={busy} onCancel={onCancel} />
      </>
    );
  }
  if (entry.status === "waiting") {
    return <CancelConfirm entry={entry} busy={busy} onCancel={onCancel} />;
  }
  return null;
}

export function RequestDetails({
  entry,
  busy = false,
  onCancel,
  onConfirm,
  onClose,
}: {
  entry: RequestRow | null;
  busy?: boolean;
  onCancel?: (id: string) => void;
  onConfirm?: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const address = entry?.dealer
    ? `${entry.dealer.district}${entry.dealer.address ? `, ${entry.dealer.address}` : ""}`
    : undefined;
  const title = entry?.dealer?.businessName ?? t("common:requestDetails");

  return (
    <NativeModal open={entry !== null} onOpenChange={(o) => !o && onClose()}>
      <NativeModalHeader title={title} description={address} onClose={onClose} />
      {entry ? (
        <div className="px-4 sm:px-6">
          <Details entry={entry} />
        </div>
      ) : null}
      {entry ? (
        <NativeModalFooter>
          <Actions entry={entry} busy={busy} onCancel={onCancel} onConfirm={onConfirm} />
          <Button variant="outline" onClick={onClose}>
            {t("common:close")}
          </Button>
        </NativeModalFooter>
      ) : null}
    </NativeModal>
  );
}
