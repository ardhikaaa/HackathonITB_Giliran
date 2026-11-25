const ITEMS = [
  { key: "penerima", label: "Penerima", tone: "text-foreground" },
  { key: "diserahkan", label: "Sudah diserahkan", tone: "text-ok" },
  { key: "belum", label: "Belum", tone: "text-foreground" },
  { key: "sisa_stok", label: "Sisa stok", tone: "text-foreground" },
  { key: "percobaan_ganda", label: "Percobaan ganda ditolak", tone: "text-warn" },
];

export function StatsGrid({ stats }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {ITEMS.map((item) => (
        <div key={item.key} className="rounded-xl border border-border bg-card px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</dt>
          <dd className={`mt-1 text-2xl font-bold tabular-nums ${item.tone}`}>{stats?.[item.key] ?? 0}</dd>
        </div>
      ))}
    </dl>
  );
}