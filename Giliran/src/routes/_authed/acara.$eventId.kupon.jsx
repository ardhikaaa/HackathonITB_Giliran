import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Loader2 } from "lucide-react";
import { SectionCard } from "@/components/giliran/EventTabs";
import { GeneratePanel } from "@/components/kupon/GeneratePanel";
import { CouponList } from "@/components/kupon/CouponList";
import { getRecipients } from "@/lib/admin-fns";
import { useEventWorkspace } from "@/hooks/useEventWorkspace";

export const Route = createFileRoute("/_authed/acara/$eventId/kupon")({
  head: () => ({ meta: [{ title: "Kupon — GILIRAN" }] }),
  component: CouponsTab,
});

function CouponsTab() {
  const { eventId } = Route.useParams();
  const { data: workspace } = useEventWorkspace(eventId);
  const { data, isLoading } = useQuery({
    queryKey: ["recipients", eventId],
    queryFn: () => getRecipients({ data: { eventId } }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-warn/40 bg-warn-bg p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden="true" />
        <p className="text-sm font-medium leading-relaxed text-warn">
          Kupon hanya bisa dicetak saat dibuat. Token asli tidak disimpan di basis data, jadi halaman cetak tidak bisa
          dibuka lagi nanti. Jika kertasnya hilang, terbitkan ulang kupon penerima tersebut.
        </p>
      </div>

      <SectionCard title="Buat kupon" description="Satu kupon untuk satu penerima, dengan nomor sobekan urut.">
        {isLoading || !data ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Memuat penerima…
          </div>
        ) : (
          <GeneratePanel eventId={eventId} recipients={data.recipients} />
        )}
      </SectionCard>

      <SectionCard
        title="Kupon per penerima"
        description={
          workspace?.event?.cadangkan_jatah
            ? "Cadangan jatah aktif: kupon memuat kalimat jaminan jatah selama sesi kelompok."
            : "Cadangan jatah tidak aktif."
        }
      >
        {isLoading || !data ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Memuat kupon…
          </div>
        ) : (
          <CouponList eventId={eventId} recipients={data.recipients} />
        )}
      </SectionCard>
    </div>
  );
}