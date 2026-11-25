import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { EventTabs } from "@/components/giliran/EventTabs";
import { StatsGrid } from "@/components/giliran/StatsGrid";
import { StatusPill, EVENT_STATUS_VARIANT } from "@/components/giliran/StatusPill";
import { useEventWorkspace } from "@/hooks/useEventWorkspace";
import { formatTanggal, STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authed/acara/$eventId")({
  component: EventLayout,
});

function EventLayout() {
  const { eventId } = Route.useParams();
  const { data, isLoading, error } = useEventWorkspace(eventId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Memuat acara…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-bad/30 bg-bad-bg p-6">
        <p className="text-base font-semibold text-bad">Acara ini tidak bisa dibuka.</p>
        <p className="mt-1 text-sm text-bad/90">
          Acara hanya bisa dibuka oleh admin yang membuatnya. Periksa kembali akun yang dipakai.
        </p>
        <Link to="/acara" className="mt-4 inline-block text-sm font-semibold text-bad underline underline-offset-4">
          Kembali ke acara saya
        </Link>
      </div>
    );
  }

  const { event, stats } = data;

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Link
          to="/acara"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Acara saya
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{event.nama}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatTanggal(event.tanggal)} · {event.jenis_paket} · stok awal {event.stok_awal} · {event.jumlah_meja} meja
            </p>
          </div>
          <StatusPill variant={EVENT_STATUS_VARIANT[event.status] ?? "info"}>
            {STATUS_LABEL[event.status] ?? event.status}
          </StatusPill>
        </div>
      </div>

      <StatsGrid stats={stats} />
      <EventTabs eventId={eventId} />
      <Outlet />
    </div>
  );
}