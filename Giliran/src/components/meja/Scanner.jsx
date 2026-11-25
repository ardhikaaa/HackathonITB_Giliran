import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export function Scanner({ open, onScan, onClose }) {
  const [error, setError] = useState("");
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!open) return () => {};
    let scanner = null;
    let cancelled = false;
    setError("");
    (async () => {
      try {
        const mod = await import("html5-qrcode");
        const Html5Qrcode = mod.Html5Qrcode ?? mod.default?.Html5Qrcode;
        scanner = new Html5Qrcode("giliran-scanner");
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            if (cancelled) return;
            cancelled = true;
            onScanRef.current?.(decoded);
            scanner.stop().then(() => scanner.clear()).catch(() => {});
          },
          () => {},
        );
      } catch {
        setError("Kamera tidak bisa dibuka. Ketik kode 6 karakter di kolom bawah.");
      }
    })();
    return () => {
      cancelled = true;
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-foreground/95 p-4">
      <div className="flex items-center justify-between text-background">
        <p className="text-lg font-bold">Arahkan kamera ke QR kupon</p>
        <button onClick={onClose} aria-label="Tutup kamera" className="rounded-full bg-background/20 p-2">
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      <div className="mx-auto mt-4 w-full max-w-md overflow-hidden rounded-2xl bg-black">
        <div id="giliran-scanner" className="w-full" />
      </div>
      {error && <p className="mx-auto mt-3 max-w-md rounded-xl bg-warn-bg p-3 text-center text-base font-semibold text-warn">{error}</p>}
    </div>
  );
}