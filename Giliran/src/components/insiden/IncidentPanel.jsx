import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/giliran/StatusPill";
import { getRecipients } from "@/lib/admin-fns";
import { listIncidents, markIncident, resolveIncident, reissueTicket } from "@/lib/ticket-fns";
import { appendCoupons } from "@/lib/couponStore";

const JENIS = [
  { value: "kupon_ganda", label: "Kupon ganda" },
  { value: "fotokopi", label: "Kupon difotokopi" },
  { value: "konflik", label: "Konflik klaim" },
  { value: "lainnya", label: "Lainnya" },
];

const JENIS_LABEL = Object.fromEntries(JENIS.map((item) => [item.value, item.label]));

export function IncidentPanel({ eventId }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({ recipientId: "", jenis: "kupon_ganda", catatan: "" });
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState("");

  const { data: incidents, isLoading } = useQuery({
    queryKey: ["incidents", eventId],
    queryFn: () => listIncidents({ data: { eventId } }),
  });
  const { data: recipients } = useQuery({
    queryKey: ["recipients", eventId],
    queryFn: () => getRecipients({ data: { eventId } }),
  });

  const withTickets = (recipients?.recipients ?? []).filter((row) => row.tiket);

  async function submit(event) {
    event.preventDefault();
    const recipient = withTickets.find((row) => row.id === form.recipientId);
    if (!recipient) {
      toast.error("Pilih penerima yang punya kupon.");
      return;
    }
    setBusy("new");
    try {
      await markIncident({
        data: { eventId, ticketId: recipient.tiket.id, jenis: form.jenis, catatan: form.catatan },
      });
      await queryClient.invalidateQueries({ queryKey: ["incidents", eventId] });
      await queryClient.invalidateQueries({ queryKey: ["workspace", eventId] });
      setForm({ recipientId: "", jenis: "kupon_ganda", catatan: "" });
      toast.success("Insiden ditandai.");
    } catch (error) {
      toast.error(error?.message ?? "Insiden belum bisa ditandai.");
    } finally {
      setBusy("");
    }
  }

  async function finish(incident) {
    setBusy(incident.id);
    try {
      await resolveIncident({ data: { eventId, incidentId: incident.id, catatan: notes[incident.id] ?? incident.catatan_admin ?? "" } });
      await queryClient.invalidateQueries({ queryKey: ["incidents", eventId] });
      await queryClient.invalidateQueries({ queryKey: ["workspace", eventId] });
      toast.success("Insiden ditandai selesai.");
    } catch (error) {
      toast.error(error?.message ?? "Insiden belum bisa diselesaikan.");
    } finally {
      setBusy("");
    }
  }

  async function reissue(incident) {
    if (!incident.recipient_id) {
      toast.error("Penerima untuk insiden ini tidak ditemukan.");
      return;
    }
    setBusy(incident.id);
    try {
      const result = await reissueTicket({ data: { eventId, recipientId: incident.recipient_id } });
      appendCoupons(eventId, [result.coupon]);
      await queryClient.invalidateQueries({ queryKey: ["recipients", eventId] });
      await queryClient.invalidateQueries({ queryKey: ["workspace", eventId] });
      toast.success("Kupon baru dibuat untuk penerima asli.");
      navigate({ to: "/acara/$eventId/cetak", params: { eventId } });
    } catch (error) {
      toast.error(error?.message ?? "Kupon belum bisa diterbitkan ulang.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="grid gap-2 rounded-xl border border-border p-4 sm:grid-cols-[1fr_auto_auto_auto]">
        <select
          value={form.recipientId}
          onChange={(event) => setForm({ ...form, recipientId: event.target.value })}
          className="h-11 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Pilih penerima"
        >
          <option value="">Pilih penerima…</option>
          {withTickets.map((row) => (
            <option key={row.id} value={row.id}>
              #{row.tiket.nomor_sobekan} · {row.nama} · {row.kelompok}
            </option>
          ))}
        </select>
        <select
          value={form.jenis}
          onChange={(event) => setForm({ ...form, jenis: event.target.value })}
          className="h-11 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Jenis insiden"
        >
          {JENIS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <Input
          value={form.catatan}
          onChange={(event) => setForm({ ...form, catatan: event.target.value })}
          placeholder="Catatan (opsional)"
          className="h-11"
        />
        <Button type="submit" className="h-11 rounded-full px-4 text-sm font-semibold" disabled={busy === "new"}>
          {busy === "new" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="mr-2 h-4 w-4" aria-hidden="true" />}
          Tandai insiden
        </Button>
      </form>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Memuat insiden…
        </div>
      )}

      {incidents && incidents.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Belum ada insiden di acara ini.
        </p>
      )}

      {incidents && incidents.length > 0 && (
        <ul className="space-y-3">
          {incidents.map((incident) => (
            <li key={incident.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill variant={incident.status === "terbuka" ? "warn" : "ok"}>
                  {incident.status === "terbuka" ? "Terbuka" : "Selesai"}
                </StatusPill>
                <span className="text-sm font-semibold text-foreground">{JENIS_LABEL[incident.jenis] ?? incident.jenis}</span>
                <span className="text-sm text-muted-foreground">
                  Sobekan #{incident.nomor_sobekan ?? "—"} · {incident.penerima || "penerima tidak diketahui"}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{incident.catatan_admin || "Tanpa catatan."}</p>
              {incident.status === "terbuka" && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Input
                    className="h-10 max-w-sm"
                    placeholder="Catatan penyelesaian"
                    value={notes[incident.id] ?? ""}
                    onChange={(event) => setNotes({ ...notes, [incident.id]: event.target.value })}
                  />
                  <Button size="sm" className="h-10 rounded-full px-4 text-xs font-semibold" onClick={() => finish(incident)} disabled={busy === incident.id}>
                    Tandai selesai
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 rounded-full px-4 text-xs font-semibold"
                    onClick={() => reissue(incident)}
                    disabled={busy === incident.id}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Terbitkan ulang untuk penerima asli
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}