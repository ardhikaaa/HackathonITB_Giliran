import { createFileRoute, Link } from "@tanstack/react-router";
import { Hero } from "@/components/landing/Hero";
import { Steps } from "@/components/landing/Steps";
import { Problems } from "@/components/landing/Problems";

export const Route = createFileRoute("/_site/")({
  head: () => ({
    meta: [
      { title: "GILIRAN — buku besar penyerahan bantuan" },
      {
        name: "description",
        content:
          "GILIRAN mencatat penyerahan bantuan satu kali per penerima, menjaga stok tetap cocok, dan menyusun laporan pertanggungjawaban dari catatan yang sama.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <main>
      <Hero />
      <Steps />
      <Problems />
      <footer className="mx-auto w-full max-w-6xl px-5 py-10 text-sm text-muted-foreground sm:px-8">
        <p className="max-w-xl leading-relaxed">
          GILIRAN dipakai panitia zakat, sembako yayasan, dan bakti sosial. Data yang disimpan hanya nama atau inisial,
          kelompok, jumlah anggota keluarga, nomor HP (opsional), dan status klaim.
        </p>
        <p className="mt-4">
          Punya kupon?{" "}
          <Link to="/tiket" search={{ t: undefined }} className="font-semibold text-primary underline-offset-4 hover:underline">
            Buka tiket digital Anda
          </Link>
          .
        </p>
      </footer>
    </main>
  );
}