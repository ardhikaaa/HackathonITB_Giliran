import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Download, FileUp, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/giliran/EventTabs";
import { downloadCsvTemplate, parseRecipientCsv, validateRows } from "@/lib/csv";
import { saveRecipients } from "@/lib/admin-fns";

const EMPTY = { nama: "", kelompok: "", jumlah_anggota: "", hp: "" };

export function ImportPanel({ eventId }) {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [manual, setManual] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const checked = validateRows(rows);
  const bermasalah = checked.filter((row) => row.errors.length > 0).length;
  const valid = checked.filter((row) => row.errors.length === 0);

  function update(index, key, value) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  async function onFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseRecipientCsv(text);
    if (!parsed.length) {
      toast.error("Berkas tidak berisi baris yang bisa dibaca.");
      return;
    }
    setRows((prev) => [...prev, ...parsed]);
    toast.success(`${parsed.length} baris dibaca. Periksa dulu sebelum disimpan.`);
    if (fileRef.current) fileRef.current.value = "";
  }

  function addManual() {
    if (!manual.nama.trim() || !manual.kelompok.trim()) {
      toast.error("Nama dan kelompok wajib diisi.");
      return;
    }
    setRows((prev) => [...prev, { ...manual }]);
    setManual(EMPTY);
  }

  async function save(list) {
    if (!list.length) return;
    setSaving(true);
    try {
      const result = await saveRecipients({
        data: {
          eventId,
          rows: list.map((row) => ({
            nama: row.nama.trim(),
            kelompok: row.kelompok.trim(),
            jumlah_anggota: Number(row.jumlah_anggota),
            hp: row.hp ?? "",
          })),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["recipients", eventId] });
      await queryClient.invalidateQueries({ queryKey: ["workspace", eventId] });
      toast.success(`${result.saved} penerima disimpan.`);
      setRows([]);
    } catch (error) {
      toast.error(error?.message ?? "Penerima belum bisa disimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="Tambah penerima"
      description="Kolom yang dipakai hanya nama, kelompok, jumlah anggota, dan nomor HP (opsional)."
      action={
        <Button variant="outline" className="h-11 rounded-full px-4 text-sm font-semibold" onClick={downloadCsvTemplate}>
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          Unduh templat CSV
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="csv" className="text-sm font-semibold">
            Unggah CSV
          </Label>
          <label
            htmlFor="csv"
            className="mt-2 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-secondary/60 text-sm font-semibold text-foreground hover:border-primary/50"
          >
            <FileUp className="h-4 w-4" aria-hidden="true" />
            Pilih berkas CSV
          </label>
          <input ref={fileRef} id="csv" type="file" accept=".csv,text/csv" className="sr-only" onChange={onFile} />
        </div>
        <div className="rounded-lg border border-border bg-secondary/40 p-3">
          <p className="text-sm font-semibold text-foreground">Input manual</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Input placeholder="Nama" value={manual.nama} onChange={(e) => setManual({ ...manual, nama: e.target.value })} />
            <Input placeholder="Kelompok" value={manual.kelompok} onChange={(e) => setManual({ ...manual, kelompok: e.target.value })} />
            <Input placeholder="Anggota" inputMode="numeric" value={manual.jumlah_anggota} onChange={(e) => setManual({ ...manual, jumlah_anggota: e.target.value })} />
            <Input placeholder="HP (opsional)" value={manual.hp} onChange={(e) => setManual({ ...manual, hp: e.target.value })} />
          </div>
          <Button variant="secondary" className="mt-2 h-10 w-full rounded-full text-sm font-semibold" onClick={addManual}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Tambah ke daftar
          </Button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-foreground">{rows.length} baris diperiksa</span>
            {bermasalah > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-bg px-2.5 py-1 font-semibold text-warn">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                {bermasalah} baris bermasalah
              </span>
            ) : (
              <span className="rounded-full bg-ok-bg px-2.5 py-1 font-semibold text-ok">Semua baris siap</span>
            )}
          </div>

          <div className="max-h-80 overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Kelompok</th>
                  <th className="px-3 py-2">Anggota</th>
                  <th className="px-3 py-2">HP</th>
                  <th className="px-3 py-2">Periksa</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {checked.map((row, index) => (
                  <tr key={index} className={row.errors.length ? "bg-warn-bg/50" : "bg-card"}>
                    <td className="px-2 py-1.5">
                      <Input className="h-10" value={row.nama} onChange={(e) => update(index, "nama", e.target.value)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input className="h-10" value={row.kelompok} onChange={(e) => update(index, "kelompok", e.target.value)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input className="h-10 w-20" inputMode="numeric" value={row.jumlah_anggota} onChange={(e) => update(index, "jumlah_anggota", e.target.value)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input className="h-10" value={row.hp} onChange={(e) => update(index, "hp", e.target.value)} />
                    </td>
                    <td className="px-3 py-1.5 text-xs font-semibold text-warn">{row.errors.join(" · ") || "—"}</td>
                    <td className="px-2 py-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Hapus baris"
                        onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              className="h-12 rounded-full px-6 text-base font-semibold"
              disabled={saving || valid.length === 0}
              onClick={() => save(valid)}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="mr-2 h-4 w-4" aria-hidden="true" />}
              Simpan {valid.length} baris valid
            </Button>
            {bermasalah > 0 && (
              <Button
                variant="outline"
                className="h-12 rounded-full px-5 text-sm font-semibold"
                onClick={() => setRows(valid)}
              >
                Lewati baris bermasalah
              </Button>
            )}
            <Button variant="ghost" className="h-12 rounded-full px-5 text-sm font-semibold" onClick={() => setRows([])}>
              Batalkan
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}