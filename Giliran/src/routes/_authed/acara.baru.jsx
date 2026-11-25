import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { EventForm } from "@/components/giliran/EventForm";

export const Route = createFileRoute("/_authed/acara/baru")({
  head: () => ({ meta: [{ title: "Acara baru — GILIRAN" }] }),
  component: NewEventPage,
});

function NewEventPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/acara" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kembali ke acara saya
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Acara baru</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Isi data dasar acara. Penerima, jadwal, dan kupon diatur setelah ini.
        </p>
      </div>
      <EventForm />
    </div>
  );
}