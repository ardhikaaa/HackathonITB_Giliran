import { AlertTriangle, CheckCircle2, Calculator, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clockLabel, groupMinutes, minutesBetween, nominalPerHour, round, singleTableMinutes, suggestWaves, windowCapacity } from "@/lib/waveMath";

function Formula({ label, expression, result }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm text-foreground">{expression}</p>
      <p className="mt-1 text-base font-bold text-primary">{result}</p>
    </div>
  );
}

export function CapacityCalculator({ groups, tables, menitPerOrang, utilisasi, onApply, applying }) {
  const totalKeluarga = groups.reduce((sum, group) => sum + Number(group.jumlah_keluarga ?? 0), 0);
  const tableCount = Math.max(1, tables.length);
  const suggested = suggestWaves(groups, tableCount, menitPerOrang, utilisasi);
  const longestWindow = suggested[0]?.jendela ?? 0;
  const single = singleTableMinutes(totalKeluarga, menitPerOrang, utilisasi);

  if (!groups.length) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
        Belum ada kelompok. Tambahkan penerima dulu di tab Penerima.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Formula
          label="Kapasitas nominal per meja per jam"
          expression={`60 ÷ ${menitPerOrang}`}
          result={`${round(nominalPerHour(menitPerOrang))} orang/jam`}
        />
        <Formula
          label="Waktu satu kelompok di satu meja"
          expression={`keluarga × ${menitPerOrang} ÷ ${utilisasi}`}
          result={`${round(groupMinutes(50, menitPerOrang, utilisasi))} menit untuk 50 keluarga`}
        />
        <Formula
          label="Kapasitas per meja per gelombang"
          expression={`(${longestWindow} ÷ ${menitPerOrang}) × ${utilisasi}`}
          result={`${round(windowCapacity(longestWindow, menitPerOrang, utilisasi))} keluarga`}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Kelompok</th>
              <th className="px-4 py-2">Keluarga</th>
              <th className="px-4 py-2">Butuh waktu</th>
              <th className="px-4 py-2">Jendela sekarang</th>
              <th className="px-4 py-2">Periksa</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const butuh = groupMinutes(group.jumlah_keluarga, menitPerOrang, utilisasi);
              const jendela = minutesBetween(group.gelombang_mulai, group.gelombang_selesai);
              const lewat = jendela > 0 && butuh > jendela;
              return (
                <tr key={group.id} className="border-t border-border/70">
                  <td className="px-4 py-2.5 font-semibold text-foreground">{group.nama}</td>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{group.jumlah_keluarga ?? 0}</td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold text-foreground">{round(butuh)} menit</td>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                    {jendela > 0 ? `${jendela} menit` : "Belum diatur"}
                  </td>
                  <td className="px-4 py-2.5">
                    {jendela === 0 ? (
                      <span className="text-xs font-semibold text-muted-foreground">Belum ada jendela</span>
                    ) : lewat ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-bad-bg px-2.5 py-1 text-xs font-bold text-bad">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                        Jendela kurang {round(butuh - jendela)} menit
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-2.5 py-1 text-xs font-bold text-ok">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Cukup
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-primary/25 bg-ok-bg/60 p-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-primary">Usulan gelombang</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Usulan saja. Admin tetap menetapkan jam dan meja di tabel bawah.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {suggested.map((wave) => (
            <div key={wave.gelombang} className="rounded-lg border border-border bg-card p-3">
              <p className="text-sm font-bold text-foreground">
                Gelombang {wave.gelombang} · {wave.mulai}–{wave.selesai}
              </p>
              <p className="text-xs text-muted-foreground">Jendela {wave.jendela} menit</p>
              <ul className="mt-2 space-y-1 text-sm text-foreground">
                {wave.groups.map((item) => (
                  <li key={item.groupId} className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.nama}</span>
                    <span className="text-muted-foreground">{tables[item.tableIndex]?.nama ?? "Meja ?"}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Button className="mt-4 h-12 rounded-full px-6 text-base font-semibold" onClick={() => onApply(suggested)} disabled={applying}>
          <Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Terapkan usulan ini
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Estimasi jika hanya satu meja dipakai</p>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {totalKeluarga} keluarga × {menitPerOrang} ÷ {utilisasi}
        </p>
        <p className="mt-1 text-lg font-bold text-foreground">
          {round(single)} menit{" "}
          <span className="text-sm font-medium text-muted-foreground">
            (≈ {clockLabel(Math.round(single))} jam-menit, satu meja tanpa henti)
          </span>
        </p>
      </div>
    </div>
  );
}