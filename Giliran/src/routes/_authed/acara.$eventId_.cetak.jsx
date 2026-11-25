import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CouponSheet } from "@/components/kupon/CouponSheet";
import { useEventWorkspace } from "@/hooks/useEventWorkspace";
import { readCoupons } from "@/lib/couponStore";

export const Route = createFileRoute("/_authed/acara/$eventId_/cetak")({
  head: () => ({ meta: [{ title: "Cetak kupon — GILIRAN" }] }),
  component: PrintCouponsPage,
});

function PrintCouponsPage() {
  const { eventId } = Route.useParams();
  const { data } = useEventWorkspace(eventId, { poll: false });
  const [coupons, setCoupons] = useState([]);
  const [group, setGroup] = useState("semua");

  useEffect(() => {
    setCoupons(readCoupons(eventId));
  }, [eventId]);

  const groups = useMemo(() => [...new Set(coupons.map((coupon) => coupon.kelompok))], [coupons]);
  const shown = group === "semua" ? coupons : coupons.filter((coupon) => coupon.kelompok === group);

  if (!coupons.length) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6">
        <h1 className="text-xl font-bold text-foreground">Tidak ada kupon untuk dicetak</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Kupon hanya tersedia di peramban saat dibuat. Kalau halaman ini dibuka lagi nanti, tokennya sudah tidak
          tersimpan. Terbitkan ulang kupon penerima dari tab Kupon.
        </p>
        <Button asChild className="mt-5 h-12 rounded-full px-6 text-base font-semibold">
          <Link to="/acara/$eventId/kupon" params={{ eventId }}>
            Kembali ke tab Kupon
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <Link
          to="/acara/$eventId/kupon"
          params={{ eventId }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali
        </Link>
        <span className="text-sm font-semibold text-foreground">{shown.length} kupon</span>
        <select
          value={group}
          onChange={(event) => setGroup(event.target.value)}
          className="h-11 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Pilih kelompok"
        >
          <option value="semua">Semua kelompok</option>
          {groups.map((nama) => (
            <option key={nama} value={nama}>
              {nama}
            </option>
          ))}
        </select>
        <Button className="h-12 rounded-full px-6 text-base font-semibold" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
          Cetak
        </Button>
      </div>
      <div className="overflow-x-auto">
        <CouponSheet coupons={shown} event={data?.event} />
      </div>
    </div>
  );
}