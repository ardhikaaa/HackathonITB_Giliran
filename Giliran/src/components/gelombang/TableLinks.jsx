import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Link2, Link2Off, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/giliran/StatusPill";
import { createTableLink, revokeTableLink } from "@/lib/admin-fns";

export function TableLinks({ eventId, tables, groups }) {
  const queryClient = useQueryClient();
  const [links, setLinks] = useState({});
  const [busy, setBusy] = useState("");

  async function create(table) {
    setBusy(table.id);
    try {
      const result = await createTableLink({ data: { eventId, tableId: table.id } });
      const url = `${window.location.origin}/meja?t=${result.token}`;
      setLinks((prev) => ({ ...prev, [table.id]: url }));
      await queryClient.invalidateQueries({ queryKey: ["workspace", eventId] });
      toast.success(`Tautan ${table.nama} dibuat. Simpan sekarang, tautan lama tidak berlaku lagi.`);
    } catch (error) {
      toast.error(error?.message ?? "Tautan belum bisa dibuat.");
    } finally {
      setBusy("");
    }
  }

  async function revoke(table) {
    setBusy(table.id);
    try {
      await revokeTableLink({ data: { eventId, tableId: table.id } });
      setLinks((prev) => ({ ...prev, [table.id]: null }));
      await queryClient.invalidateQueries({ queryKey: ["workspace", eventId] });
      toast.success(`Tautan ${table.nama} dicabut.`);
    } catch (error) {
      toast.error(error?.message ?? "Tautan belum bisa dicabut.");
    } finally {
      setBusy("");
    }
  }

  async function copy(url) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Tautan disalin.");
    } catch {
      toast.error("Tautan tidak bisa disalin otomatis. Salin manual dari kotak.");
    }
  }

  return (
    <div className="space-y-3">
      {tables.map((table) => {
        const assigned = groups.filter((group) => group.service_table_id === table.id).map((group) => group.nama);
        const url = links[table.id];
        return (
          <div key={table.id} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-base font-semibold text-foreground">{table.nama}</p>
                <p className="text-sm text-muted-foreground">
                  {assigned.length ? assigned.join(", ") : "Belum ada kelompok yang ditugaskan"}
                </p>
              </div>
              <StatusPill variant={table.status_tautan === "aktif" ? "ok" : "info"}>
                {table.status_tautan === "aktif" ? "Tautan aktif" : "Tautan dicabut"}
              </StatusPill>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                className="h-11 rounded-full px-4 text-sm font-semibold"
                onClick={() => create(table)}
                disabled={busy === table.id}
              >
                {busy === table.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />}
                {table.status_tautan === "aktif" ? "Buat tautan baru" : "Buat tautan petugas"}
              </Button>
              {table.status_tautan === "aktif" && (
                <Button variant="outline" className="h-11 rounded-full px-4 text-sm font-semibold" onClick={() => revoke(table)} disabled={busy === table.id}>
                  <Link2Off className="mr-2 h-4 w-4" aria-hidden="true" />
                  Cabut tautan
                </Button>
              )}
            </div>
            {url && (
              <div className="mt-3 rounded-lg bg-ok-bg p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-ok">Tautan hanya tampil sekali</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 break-all rounded bg-card px-2 py-1.5 text-xs text-foreground">{url}</code>
                  <Button size="sm" variant="secondary" className="h-9 rounded-full px-3" onClick={() => copy(url)}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Salin
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}