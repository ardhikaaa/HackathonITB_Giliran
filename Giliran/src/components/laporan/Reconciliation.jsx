import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Download, Link2, Loader2, Printer, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusPill } from "@/components/giliran/StatusPill";
import { getReport, createDonorLink } from "@/lib/ticket-fns";
import { downloadCsv } from "@/lib/csv";
import { formatWaktu } from "@/lib/format";

function Row({ label, value, hint }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/70 py-2 last:border-0">
      <dt className="text-sm text-muted-foreground">
        {label}
        {hint && <span className="ml-1 text-xs text-muted-foreground/80">({hint})</span>}
      </dt>
      <dd className="text-lg font-bold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

export function Reconciliation({ eventId }) {
  const [sobekan, setSobekan] = useState("");
  const [stok, setStok] = useState("");
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [donorUrl, setDonorUrl] = useState("");

  async function hitung(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await getReport({
        data: { eventId, sobekan_fisik: Number(sobekan || 0), stok_fisik: Number(stok || 0) },
      });
      setReport(result);
    } catch (error) {
      toast.error(error?.message ?? "Rekonsiliasi belum bisa dihitung.");
    } finally {
      setBusy(false);
    }
  }

  async function donorLink() {
    try {
      const result = await createDonorLink({ data: { eventId } });
      const url = `${window.location.origin}/donor?t=${result.token}`;
      setDonorUrl(url);
      await navigator.clipboard.writeText(url).catch(() => null);
      toast.success("Tautan laporan versi donor dibuat dan disalin.");
    } catch (error) {
      toast.error(error?.message ?? "Tautan donor belum bisa dibuat.");
    }
  }

  function unduh() {
    if (!report) return;
    downloadCsv(
      "laporan-giliran.csv",
      ["nomor_sobekan", "kode", "nama", "meja", "waktu", "nama_pengambil", "di_luar_gelombang"],
      report.jejak.map((row) => [
        row.nomor_sobekan,
        row.kode_6,
        row.nama,
        row.meja,
        formatWaktu(row.waktu),
        row.nama_pengambil,
        row.di_luar_gelombang ? "ya" : "tidak",
      ]),
    );
  }

  return (
    <div className="space-y-5">
      <form onSubmit={hitung} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="sobekan">Jumlah sobekan fisik</Label>
          <Input
            id="sobekan"
            inputMode="numeric"
            className="h-12 text-base"
            value={sobekan}
            onChange={(event) => setSobekan(event.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stokfisik">Stok fisik tersisa</Label>
          <Input
            id="stokfisik"
            inputMode="numeric"
            className="h-12 text-base"
            value={stok}
            onChange={(event) => setStok(event.target.value)}
            placeholder="0"
          />
        </div>
        <Button type="submit" className="h-12 rounded-full px-6 text-base font-semibold" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Hitung rekonsiliasi
        </Button>
      </form>

      {report && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <dl className="rounded-xl border border-border p-4">
              <Row label="Stok awal" value={report.stok_awal} hint="paket" />
              <Row label="Kupon diserahkan" value={report.digital} hint="catatan digital" />
              <Row label="Paket diserahkan" value={report.paket_digital} hint="sesuai anggota keluarga" />
              <Row label="Sobekan fisik" value={report.sobekan_fisik} />
              <Row label="Stok fisik tersisa" value={report.stok_fisik} />
              <Row label="Terpakai menurut stok" value={report.terpakai_stok} hint="stok awal − stok fisik" />
            </dl>
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Selisih</h3>
                <StatusPill variant={report.cocok ? "ok" : "bad"}>{report.cocok ? "OK" : "Tidak cocok"}</StatusPill>
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Digital vs sobekan fisik</span>
                  <span className={`font-bold tabular-nums ${report.selisih.digital_vs_sobekan === 0 ? "text-ok" : "text-bad"}`}>
                    {report.selisih.digital_vs_sobekan}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Paket vs stok terpakai</span>
                  <span className={`font-bold tabular-nums ${report.selisih.paket_vs_terpakai === 0 ? "text-ok" : "text-bad"}`}>
                    {report.selisih.paket_vs_terpakai}
                  </span>
                </li>
              </ul>
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-secondary/60 p-3 text-sm">
                {report.cocok ? (
                  <>
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden="true" />
                    <p className="text-foreground">
                      Catatan digital cocok dengan sobekan fisik, dan paket tercatat cocok dengan stok terpakai.
                    </p>
                  </>
                ) : (
                  <>
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" aria-hidden="true" />
                    <p className="text-foreground">
                      Ada selisih. Periksa daftar penelusuran di bawah, lalu cocokkan nomor sobekan fisik.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Percobaan ganda ditolak", report.ringkasan.percobaan_ganda],
              ["Insiden ditandai", report.ringkasan.insiden],
              ["Insiden terbuka", report.ringkasan.insiden_terbuka],
              ["Kupon terbit ulang", report.ringkasan.terbit_ulang],
              ["Diambil perwakilan", report.ringkasan.perwakilan],
              ["Di luar gelombang", report.ringkasan.luar_gelombang],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border px-3 py-2">
                <p className="text-xs leading-tight text-muted-foreground">{label}</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{value}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Penelusuran penyerahan</h3>
              <Button size="sm" variant="outline" className="h-9 rounded-full px-3 text-xs font-semibold" onClick={unduh}>
                <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Unduh laporan
              </Button>
              <Button size="sm" variant="outline" className="h-9 rounded-full px-3 text-xs font-semibold" onClick={() => window.print()}>
                <Printer className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Cetak / PDF
              </Button>
            </div>
            <div className="max-h-80 overflow-auto rounded-xl border border-border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="sticky top-0 bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Sobekan</th>
                    <th className="px-3 py-2">Kode</th>
                    <th className="px-3 py-2">Nama</th>
                    <th className="px-3 py-2">Meja</th>
                    <th className="px-3 py-2">Waktu</th>
                    <th className="px-3 py-2">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {report.jejak.map((row, index) => (
                    <tr key={`${row.nomor_sobekan}-${index}`} className="border-t border-border/70">
                      <td className="px-3 py-2 tabular-nums font-semibold text-foreground">#{row.nomor_sobekan}</td>
                      <td className="px-3 py-2 font-mono text-xs tracking-widest text-foreground">{row.kode_6}</td>
                      <td className="px-3 py-2 text-foreground">{row.nama}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.meja}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{formatWaktu(row.waktu)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {[row.nama_pengambil && `perwakilan: ${row.nama_pengambil}`, row.di_luar_gelombang && "di luar gelombang"]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border p-4">
        <p className="text-sm font-semibold text-foreground">Versi donor</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ringkasan tanpa nama penerima, untuk dibagikan ke donor atau pengurus.
        </p>
        <Button variant="outline" className="mt-3 h-11 rounded-full px-4 text-sm font-semibold" onClick={donorLink}>
          <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Buat tautan versi donor
        </Button>
        {donorUrl && (
          <div className="mt-3 rounded-lg bg-secondary p-3">
            <code className="block break-all text-xs text-foreground">{donorUrl}</code>
            <p className="mt-1 text-xs text-muted-foreground">Tautan baru membatalkan tautan donor sebelumnya.</p>
          </div>
        )}
      </div>
    </div>
  );
}