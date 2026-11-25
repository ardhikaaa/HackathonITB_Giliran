import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { ImportPanel } from "@/components/penerima/ImportPanel";
import { RecipientTable } from "@/components/penerima/RecipientTable";
import { SectionCard } from "@/components/giliran/EventTabs";
import { getRecipients } from "@/lib/admin-fns";

export const Route = createFileRoute("/_authed/acara/$eventId/penerima")({
  head: () => ({ meta: [{ title: "Penerima — GILIRAN" }] }),
  component: RecipientsTab,
});

function RecipientsTab() {
  const { eventId } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["recipients", eventId],
    queryFn: () => getRecipients({ data: { eventId } }),
  });

  return (
    <div className="space-y-5">
      <ImportPanel eventId={eventId} />
      <SectionCard title="Daftar penerima" description="Dikelompokkan otomatis dari kolom kelompok pada CSV.">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Memuat penerima…
          </div>
        )}
        {error && <p className="text-sm font-semibold text-bad">Daftar penerima belum bisa dimuat.</p>}
        {data && <RecipientTable recipients={data.recipients} groups={data.groups} />}
      </SectionCard>
    </div>
  );
}