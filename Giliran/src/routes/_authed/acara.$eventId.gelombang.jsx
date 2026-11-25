import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SectionCard } from "@/components/giliran/EventTabs";
import { CapacityCalculator } from "@/components/gelombang/CapacityCalculator";
import { ScheduleEditor } from "@/components/gelombang/ScheduleEditor";
import { TableLinks } from "@/components/gelombang/TableLinks";
import { EventSettings } from "@/components/gelombang/EventSettings";
import { useEventWorkspace } from "@/hooks/useEventWorkspace";
import { saveSchedule } from "@/lib/admin-fns";

export const Route = createFileRoute("/_authed/acara/$eventId/gelombang")({
  head: () => ({ meta: [{ title: "Gelombang — GILIRAN" }] }),
  component: WavesTab,
});

function WavesTab() {
  const { eventId } = Route.useParams();
  const { data, isLoading } = useEventWorkspace(eventId);
  const queryClient = useQueryClient();
  const [applying, setApplying] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Memuat gelombang…
      </div>
    );
  }

  const { event, groups, tables } = data;

  async function applySuggested(waves) {
    const rows = [];
    for (const wave of waves) {
      for (const item of wave.groups) {
        const table = tables[item.tableIndex];
        if (!table) continue;
        rows.push({
          groupId: item.groupId,
          gelombang: wave.gelombang,
          mulai: wave.mulai,
          selesai: wave.selesai,
          tableId: table.id,
        });
      }
    }
    if (!rows.length) {
      toast.error("Usulan belum bisa diterapkan. Periksa jumlah meja dan kelompok.");
      return;
    }
    setApplying(true);
    try {
      await saveSchedule({ data: { eventId, rows } });
      await queryClient.invalidateQueries({ queryKey: ["workspace", eventId] });
      toast.success("Usulan gelombang diterapkan. Jam masih bisa diubah manual.");
    } catch (error) {
      toast.error(error?.message ?? "Usulan belum bisa diterapkan.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-5">
      <SectionCard
        title="Kalkulator kapasitas"
        description="Sistem hanya memberi usulan. Admin tetap menetapkan jam dan meja per kelompok."
      >
        <CapacityCalculator
          groups={groups}
          tables={tables}
          menitPerOrang={Number(event.menit_per_orang ?? 2)}
          utilisasi={Number(event.faktor_utilisasi ?? 0.8)}
          onApply={applySuggested}
          applying={applying}
        />
      </SectionCard>

      <SectionCard title="Jadwal per kelompok" description="Satu kelompok dilayani satu meja.">
        <ScheduleEditor
          eventId={eventId}
          groups={groups}
          tables={tables}
          menitPerOrang={Number(event.menit_per_orang ?? 2)}
          utilisasi={Number(event.faktor_utilisasi ?? 0.8)}
        />
      </SectionCard>

      <SectionCard
        title="Tautan petugas per meja"
        description="Tautan ini yang dibuka petugas. Tautan hanya tampil sekali setelah dibuat."
      >
        <TableLinks eventId={eventId} tables={tables} groups={groups} />
      </SectionCard>

      <SectionCard title="Pengaturan acara" description="Angka rumus dan opsi yang memengaruhi kupon serta halaman meja.">
        <EventSettings event={event} />
      </SectionCard>
    </div>
  );
}