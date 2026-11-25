import { useQuery } from "@tanstack/react-query";
import { Loader2, PackageCheck, PackageOpen, PackageX } from "lucide-react";
import { getStock } from "@/lib/ticket-fns";

export function StockPanel({ eventId }) {
  const { data, isLoading } = useQuery({
    queryKey: ["stock", eventId],
    queryFn: () => getStock({ data: { eventId } }),
    refetchInterval: 30000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Memuat stok…
      </div>
    );
  }

  const cards = [
    { label: "Stok awal", value: data.stok_awal, Icon: PackageOpen, tone: "text-foreground" },
    { label: "Paket diserahkan", value: data.diserahkan, Icon: PackageCheck, tone: "text-ok" },
    { label: "Sisa paket", value: data.sisa, Icon: PackageX, tone: data.sisa < 0 ? "text-bad" : "text-foreground" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map(({ label, value, Icon, tone }) => (
          <div key={label} className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </div>
            <p className={`mt-1 text-3xl font-bold tabular-nums ${tone}`}>{value}</p>
          </div>
        ))}
      </div>

      {data.cadangkan_jatah && (
        <div className="rounded-xl border border-border bg-secondary/40 p-4">
          <p className="text-sm font-bold text-foreground">Dicadangkan untuk gelombang yang belum dilayani</p>
          {data.dicadangkan.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Semua kelompok sudah dilayani.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {data.dicadangkan.map((item) => (
                <li key={item.gelombang} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Gelombang {item.gelombang}</span>
                  <span className="font-semibold tabular-nums text-foreground">{item.jumlah} paket</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Stok dihitung per paket: satu keluarga mengurangi stok sebanyak jumlah anggotanya. Diperbarui otomatis tiap 30
        detik dan tidak pernah turun di bawah nol.
      </p>
    </div>
  );
}