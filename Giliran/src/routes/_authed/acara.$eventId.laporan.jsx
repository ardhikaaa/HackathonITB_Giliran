import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/giliran/EventTabs";
import { Reconciliation } from "@/components/laporan/Reconciliation";
import { CloseEventCard } from "@/components/laporan/CloseEventCard";
import { IncidentPanel } from "@/components/insiden/IncidentPanel";
import { useEventWorkspace } from "@/hooks/useEventWorkspace";

export const Route = createFileRoute("/_authed/acara/$eventId/laporan")({
  head: () => ({ meta: [{ title: "Laporan — GILIRAN" }] }),
  component: ReportTab,
});

function ReportTab() {
  const { eventId } = Route.useParams();
  const { data } = useEventWorkspace(eventId);

  return (
    <div className="space-y-5">
      <SectionCard
        title="Rekonsiliasi tiga arah"
        description="Catatan digital, sobekan fisik, dan stok harus sama. Masukkan dua angka fisik di bawah."
      >
        <Reconciliation eventId={eventId} />
      </SectionCard>

      <SectionCard
        title="Konflik yang ditandai"
        description="Bandingkan nomor sobekan fisik, lalu tentukan penyelesaiannya. Sistem tidak memutuskan otomatis."
      >
        <IncidentPanel eventId={eventId} />
      </SectionCard>

      {data && (
        <SectionCard title="Penutupan acara" description="Pilih mode retensi dan tutup acara setelah laporan cocok.">
          <CloseEventCard eventId={eventId} event={data.event} stats={data.stats} />
        </SectionCard>
      )}
    </div>
  );
}