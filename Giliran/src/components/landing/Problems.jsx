const PROBLEMS = [
  {
    title: "Klaim ganda dan kupon palsu",
    body: "Satu kupon hanya bisa dicatat satu kali. Kupon yang sudah dipakai atau dicabut ditolak di meja.",
  },
  {
    title: "Stok dan laporan tidak cocok",
    body: "Setiap penyerahan menurunkan stok, dan laporan dibaca dari catatan yang sama.",
  },
  {
    title: "Kedatangan serentak",
    body: "Kalkulator kapasitas membagi kelompok ke gelombang dan meja, jadi tidak semua orang datang bersamaan.",
  },
  {
    title: "Kupon hilang atau diwakilkan",
    body: "Kupon bisa diterbitkan ulang oleh admin, dan nama pengganti dicatat saat bantuan diambil.",
  },
];

export function Problems() {
  return (
    <section className="border-y border-border/70 bg-secondary/60">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <h2 className="max-w-lg text-2xl font-bold text-foreground sm:text-3xl">Empat masalah yang diselesaikan</h2>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
          {PROBLEMS.map((problem) => (
            <div key={problem.title} className="bg-card p-6">
              <h3 className="text-base font-semibold text-foreground">{problem.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{problem.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}