import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/giliran/EventTabs";
import { AuditTable } from "@/components/log/AuditTable";

export const Route = createFileRoute("/_authed/acara/$eventId/log")({
  head: () => ({ meta: [{ title: "Log — GILIRAN" }] }),
  component: LogTab,
});

function LogTab() {
  const { eventId } = Route.useParams();
  return (
    <SectionCard title="Log audit" description="Setiap pemindaian dan aksi penting dicatat: waktu, aksi, meja, dan hasilnya.">
      <AuditTable eventId={eventId} />
    </SectionCard>
  );
}