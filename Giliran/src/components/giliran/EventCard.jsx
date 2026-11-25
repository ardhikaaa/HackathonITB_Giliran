import { Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, Package, Users } from "lucide-react";
import { EVENT_STATUS_VARIANT, StatusPill } from "@/components/giliran/StatusPill";
import { STATUS_LABEL, formatTanggal } from "@/lib/format";

export function EventCard({ event }) {
  const sisaStok = Math.max(Number(event.stok_awal ?? 0) - Number(event.terpakai ?? 0), 0);
  const penerima = Number(event.jumlah_penerima ?? 0);
  const diserahkan = Number(event.diserahkan ?? 0);

  return (
    <Link
      to="/acara/$eventId"
      params={{ eventId: event.id }}
      className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-colors hover:border-foreground/30"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground group-hover:underline">{event.nama}</h2>
          <StatusPill variant={EVENT_STATUS_VARIANT[event.status] ?? "info"}>
            {STATUS_LABEL[event.status] ?? event.status}
          </StatusPill>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            {formatTanggal(event.tanggal)}
          </span>
          {event.jenis_paket && (
            <span className="inline-flex items-center gap-1.5">
              <Package className="h-4 w-4" aria-hidden="true" />
              {event.jenis_paket}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
        <div className="flex items-center gap-4 text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4" aria-hidden="true" />
            <strong className="text-foreground">{diserahkan}</strong>/{penerima} penerima
          </span>
          <span>
            Sisa stok: <strong className="text-foreground">{sisaStok}</strong>
          </span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
      </div>
    </Link>
  );
}
