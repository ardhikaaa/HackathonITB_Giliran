import { AlertTriangle, Ban, CheckCircle2, Clock3, PackageX, ShieldAlert, XCircle, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatJam } from "@/lib/format";

const CONFIG = {
  ok: { tone: "ok", Icon: CheckCircle2, title: "BOLEH DILAYANI" },
  done: { tone: "ok", Icon: CheckCircle2, title: "TERCATAT" },
  already: { tone: "bad", Icon: XCircle, title: "SUDAH DIAMBIL" },
  revoked: { tone: "bad", Icon: Ban, title: "KUPON TIDAK BERLAKU" },
  wrong_table: { tone: "warn", Icon: Store, title: "BUKAN MEJA INI" },
  no_stock: { tone: "bad", Icon: PackageX, title: "STOK HABIS" },
  not_found: { tone: "bad", Icon: XCircle, title: "KUPON TIDAK DIKENALI" },
  conflict: { tone: "warn", Icon: ShieldAlert, title: "PERLU DIPERIKSA ADMIN" },
  offline_queued: { tone: "ok", Icon: Clock3, title: "TERCATAT (OFFLINE)" },
  offline_ok: { tone: "ok", Icon: CheckCircle2, title: "BOLEH DILAYANI" },
  offline_not_found: { tone: "warn", Icon: AlertTriangle, title: "TIDAK ADA DI PERANGKAT INI" },
};

const TONE = {
  ok: { box: "bg-ok-bg border-ok/40", title: "text-ok", body: "text-foreground" },
  warn: { box: "bg-warn-bg border-warn/50", title: "text-warn", body: "text-foreground" },
  bad: { box: "bg-bad-bg border-bad/40", title: "text-bad", body: "text-foreground" },
};

export function ClaimResult({
  view,
  onClose,
  onDeliver,
  submitting,
  diwakilkan,
  setDiwakilkan,
  namaPengambil,
  setNamaPengambil,
  online,
}) {
  if (!view) return null;
  const config = CONFIG[view.status] ?? CONFIG.not_found;
  const tone = TONE[config.tone];
  const data = view.data ?? {};
  const eligible = view.status === "ok" || view.status === "offline_ok";
  const done = view.status === "done" || view.status === "offline_queued";
  const perluNama = diwakilkan && !namaPengambil.trim();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className={`min-h-full border-t-8 p-5 ${tone.box}`}>
        <div className="mx-auto max-w-lg space-y-5">
          <div className="flex items-start gap-3">
            <config.Icon className={`mt-1 h-10 w-10 shrink-0 ${tone.title}`} aria-hidden="true" />
            <div>
              <p className={`text-3xl font-black leading-tight ${tone.title}`}>{done ? "TERCATAT" : config.title}</p>
              {!online && (
                <p className="mt-1 inline-block rounded-full bg-warn-bg px-2.5 py-1 text-xs font-bold text-warn">
                  Mode offline
                </p>
              )}
            </div>
          </div>

          {(data.nama_depan || data.kelompok) && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-4xl font-bold text-foreground">{data.nama_depan || "—"}</p>
              <p className="mt-1 text-xl font-semibold text-muted-foreground">{data.kelompok || "—"}</p>
              {data.jumlah_anggota ? (
                <p className="mt-1 text-lg text-muted-foreground">
                  {data.jumlah_anggota} anggota keluarga
                  {data.paket ? ` · ${data.paket} paket` : ""}
                </p>
              ) : null}
              {data.kode && <p className="mt-2 font-mono text-lg tracking-[0.3em] text-foreground">{data.kode}</p>}
            </div>
          )}

          {view.status === "already" && (
            <div className="rounded-2xl border border-bad/30 bg-card p-4 text-base">
              <p className="font-semibold text-foreground">
                Diambil {data.waktu ? `pukul ${formatJam(data.waktu)}` : "sebelumnya"}
                {data.meja_nama ? ` di ${data.meja_nama}` : ""}.
              </p>
              <p className="mt-1 text-muted-foreground">Bawa penerima ke admin kalau kuponnya berbeda.</p>
            </div>
          )}

          {view.status === "revoked" && (
            <p className="rounded-2xl border border-bad/30 bg-card p-4 text-base font-semibold text-foreground">
              Kupon tidak berlaku, bawa ke admin.
            </p>
          )}

          {view.status === "wrong_table" && (
            <p className="rounded-2xl border border-warn/40 bg-card p-4 text-base font-semibold text-foreground">
              Kelompok {data.kelompok} dilayani di {data.meja_tujuan}. Arahkan ke meja itu.
            </p>
          )}

          {view.status === "no_stock" && (
            <p className="rounded-2xl border border-bad/30 bg-card p-4 text-base font-semibold text-foreground">
              Sisa stok sudah habis. Hubungi admin sebelum menyerahkan bantuan.
            </p>
          )}

          {view.status === "conflict" && (
            <p className="rounded-2xl border border-warn/40 bg-card p-4 text-base font-semibold text-foreground">
              Kupon ini juga diklaim perangkat lain. Catat nomor sobekan dan bawa ke admin.
            </p>
          )}

          {view.status === "not_found" && (
            <p className="rounded-2xl border border-bad/30 bg-card p-4 text-base font-semibold text-foreground">
              Kode tidak cocok dengan kupon acara ini. Periksa kembali ketikan kode 6 karakter.
            </p>
          )}

          {view.status === "offline_not_found" && (
            <p className="rounded-2xl border border-warn/40 bg-card p-4 text-base font-semibold text-foreground">
              Tiket ini tidak ada di salinan offline meja ini. Coba lagi saat sinyal kembali.
            </p>
          )}

          {data.di_luar_gelombang && eligible && (
            <p className="inline-flex items-center gap-2 rounded-full bg-warn-bg px-3 py-1.5 text-sm font-bold text-warn">
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              Di luar gelombang
            </p>
          )}

          {eligible && (
            <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
              <label className="flex items-center gap-3 text-lg font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={diwakilkan}
                  onChange={(event) => setDiwakilkan(event.target.checked)}
                  className="h-6 w-6"
                />
                Diwakilkan
              </label>
              {diwakilkan && (
                <div className="space-y-1.5">
                  <label htmlFor="pengambil" className="text-base font-semibold text-foreground">
                    Nama pengambil
                  </label>
                  <Input
                    id="pengambil"
                    value={namaPengambil}
                    onChange={(event) => setNamaPengambil(event.target.value)}
                    className="h-14 text-lg"
                    placeholder="Nama orang yang mengambil"
                  />
                </div>
              )}
              <Button
                className="h-20 w-full rounded-2xl text-2xl font-black tracking-wide"
                onClick={onDeliver}
                disabled={submitting || perluNama}
              >
                DISERAHKAN
              </Button>
              {perluNama && <p className="text-sm font-semibold text-bad">Isi nama pengambil dulu.</p>}
            </div>
          )}

          {done && view.status === "offline_queued" && (
            <p className="rounded-2xl border border-border bg-card p-4 text-base font-semibold text-foreground">
              Tersimpan di perangkat. Akan dikirim otomatis saat sinyal kembali.
            </p>
          )}

          <Button variant="outline" className="h-14 w-full rounded-2xl text-lg font-bold" onClick={onClose}>
            Pindai berikutnya
          </Button>
        </div>
      </div>
    </div>
  );
}