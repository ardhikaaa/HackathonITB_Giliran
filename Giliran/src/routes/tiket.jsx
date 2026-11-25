import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/giliran/StatusPill";
import { QrImage } from "@/components/qr/QrImage";
import { getTicketByToken } from "@/lib/public-fns";
import { formatTanggal } from "@/lib/format";

export const Route = createFileRoute("/tiket")({
  validateSearch: (search) => ({ t: typeof search.t === "string" ? search.t : undefined }),
  head: () => ({ meta: [{ title: "Tiket saya — GILIRAN" }, { name: "robots", content: "noindex" }] }),
  component: TicketPage,
});

const STATUS = {
  aktif: { variant: "ok", label: "Kupon aktif" },
  dipakai: { variant: "info", label: "Sudah diambil" },
  dicabut: { variant: "bad", label: "Kupon dicabut" },
};

function waNumber(hp) {
  const digits = String(hp ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

function TicketPage() {
  const { t: token } = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["ticket", token],
    queryFn: () => getTicketByToken({ data: { token } }),
    enabled: !!token,
  });

  if (!token) {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-foreground">Tautan tiket tidak lengkap</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Buka tautan tiket yang dikirim panitia, atau pindai QR pada kupon cetak.
        </p>
        <Button asChild variant="outline" className="mt-5 h-12 rounded-full px-5 text-base font-semibold">
          <Link to="/">Kembali ke beranda</Link>
        </Button>
      </Shell>
    );
  }

  if (isLoading) {
    return (
      <Shell>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="mt-2 text-base text-muted-foreground">Memuat tiket…</p>
      </Shell>
    );
  }

  if (!data?.found) {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-foreground">Tiket tidak ditemukan</h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">
          {data?.ditutup
            ? "Acara ini sudah ditutup, jadi tautan tiket tidak berlaku lagi."
            : "Tautan tidak dikenali. Periksa kembali tautan dari panitia atau hubungi admin acara."}
        </p>
      </Shell>
    );
  }

  const status = STATUS[data.status] ?? STATUS.aktif;
  const ticketUrl = typeof window !== "undefined" ? `${window.location.origin}/tiket?t=${token}` : "";
  const wa = waNumber(data.hp);
  const waText = encodeURIComponent(
    `Tiket ${data.event_nama} untuk ${data.nama_depan} (${data.kelompok}). Kode ${data.kode_6}. Buka: ${ticketUrl}`,
  );

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Tiket digital</p>
          <h1 className="mt-1 text-xl font-bold text-foreground">{data.event_nama}</h1>
          <p className="text-sm text-muted-foreground">
            {formatTanggal(data.tanggal)} · {data.jenis_paket}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <StatusPill variant={status.variant} className="mx-auto">
            {status.label}
          </StatusPill>
          <div className="mt-4 flex justify-center">
            <QrImage value={token} size={240} className="rounded-lg" />
          </div>
          <p className="mt-4 font-mono text-4xl font-black tracking-[0.25em] text-foreground">{data.kode_6}</p>
          <p className="mt-1 text-sm text-muted-foreground">Tunjukkan QR atau kode ini di meja petugas.</p>
        </div>

        <dl className="divide-y divide-border rounded-2xl border border-border bg-card px-5">
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-sm text-muted-foreground">Nama</dt>
            <dd className="text-base font-semibold text-foreground">{data.nama_depan}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-sm text-muted-foreground">Kelompok</dt>
            <dd className="text-base font-semibold text-foreground">{data.kelompok}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-sm text-muted-foreground">Jam kedatangan</dt>
            <dd className="text-base font-semibold text-foreground">{data.jam}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-sm text-muted-foreground">Meja</dt>
            <dd className="text-base font-semibold text-foreground">{data.meja}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-sm text-muted-foreground">Nomor sobekan</dt>
            <dd className="text-base font-semibold text-foreground">#{data.nomor_sobekan}</dd>
          </div>
        </dl>

        <div className="no-print flex flex-col gap-2">
          <Button className="h-14 rounded-2xl text-base font-bold" onClick={() => window.print()}>
            <Printer className="mr-2 h-5 w-5" aria-hidden="true" />
            Cetak tiket ini
          </Button>
          {wa && (
            <Button asChild variant="outline" className="h-14 rounded-2xl text-base font-bold">
              <a href={`https://wa.me/${wa}?text=${waText}`} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-5 w-5" aria-hidden="true" />
                Bagikan lewat WhatsApp
              </a>
            </Button>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Hanya pemegang tautan ini yang bisa melihat tiket. Jangan bagikan ke orang lain.
        </p>
      </div>
    </div>
  );
}

function Shell({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center">{children}</div>
    </div>
  );
}