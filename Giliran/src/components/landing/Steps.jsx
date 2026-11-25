const STEPS = [
  {
    title: "Daftarkan dan jadwalkan",
    body: "Impor daftar penerima per kelompok. Sistem memberi usulan gelombang, lalu admin menetapkan jam dan meja.",
  },
  {
    title: "Scan dan serahkan",
    body: "Petugas memindai kupon di meja. Kupon yang sudah dipakai tampil merah dan tidak bisa dipakai lagi.",
  },
  {
    title: "Laporan yang cocok",
    body: "Sobekan fisik, catatan digital, dan sisa stok dibandingkan berdampingan sebelum acara ditutup.",
  },
];

export function Steps() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <h2 className="max-w-lg text-2xl font-bold text-foreground sm:text-3xl">Tiga langkah di hari acara</h2>
      <ol className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
        {STEPS.map((step, index) => (
          <li key={step.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <span className="font-display text-3xl italic text-primary">0{index + 1}</span>
            <h3 className="mt-3 text-lg font-semibold text-foreground">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}