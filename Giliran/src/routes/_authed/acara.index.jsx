import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CalendarPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/giliran/EventCard";
import { listMyEvents } from "@/lib/admin-fns";

export const Route = createFileRoute("/_authed/acara/")({
  head: () => ({ meta: [{ title: "Acara saya — GILIRAN" }] }),
  component: EventsPage,
});

function EventsPage() {
  const { data: events, isLoading, error } = useQuery({
    queryKey: ["events"],
    queryFn: () => listMyEvents(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Acara saya</h1>
          <p className="mt-1 text-sm text-muted-foreground">Setiap acara punya buku besar penyerahannya sendiri.</p>
        </div>
        <Button asChild size="lg" className="h-12 rounded-full px-6 text-base font-semibold">
          <Link to="/acara/baru">
            <CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Acara baru
          </Link>
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Memuat daftar acara…
        </div>
      )}

      {error && (
        <p className="rounded-2xl border border-bad/30 bg-bad-bg p-5 text-sm font-medium text-bad">
          Daftar acara belum bisa dimuat. Muat ulang halaman ini.
        </p>
      )}

      {!isLoading && !error && events?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold text-foreground">Belum ada acara</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Buat acara pertama, lalu unggah daftar penerima. Kupon dan jadwal gelombang dibuat setelah daftar penerima
            masuk.
          </p>
          <Button asChild className="mt-5 h-12 rounded-full px-6 text-base font-semibold">
            <Link to="/acara/baru">Buat acara pertama</Link>
          </Button>
        </div>
      )}

      {!isLoading && events?.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}