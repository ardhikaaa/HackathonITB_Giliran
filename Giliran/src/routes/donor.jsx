import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDonorReport } from "@/lib/public-fns";
import { formatTanggal, STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/donor")({
  validateSearch: (search) => ({ t: typeof search.t === "string" ? search.t : undefined }),
  head: () => ({ meta: [{ title: "Laporan acara — GILIRAN" }, { name: "robots", content: "noindex" }] }),
  component: DonorPage,
});

function DonorPage() {
  const { t: token } = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["donor", token],
    queryFn: () => getDonorReport({ data: { token } }),
    enabled: !!token,
  });

  if (!token || (!isLoading && !data?.found)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center">
          <h1 className="text-xl font-bold text-foreground">Laporan tidak bisa dibuka</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Tautan tidak dikenali atau sudah diganti admin. Minta tautan terbaru.
          </p>
          <Button asChild variant="outline" className="mt-5 h-12 rounded-full px-5 text-base font-semibold">
            <Link to="/">Kembali ke beranda</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  const rows = [
    ["Stok awal", data.stok_awal],
    ["Diserahkan", data.diserahkan],
    ["Sisa stok", data.sisa],
    ["Jumlah penerima", data.jumlah_penerima],
    ["Jumlah kelompok", data.jumlah_kelompok],
    ["Diambil perwakilan", data.perwakilan],
    ["Di luar gelombang", data.di_luar_gelombang],
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-lg space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Ringkasan acara</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{data.nama}</h1>
          <p className="text-sm text-muted-foreground">
            {formatTanggal(data.tanggal)} · {data.jenis_paket} · {STATUS_LABEL[data.status] ?? data.status}
          </p>
        </div>
        <dl className="divide-y divide-border rounded-2xl border border-border bg-card px-5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 py-3">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-lg font-bold tabular-nums text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Ringkasan ini tidak memuat nama penerima. Angka berasal dari buku besar penyerahan acara.
        </p>
      </div>
    </div>
  );
}