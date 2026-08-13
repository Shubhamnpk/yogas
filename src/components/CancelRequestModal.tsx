import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { NativeModal, NativeModalFooter, NativeModalHeader } from "@/components/NativeModal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CancelRequestModal({
  open,
  consumerName,
  onClose,
  onConfirm,
  busy = false,
}: {
  open: boolean;
  consumerName: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  busy?: boolean;
}) {
  const [reason, setReason] = useState("");
  const canSubmit = reason.trim().length >= 3;

  const submit = () => {
    if (canSubmit) onConfirm(reason.trim());
  };

  return (
    <NativeModal
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) {
          onClose();
          setReason("");
        }
      }}
    >
      <NativeModalHeader
        title="Cancel this request"
        description={`Let ${consumerName} know why their request is being cancelled.`}
        onClose={() => {
          if (!busy) {
            onClose();
            setReason("");
          }
        }}
      />
      <div className="px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Reason (required)</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={240}
            autoFocus
            placeholder="e.g. Stock hasn't arrived, customer unreachable, duplicate request..."
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              This is shared with the customer and saved to the audit log.
            </p>
            <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {reason.length}/240
            </p>
          </div>
        </div>
      </div>
      <NativeModalFooter>
        <Button variant="destructive" onClick={submit} disabled={busy || !canSubmit}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />} Cancel
          request
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (!busy) {
              onClose();
              setReason("");
            }
          }}
        >
          Keep request
        </Button>
      </NativeModalFooter>
    </NativeModal>
  );
}
