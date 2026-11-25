import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveSchedule } from "@/lib/admin-fns";
import { groupMinutes, minutesBetween, round } from "@/lib/waveMath";

function toDraft(groups) {
  return groups.map((group) => ({
    groupId: group.id,
    nama: group.nama,
    jumlah_keluarga: group.jumlah_keluarga ?? 0,
    gelombang: String(group.gelombang ?? 1),
    mulai: group.gelombang_mulai ?? "",
    selesai: group.gelombang_selesai ?? "",
    tableId: group.service_table_id ?? "",
  }));
}

export function ScheduleEditor({ eventId, groups, tables, menitPerOrang, utilisasi }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => toDraft(groups));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(toDraft(groups));
  }, [groups]);

  function update(index, key, value) {
    setDraft((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  async function save() {
    const rows = draft
      .filter((row) => row.mulai && row.selesai && row.tableId)
      .map((row) => ({
        groupId: row.groupId,
        gelombang: Number(row.gelombang) || 1,
        mulai: row.mulai,
        selesai: row.selesai,
        tableId: row.tableId,
      }));
    if (!rows.length) {
      toast.error("Isi jam mulai, jam selesai, dan meja untuk minimal satu kelompok.");
      return;
    }
    setSaving(true);
    try {
      await saveSchedule({ data: { eventId, rows } });
      await queryClient.invalidateQueries({ queryKey: ["workspace", eventId] });
      await queryClient.invalidateQueries({ queryKey: ["recipients", eventId] });
      toast.success("Jadwal disimpan.");
    } catch (error) {
      toast.error(error?.message ?? "Jadwal belum bisa disimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Kelompok</th>
              <th className="px-3 py-2">Gelombang</th>
              <th className="px-3 py-2">Mulai</th>
              <th className="px-3 py-2">Selesai</th>
              <th className="px-3 py-2">Meja</th>
              <th className="px-3 py-2">Cek</th>
            </tr>
          </thead>
          <tbody>
            {draft.map((row, index) => {
              const butuh = groupMinutes(row.jumlah_keluarga, menitPerOrang, utilisasi);
              const jendela = minutesBetween(row.mulai, row.selesai);
              const kurang = jendela > 0 && butuh > jendela;
              return (
                <tr key={row.groupId} className="border-t border-border/70">
                  <td className="px-3 py-2 font-semibold text-foreground">{row.nama}</td>
                  <td className="px-3 py-2">
                    <Input
                      className="h-11 w-16"
                      inputMode="numeric"
                      value={row.gelombang}
                      onChange={(e) => update(index, "gelombang", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input type="time" className="h-11 w-28" value={row.mulai} onChange={(e) => update(index, "mulai", e.target.value)} />
                  </td>
                  <td className="px-3 py-2">
                    <Input type="time" className="h-11 w-28" value={row.selesai} onChange={(e) => update(index, "selesai", e.target.value)} />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="h-11 rounded-md border border-input bg-background px-2 text-sm"
                      value={row.tableId}
                      onChange={(e) => update(index, "tableId", e.target.value)}
                    >
                      <option value="">Pilih meja</option>
                      {tables.map((table) => (
                        <option key={table.id} value={table.id}>
                          {table.nama}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-xs font-semibold">
                    {jendela === 0 ? (
                      <span className="text-muted-foreground">Butuh {round(butuh)} mnt</span>
                    ) : kurang ? (
                      <span className="text-bad">Kurang {round(butuh - jendela)} mnt</span>
                    ) : (
                      <span className="text-ok">Cukup</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Button className="h-12 rounded-full px-6 text-base font-semibold" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-2 h-4 w-4" aria-hidden="true" />}
        Simpan jadwal
      </Button>
    </div>
  );
}