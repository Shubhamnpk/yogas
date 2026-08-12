import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

type Props = {
  onResult: (text: string) => void;
  paused?: boolean;
};

export default function QrScanner({ onResult, paused }: Props) {
  const containerId = useRef(`qr-${Math.random().toString(36).slice(2)}`);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (paused) return;
    let stopped = false;
    const scanner = new Html5Qrcode(containerId.current, { verbose: false });
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          if (stopped) return;
          stopped = true;
          onResult(decoded);
          void scanner.stop().catch(() => undefined);
        },
        () => undefined,
      )
      .catch(() => {
        setError("Camera unavailable. Allow camera access, or type the code below.");
      });

    return () => {
      stopped = true;
      const state = scanner.getState?.();
      if (state === 2 || state === 3) {
        void scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => undefined);
      }
    };
  }, [onResult, paused]);

  return (
    <div className="space-y-3">
      <div
        id={containerId.current}
        className="mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl border border-border bg-muted"
      />
      {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
