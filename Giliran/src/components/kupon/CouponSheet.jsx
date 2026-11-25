import { QrImage } from "@/components/qr/QrImage";

const PER_PAGE = 8;

function chunk(list, size) {
  const pages = [];
  for (let i = 0; i < list.length; i += size) pages.push(list.slice(i, i + size));
  return pages;
}

function firstName(nama) {
  return String(nama ?? "").trim().split(/\s+/)[0] || "Penerima";
}

function Coupon({ coupon, event }) {
  return (
    <div
      style={{
        border: "1px dashed #8a8a8a",
        borderRadius: "2mm",
        padding: "2.5mm",
        height: "63mm",
        display: "flex",
        gap: "2mm",
        breakInside: "avoid",
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", gap: "2mm", flex: 1, minWidth: 0 }}>
        <QrImage value={coupon.token} size={78} />
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "0.6mm" }}>
          <p style={{ fontSize: "6.5pt", letterSpacing: "0.08em", textTransform: "uppercase", color: "#444" }}>
            {event?.nama ?? "GILIRAN"}
          </p>
          <p
            style={{
              fontSize: "19pt",
              fontWeight: 900,
              letterSpacing: "0.14em",
              fontFamily: "ui-monospace, monospace",
              lineHeight: 1.05,
            }}
          >
            {coupon.kode}
          </p>
          <p style={{ fontSize: "10pt", fontWeight: 700 }}>{firstName(coupon.nama)}</p>
          <p style={{ fontSize: "8pt", color: "#333" }}>
            {coupon.kelompok}
            {coupon.jam ? ` · ${coupon.jam}` : ""}
          </p>
          {event?.cadangkan_jatah && (
            <p style={{ fontSize: "6.5pt", color: "#1c5e45", fontWeight: 700 }}>
              Jatah Anda aman selama sesi kelompok Anda
            </p>
          )}
          {event?.mode_retensi === "arsip_lpj" && (
            <p style={{ fontSize: "5.8pt", color: "#666" }}>Nama penerima disimpan untuk keperluan LPJ.</p>
          )}
        </div>
      </div>
      <div
        style={{
          width: "16mm",
          borderLeft: "1px dashed #8a8a8a",
          paddingLeft: "1.5mm",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: "5.5pt", letterSpacing: "0.1em", writingMode: "vertical-rl" }}>SOBEKAN</span>
        <span style={{ fontSize: "9pt", fontWeight: 800 }}>#{coupon.nomor_sobekan}</span>
        <span style={{ fontSize: "6.5pt", fontFamily: "ui-monospace, monospace" }}>{coupon.kode}</span>
      </div>
    </div>
  );
}

export function CouponSheet({ coupons, event }) {
  const pages = chunk(coupons, PER_PAGE);
  return (
    <div>
      {pages.map((page, index) => (
        <section
          key={index}
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "8mm",
            margin: "0 auto 8mm",
            background: "#fff",
            boxSizing: "border-box",
            breakAfter: index === pages.length - 1 ? "auto" : "page",
            pageBreakAfter: index === pages.length - 1 ? "auto" : "always",
          }}
        >
          <div style={{ marginBottom: "4mm", fontSize: "8pt", color: "#555" }}>
            {event?.nama ?? "GILIRAN"} · {event?.tanggal ?? ""} · halaman {index + 1} dari {pages.length}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4mm" }}>
            {page.map((coupon) => (
              <Coupon key={`${coupon.recipientId}-${coupon.kode}`} coupon={coupon} event={event} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}