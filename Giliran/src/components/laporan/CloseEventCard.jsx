import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusPill } from "@/components/giliran/StatusPill";
import { closeEvent } from "@/lib/ticket-fns";
import { formatTanggal, RETENSI_LABEL } from "@/lib/format";

function plusMonths(months) {
  const base = new Date();
  base.setMonth(base.getMonth() + months);
  return base.toISOString().slice(0, 10);
}

export function CloseEventCard({ eventId, event, stats }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState(event.mode_retensi ?? "anonim");
  const [akhir, setAkhir] = useState(event.tanggal_akhir_retensi || plusMonths(6));
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (event.status === "ditutup") {
    return (
      <div className="rounded-xl border border-border bg-secondary/50 p-4">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-bold text-foreground">Acara sudah ditutup</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Tautan tiket dan tautan meja sudah tidak berlaku. Mode retensi: {RETENSI_LABEL[event.mode_retensi] ?? event.mode_retensi}.
          {event.mode_retensi === "arsip_lpj" && event.tanggal_akhir_retensi
            ? ` Nama disimpan sampai ${formatTanggal(event.tanggal_akhir_retensi)}, hapus setelah tanggal itu.`
            : ""}
        </p>
      </div>
    );
  }

  async function submit(konfirmasi) {
    setBusy(true);
    try {
      const result = await closeEvent({
        data: { eventId, mode_retensi: mode, tanggal_akhir_retensi: akhir, konfirmasi },
      });
      if (result?.perlu_konfirmasi) {
        setConfirming(true);
        toast.warning(`Masih ada ${result.insiden_terbuka} insiden terbuka.`);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["workspace", eventId] });
      await queryClient.invalidateQueries({ queryKey: ["recipients", eventId] });
      toast.success("Acara ditutup.");
    } catch (error) {
      toast.error(error?.message ?? "Acara belum bisa ditutup.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {stats?.insiden_terbuka > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-warn/40 bg-warn-bg p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
          <p className="text-sm font-medium text-warn">
            Masih ada {stats.insiden_terbuka} insiden terbuka. Sebaiknya selesaikan dulu sebelum menutup acara.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Mode retensi data</p>
        <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${mode === "anonim" ? "border-primary bg-ok-bg/50" : "border-border"}`}>
          <input type="radio" name="retensi" value="anonim" checked={mode === "anonim"} onChange={() => setMode("anonim")} className="mt-1" />
          <span>
            <span className="block text-sm font-semibold text-foreground">Anonim (disarankan)</span>
            <span className="block text-sm text-muted-foreground">
              Nama penerima diganti nomor anonim, nomor HP dihapus. Laporan agregat tetap tersimpan.
            </span>
          </span>
        </label>
        <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${mode === "arsip_lpj" ? "border-primary bg-ok-bg/50" : "border-border"}`}>
          <input type="radio" name="retensi" value="arsip_lpj" checked={mode === "arsip_lpj"} onChange={() => setMode("arsip_lpj")} className="mt-1" />
          <span>
            <span className="block text-sm font-semibold text-foreground">Arsip LPJ</span>
            <span className="block text-sm text-muted-foreground">
              Nama disimpan sampai tanggal akhir yang ditentukan, hanya bisa dibuka admin pemilik acara.
            </span>
          </span>
        </label>
      </div>

      {mode === "arsip_lpj" && (
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="akhir">Simpan nama sampai</Label>
          <Input id="akhir" type="date" value={akhir} onChange={(event) => setAkhir(event.target.value)} className="h-11" />
          <p className="text-xs text-muted-foreground">Usulan 6–12 bulan. Hapus data setelah tanggal ini.</p>
        </div>
      )}

      {confirming ? (
        <div className="rounded-lg border border-bad/30 bg-bad-bg p-4">
          <p className="text-sm font-semibold text-bad">Tetap tutup acara dengan insiden terbuka?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button className="h-11 rounded-full px-4 text-sm font-semibold" onClick={() => submit(true)} disabled={busy}>
              Ya, tutup sekarang
            </Button>
            <Button variant="ghost" className="h-11 rounded-full px-4 text-sm font-semibold" onClick={() => setConfirming(false)}>
              Batal
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="destructive" className="h-12 rounded-full px-6 text-base font-semibold" onClick={() => submit(false)} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Lock className="mr-2 h-4 w-4" aria-hidden="true" />}
          Tutup acara
        </Button>
      )}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <StatusPill variant="info">Catatan</StatusPill>
        Setelah ditutup, tautan tiket dan tautan meja berhenti berfungsi.
      </p>
    </div>
  );
}