import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateTickets } from "@/lib/ticket-fns";
import { saveCoupons } from "@/lib/couponStore";

export function GeneratePanel({ eventId, recipients }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const belum = recipients.filter((row) => !row.tiket || row.tiket.status !== "aktif").length;

  async function generate() {
    setBusy(true);
    try {
      const result = await generateTickets({ data: { eventId } });
      if (!result.coupons.length) {
        toast.success("Semua penerima sudah punya kupon aktif.");
        return;
      }
      saveCoupons(eventId, result.coupons);
      await queryClient.invalidateQueries({ queryKey: ["recipients", eventId] });
      await queryClient.invalidateQueries({ queryKey: ["workspace", eventId] });
      toast.success(`${result.coupons.length} kupon dibuat.`);
      navigate({ to: "/acara/$eventId/cetak", params: { eventId } });
    } catch (error) {
      toast.error(error?.message ?? "Kupon belum bisa dibuat.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Token kupon hanya dikirim sekali ke peramban ini. Token asli tidak disimpan di basis data, jadi kupon harus
        dicetak atau dibagikan saat dibuat. Kalau hasilnya hilang, pakai “Terbitkan ulang” pada penerima.
      </p>
      <Button
        size="lg"
        className="h-14 rounded-full px-6 text-base font-semibold"
        onClick={generate}
        disabled={busy || belum === 0 || recipients.length === 0}
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Ticket className="mr-2 h-4 w-4" aria-hidden="true" />}
        {recipients.length === 0
          ? "Belum ada penerima"
          : belum === 0
            ? "Semua penerima sudah punya kupon"
            : `Buat kupon untuk ${belum} penerima`}
      </Button>
    </div>
  );
}