import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateEventSettings } from "@/lib/admin-fns";

export function EventSettings({ event }) {
  const queryClient = useQueryClient();
  const [utilisasi, setUtilisasi] = useState(String(event.faktor_utilisasi ?? 0.8));
  const [menit, setMenit] = useState(String(event.menit_per_orang ?? 2));
  const [saving, setSaving] = useState(false);

  async function patch(data, message) {
    setSaving(true);
    try {
      await updateEventSettings({ data: { eventId: event.id, patch: data } });
      await queryClient.invalidateQueries({ queryKey: ["workspace", event.id] });
      toast.success(message);
    } catch (error) {
      toast.error(error?.message ?? "Pengaturan belum bisa disimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="utilisasi">Faktor utilisasi</Label>
          <Input id="utilisasi" value={utilisasi} onChange={(e) => setUtilisasi(e.target.value)} className="h-11" inputMode="decimal" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="menit">Menit per orang</Label>
          <Input id="menit" value={menit} onChange={(e) => setMenit(e.target.value)} className="h-11" inputMode="decimal" />
        </div>
        <div className="flex items-end">
          <Button
            variant="secondary"
            className="h-11 w-full rounded-full text-sm font-semibold"
            disabled={saving}
            onClick={() =>
              patch(
                { faktor_utilisasi: Number(utilisasi), menit_per_orang: Number(menit) },
                "Rumus kapasitas diperbarui.",
              )
            }
          >
            Simpan angka rumus
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Cadangkan jatah</p>
            <p className="text-sm text-muted-foreground">
              Kupon mencantumkan kalimat jaminan jatah selama sesi kelompok. Stok tetap dipantau di tab Stok.
            </p>
          </div>
          <Switch
            checked={!!event.cadangkan_jatah}
            onCheckedChange={(value) => patch({ cadangkan_jatah: value }, value ? "Jatah dicadangkan." : "Cadangan jatah dimatikan.")}
            aria-label="Cadangkan jatah"
          />
        </div>
        <div className="flex items-start justify-between gap-4 border-t border-border pt-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Mode offline petugas</p>
            <p className="text-sm text-muted-foreground">
              Halaman meja menyimpan salinan tiket kelompok yang ditugaskan agar bisa memindai tanpa sinyal.
            </p>
          </div>
          <Switch
            checked={event.mode_offline !== false}
            onCheckedChange={(value) => patch({ mode_offline: value }, value ? "Mode offline dinyalakan." : "Mode offline dimatikan.")}
            aria-label="Mode offline"
          />
        </div>
      </div>
    </div>
  );
}