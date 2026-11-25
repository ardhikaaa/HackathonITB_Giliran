import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/giliran/StatusPill";
import { reissueTicket } from "@/lib/ticket-fns";
import { appendCoupons } from "@/lib/couponStore";

const TICKET_VARIANT = { aktif: "ok", dipakai: "info", dicabut: "bad" };
const TICKET_LABEL = { aktif: "Aktif", dipakai: "Sudah diambil", dicabut: "Dicabut" };

export function CouponList({ eventId, recipients }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState("");

  async function reissue(recipient) {
    setBusy(recipient.id);
    try {
      const result = await reissueTicket({ data: { eventId, recipientId: recipient.id } });
      appendCoupons(eventId, [result.coupon]);
      await queryClient.invalidateQueries({ queryKey: ["recipients", eventId] });
      await queryClient.invalidateQueries({ queryKey: ["workspace", eventId] });
      toast.success(`Kupon baru untuk ${recipient.nama}. Kupon lama tidak berlaku.`);
      navigate({ to: "/acara/$eventId/cetak", params: { eventId } });
    } catch (error) {
      toast.error(error?.message ?? "Kupon belum bisa diterbitkan ulang.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2">Sobekan</th>
            <th className="px-4 py-2">Nama</th>
            <th className="px-4 py-2">Kelompok</th>
            <th className="px-4 py-2">Kode</th>
            <th className="px-4 py-2">Versi</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {recipients.map((recipient) => (
            <tr key={recipient.id} className="border-t border-border/70">
              <td className="px-4 py-2.5 tabular-nums font-semibold text-foreground">
                {recipient.tiket?.nomor_sobekan ?? "—"}
              </td>
              <td className="px-4 py-2.5 text-foreground">{recipient.nama}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{recipient.kelompok}</td>
              <td className="px-4 py-2.5 font-mono font-semibold tracking-widest text-foreground">
                {recipient.tiket?.kode_6 ?? "—"}
              </td>
              <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{recipient.tiket?.versi_terbit ?? "—"}</td>
              <td className="px-4 py-2.5">
                {recipient.tiket ? (
                  <StatusPill variant={TICKET_VARIANT[recipient.tiket.status] ?? "info"}>
                    {TICKET_LABEL[recipient.tiket.status] ?? recipient.tiket.status}
                  </StatusPill>
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground">Belum dibuat</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full px-3 text-xs font-semibold"
                  onClick={() => reissue(recipient)}
                  disabled={busy === recipient.id || recipient.tiket?.status === "dipakai"}
                >
                  {busy === recipient.id ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Terbitkan ulang
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}