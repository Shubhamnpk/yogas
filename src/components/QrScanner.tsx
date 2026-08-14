import { useEffect, useRef, useState } from "react";
import {
  Html5Qrcode,
  Html5QrcodeScannerState,
  type Html5QrcodeCameraScanConfig,
} from "html5-qrcode";

type Props = {
  onResult: (text: string) => void;
  paused?: boolean;
};

/** Ignore re-detections of the same code within this window. */
const DECODE_COOLDOWN_MS = 2500;

/**
 * Pick the most sensible camera without triggering an extra permission
 * prompt: prefer a labelled rear camera, fall back to the only camera, and
 * finally let the browser pick an "environment" facing camera.
 */
async function pickVideoConstraints(): Promise<MediaTrackConstraints> {
  let devices: MediaDeviceInfo[] = [];
  try {
    if (navigator.mediaDevices?.enumerateDevices) {
      devices = [...(await navigator.mediaDevices.enumerateDevices())].filter(
        (device) => device.kind === "videoinput",
      );
    }
  } catch {
    devices = [];
  }

  const labelled = devices.filter((device) => device.label.length > 0);
  if (labelled.length > 0) {
    const rear = labelled.find((device) => /back|rear|environment/i.test(device.label));
    const chosen = rear ?? labelled[0];
    if (chosen) return { deviceId: { exact: chosen.deviceId } };
  }

  if (devices.length === 1 && devices[0]) {
    return { deviceId: { exact: devices[0].deviceId } };
  }

  return { facingMode: "environment" };
}

export default function QrScanner({ onResult, paused }: Props) {
  const containerId = useRef(`qr-${Math.random().toString(36).slice(2)}`);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const lastDecodedRef = useRef<{ text: string; at: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (paused) return;
    let disposed = false;

    const containerEl = document.getElementById(containerId.current);

    // The library sets an inline `position: relative` on the container during
    // start(), which overrides its `absolute inset-0` class and collapses it
    // to the video's natural height. Measure the square wrapper instead and
    // force both the container and the video to fill it exactly, using
    // object-fit: cover so the widescreen feed crops to fill edge-to-edge.
    const sizeVideoToFill = () => {
      if (!containerEl) return;
      const box = containerEl.parentElement ?? containerEl;
      const width = box.offsetWidth;
      const height = box.offsetHeight;
      if (width <= 0 || height <= 0) return;

      containerEl.style.position = "absolute";
      containerEl.style.top = "0";
      containerEl.style.left = "0";
      containerEl.style.bottom = "0";
      containerEl.style.right = "0";
      containerEl.style.width = `${width}px`;
      containerEl.style.height = `${height}px`;

      const video = containerEl.querySelector("video");
      if (video) {
        video.style.width = `${width}px`;
        video.style.height = `${height}px`;
        video.style.objectFit = "cover";
      }

      const nativeShading = containerEl.querySelector("#qr-shaded-region");
      if (nativeShading) {
        (nativeShading as HTMLElement).style.display = "none";
      }
    };
    const observer = containerEl ? new MutationObserver(sizeVideoToFill) : null;
    observer?.observe(containerEl, { childList: true, subtree: true });
    window.addEventListener("resize", sizeVideoToFill);

    const stopScanner = async (scanner: Html5Qrcode) => {
      try {
        if (scanner.getState() !== Html5QrcodeScannerState.NOT_STARTED) {
          await scanner.stop();
        }
      } catch {
        // Scanner is still starting up or was already stopped.
      }
      try {
        scanner.clear();
      } catch {
        // Nothing to clear.
      }
    };

    const scanner = new Html5Qrcode(containerId.current, { verbose: false });
    scannerRef.current = scanner;

    void (async () => {
      const videoConstraints = await pickVideoConstraints();
      if (disposed) return;

      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
      };

      try {
        await scanner.start(
          videoConstraints,
          config,
          (decoded) => {
            if (disposed) return;
            const now = Date.now();
            const previous = lastDecodedRef.current;
            if (previous && previous.text === decoded && now - previous.at < DECODE_COOLDOWN_MS) {
              return;
            }
            lastDecodedRef.current = { text: decoded, at: now };
            onResultRef.current(decoded);
          },
          () => undefined,
        );
        sizeVideoToFill();
        if (disposed) {
          void stopScanner(scanner);
        }
      } catch {
        if (!disposed) {
          setError("Camera unavailable. Allow camera access, or type the code below.");
        }
      }
    })();

    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("resize", sizeVideoToFill);
      void stopScanner(scanner);
    };
  }, [paused]);

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-2xl bg-muted">
        <div
          id={containerId.current}
          className="absolute inset-0 flex items-center justify-center"
        />
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 size-[58%] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-primary/70 shadow-[0_0_0_99999px_rgba(0,0,0,0.45)]" />
      </div>
      {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
