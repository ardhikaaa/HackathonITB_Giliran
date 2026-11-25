import { Link } from "@tanstack/react-router";
import { ArrowRight, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/70">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-32 h-[26rem] w-[26rem] rounded-full bg-ok-bg blur-3xl"
      />
      <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Alat kerja panitia
        </p>
        <h1 className="max-w-3xl text-[2.15rem] font-bold leading-[1.08] text-foreground sm:text-6xl">
          Setiap orang dapat gilirannya,{" "}
          <span className="font-display font-normal italic text-primary">sekali</span>, tepat waktu.
        </h1>
        <div className="mt-7 max-w-xl space-y-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
          <p>GILIRAN mencatat setiap penyerahan bantuan satu kali saja, dari kupon sampai laporan.</p>
          <p>Stok berkurang otomatis saat bantuan diserahkan, jadi angka di layar ikut barang yang keluar.</p>
          <p>Laporan pertanggungjawaban tersusun dari catatan itu, bukan dari hitungan ulang di akhir acara.</p>
        </div>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="h-14 rounded-full px-7 text-base font-semibold">
            <Link to="/acara">
              Masuk sebagai Admin
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground sm:max-w-xs">
            <ScanLine className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Petugas meja tidak perlu akun. Mereka masuk lewat tautan khusus yang dibuat admin.
          </p>
        </div>
      </div>
    </section>
  );
}