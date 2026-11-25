import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/giliran/EventTabs";
import { StockPanel } from "@/components/stok/StockPanel";

export const Route = createFileRoute("/_authed/acara/$eventId/stok")({
  head: () => ({ meta: [{ title: "Stok — GILIRAN" }] }),
  component: StockTab,
});

function StockTab() {
  const { eventId } = Route.useParams();
  return (
    <SectionCard title="Stok acara" description="Stok awal dikurangi jumlah penyerahan yang tercatat.">
      <StockPanel eventId={eventId} />
    </SectionCard>
  );
}