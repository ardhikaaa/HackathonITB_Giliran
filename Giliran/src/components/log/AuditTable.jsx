import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { StatusPill } from "@/components/giliran/StatusPill";
import { Button } from "@/components/ui/button";
import { listLogs } from "@/lib/ticket-fns";
import { formatJam, formatTanggal } from "@/lib/format";

const FILTERS = [
  { value: "semua", label: "Semua" },
  { value: "berhasil", label: "Berhasil" },
  { value: "ditolak", label: "Ditolak" },
  { value: "percobaan_ganda", label: "Percobaan ganda" },
];

const VARIANT = { berhasil: "ok", ditolak: "bad", percobaan_ganda: "warn" };
const LABEL = { berhasil: "Berhasil", ditolak: "Ditolak", percobaan_ganda: "Percobaan ganda" };

export function AuditTable({ eventId }) {
  const [filter, setFilter] = useState("semua");
  const { data, isLoading } = useQuery({
    queryKey: ["logs", eventId, filter],
    queryFn: () => listLogs({ data: { eventId, hasil: filter } }),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={filter === item.value ? "default" : "outline"}
            className="h-9 rounded-full px-3 text-xs font-semibold"
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Memuat log…
        </div>
      )}

      {data && data.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Belum ada catatan untuk filter ini.
        </p>
      )}

      {data && data.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Waktu</th>
                <th className="px-4 py-2">Aksi</th>
                <th className="px-4 py-2">Meja</th>
                <th className="px-4 py-2">Hasil</th>
                <th className="px-4 py-2">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {data.map((log) => (
                <tr key={log.id} className="border-t border-border/70 align-top">
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                    {formatTanggal(log.waktu)} · {formatJam(log.waktu)}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-foreground">{log.aksi.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{log.meja}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill variant={VARIANT[log.hasil] ?? "info"}>{LABEL[log.hasil] ?? log.hasil}</StatusPill>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{log.detail || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}