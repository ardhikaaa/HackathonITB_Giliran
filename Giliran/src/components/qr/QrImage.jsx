import { useEffect, useState } from "react";

/** QR dibuat di peramban dari token; token tidak pernah dikirim ke layanan luar. */
export function QrImage({ value, size = 220, className }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let alive = true;
    if (!value) return () => {};
    import("qrcode")
      .then((mod) =>
        mod.default.toDataURL(String(value), {
          width: Math.max(size * 2, 320),
          margin: 1,
          errorCorrectionLevel: "M",
        }),
      )
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        if (alive) setSrc("");
      });
    return () => {
      alive = false;
    };
  }, [value, size]);

  if (!src) {
    return <div className={`animate-pulse rounded bg-muted ${className ?? ""}`} style={{ width: size, height: size }} />;
  }
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt="Kode QR kupon"
      className={className}
      style={{ width: size, height: size }}
    />
  );
}