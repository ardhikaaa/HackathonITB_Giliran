import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/giliran/EventTabs";
import { IncidentPanel } from "@/components/insiden/IncidentPanel";

export const Route = createFileRoute("/_authed/acara/$eventId/insiden")({
  head: () => ({ meta: [{ title: "Insiden — GILIRAN" }] }),
  component: IncidentTab,
});

function IncidentTab() {
  const { eventId } = Route.useParams();
  return (
    <SectionCard
      title="Insiden"
      description="Kupon ganda, fotokopi, atau konflik klaim. Admin yang memutuskan, bukan jam ponsel."
    >
      <IncidentPanel eventId={eventId} />
    </SectionCard>
  );
}