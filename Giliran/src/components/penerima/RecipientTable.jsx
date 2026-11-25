import { StatusPill } from "@/components/giliran/StatusPill";

const TICKET_VARIANT = { aktif: "ok", dipakai: "info", dicabut: "bad" };
const TICKET_LABEL = { aktif: "Kupon aktif", dipakai: "Sudah diambil", dicabut: "Kupon dicabut" };

export function RecipientTable({ recipients, groups }) {
  if (!recipients.length) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
        Belum ada penerima. Unggah CSV atau tambahkan manual di atas.
      </p>
    );
  }

  const byGroup = new Map();
  for (const recipient of recipients) {
    if (!byGroup.has(recipient.kelompok)) byGroup.set(recipient.kelompok, []);
    byGroup.get(recipient.kelompok).push(recipient);
  }
  const order = groups.map((group) => group.nama);
  const names = [...byGroup.keys()].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  return (
    <div className="space-y-5">
      {names.map((nama) => {
        const list = byGroup.get(nama);
        return (
          <div key={nama} className="overflow-hidden rounded-xl border border-border">
            <div className="flex items-center justify-between gap-2 bg-secondary px-4 py-2.5">
              <h3 className="text-sm font-bold uppercase tracking-wide text-secondary-foreground">{nama}</h3>
              <span className="text-sm font-semibold text-muted-foreground">{list.length} keluarga</span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Nama</th>
                  <th className="px-4 py-2">Anggota</th>
                  <th className="hidden px-4 py-2 sm:table-cell">HP</th>
                  <th className="px-4 py-2">Kupon</th>
                </tr>
              </thead>
              <tbody>
                {list.map((recipient) => (
                  <tr key={recipient.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-foreground">{recipient.nama}</td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{recipient.jumlah_anggota}</td>
                    <td className="hidden px-4 py-2.5 tabular-nums text-muted-foreground sm:table-cell">
                      {recipient.hp || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {recipient.tiket ? (
                        <StatusPill variant={TICKET_VARIANT[recipient.tiket.status] ?? "info"}>
                          {TICKET_LABEL[recipient.tiket.status] ?? recipient.tiket.status}
                        </StatusPill>
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">Belum dibuat</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}