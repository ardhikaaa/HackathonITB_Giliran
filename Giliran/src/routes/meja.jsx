import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Camera, CloudOff, HardDriveDownload, Loader2, RefreshCw, Search, ShieldCheck, Trash2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scanner } from "@/components/meja/Scanner";
import { ClaimResult } from "@/components/meja/ClaimResult";
import { getTableSession, previewClaim, claimTicket, syncOfflineEvents } from "@/lib/public-fns";
import {
  addQueuedEvent,
  clearQueue,
  clearSnapshot,
  hashToken,
  listQueuedEvents,
  readSnapshot,
  removeQueuedEvent,
  requestPersistentStorage,
  saveSnapshot,
} from "@/lib/offlineDb";
import { uid } from "@/lib/format";

export const Route = createFileRoute("/meja")({
  validateSearch: (search) => ({ t: typeof search.t === "string" ? search.t : undefined }),
  head: () => ({ meta: [{ title: "Meja petugas — GILIRAN" }, { name: "robots", content: "noindex" }] }),
  component: TablePage,
});

function parseInput(value) {
  const text = String(value ?? "").trim();
  if (/^[A-Za-z0-9]{6}$/.test(text)) return { kode: text.toUpperCase() };
  return { ticketToken: text };
}

function TablePage() {
  const { t: tableToken } = Route.useSearch();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [view, setView] = useState(null);
  const [current, setCurrent] = useState(null);
  const [pending, setPending] = useState(0);
  const [snapshot, setSnapshot] = useState(null);
  const [claimedLocal, setClaimedLocal] = useState([]);
  const [kode, setKode] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [diwakilkan, setDiwakilkan] = useState(false);
  const [namaPengambil, setNamaPengambil] = useState("");

  const loadSession = useCallback(async () => {
    if (!tableToken) {
      setLoading(false);
      return;
    }
    try {
      const result = await getTableSession({ data: { token: tableToken } });
      setSession(result);
      if (result.valid && result.acara?.mode_offline) {
        const payload = {
          snapshot: result.snapshot,
          hitungan: result.hitungan,
          meja: result.meja,
          acara: result.acara,
          kelompok: result.kelompok,
        };
        setSnapshot(payload);
        try {
          await saveSnapshot(tableToken, payload);
          await requestPersistentStorage();
        } catch {
          /* penyimpanan lokal tidak tersedia */
        }
      }
    } catch {
      setOnline(false);
    } finally {
      setLoading(false);
    }
  }, [tableToken]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!tableToken) return;
    (async () => {
      const saved = await readSnapshot(tableToken).catch(() => null);
      if (saved?.snapshot) setSnapshot((prev) => prev ?? saved);
      const queue = await listQueuedEvents().catch(() => []);
      setPending(queue.length);
      setClaimedLocal(queue.map((item) => item.ticket_hash).filter(Boolean));
    })();
  }, [tableToken]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const syncQueue = useCallback(async () => {
    if (!tableToken) return;
    const queue = await listQueuedEvents().catch(() => []);
    if (!queue.length) return;
    try {
      const result = await syncOfflineEvents({
        data: {
          tableToken,
          events: queue.map((item) => ({
            client_event_id: item.client_event_id,
            ticketToken: item.ticketToken || undefined,
            kode: item.kode || undefined,
            nama_pengambil: item.nama_pengambil || undefined,
            urutan_lokal: item.urutan_lokal ?? 0,
          })),
        },
      });
      for (const item of result.results) await removeQueuedEvent(item.client_event_id);
      setPending(0);
      setClaimedLocal([]);
      const konflik = result.results.filter((item) => item.status === "conflict").length;
      toast.success(
        konflik > 0
          ? `${result.results.length} data terkirim. ${konflik} perlu diperiksa admin.`
          : `${result.results.length} data offline terkirim.`,
      );
      await loadSession();
    } catch {
      /* tunggu sinyal berikutnya */
    }
  }, [tableToken, loadSession]);

  useEffect(() => {
    if (online && pending > 0) syncQueue();
  }, [online, pending, syncQueue]);

  async function cekOffline(input) {
    const saved = snapshot ?? (await readSnapshot(tableToken).catch(() => null));
    const list = saved?.snapshot ?? [];
    let entry = null;
    let hash = "";
    if (input.ticketToken) {
      hash = await hashToken(input.ticketToken);
      entry = list.find((row) => row.token_hash === hash);
    } else if (input.kode) {
      entry = list.find((row) => row.kode_6 === input.kode);
      hash = entry?.token_hash ?? "";
    }
    if (!entry) {
      setView({ status: "offline_not_found", data: {} });
      return;
    }
    if (entry.status === "dicabut") {
      setView({ status: "revoked", data: { nama_depan: entry.nama_depan, kelompok: entry.kelompok } });
      return;
    }
    if (entry.status === "dipakai" || claimedLocal.includes(hash)) {
      setView({ status: "already", data: { nama_depan: entry.nama_depan, kelompok: entry.kelompok } });
      return;
    }
    setCurrent({ ticketToken: input.ticketToken, kode: entry.kode_6, hash });
    setView({
      status: "offline_ok",
      data: {
        nama_depan: entry.nama_depan,
        kelompok: entry.kelompok,
        kode: entry.kode_6,
        jumlah_anggota: entry.jumlah_anggota ?? 0,
        paket: Math.max(1, Number(entry.jumlah_anggota) || 1),
      },
    });
  }

  const cek = useCallback(
    async (value) => {
      const input = parseInput(value);
      if (!input.kode && !input.ticketToken) return;
      setCurrent(input);
      setKode("");
      setBusy(true);
      setView(null);
      setDiwakilkan(false);
      setNamaPengambil("");
      try {
        if (online) {
          const result = await previewClaim({ data: { tableToken, ...input } });
          setView({ status: result.status, data: result });
        } else if (session?.acara?.mode_offline === false) {
          setView(null);
          toast.error("Mode offline dimatikan admin. Tunggu sinyal kembali.");
        } else {
          await cekOffline(input);
        }
      } catch {
        toast.error("Pemeriksaan belum bisa dilakukan. Coba lagi.");
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [online, tableToken, snapshot, claimedLocal, session],
  );

  async function deliver() {
    if (diwakilkan && !namaPengambil.trim()) {
      toast.error("Isi nama pengambil.");
      return;
    }
    setSubmitting(true);
    try {
      if (online) {
        const result = await claimTicket({
          data: {
            tableToken,
            ticketToken: current?.ticketToken || undefined,
            kode: current?.kode || undefined,
            client_event_id: uid(),
            nama_pengambil: diwakilkan ? namaPengambil.trim() : "",
          },
        });
        setView({ status: result.status === "ok" ? "done" : result.status, data: result });
        await loadSession();
      } else {
        await addQueuedEvent({
          client_event_id: uid(),
          ticketToken: current?.ticketToken || "",
          kode: current?.kode || "",
          ticket_hash: current?.hash || "",
          nama_pengambil: diwakilkan ? namaPengambil.trim() : "",
          urutan_lokal: Date.now(),
          waktu_lokal: new Date().toISOString(),
        });
        setPending((count) => count + 1);
        setClaimedLocal((prev) => [...prev, current?.hash].filter(Boolean));
        setView({ status: "offline_queued", data: { ...(view?.data ?? {}) } });
      }
      setDiwakilkan(false);
      setNamaPengambil("");
    } catch (error) {
      toast.error(error?.message ?? "Penyerahan belum bisa dicatat.");
    } finally {
      setSubmitting(false);
    }
  }

  async function hapusDataLokal() {
    await clearQueue().catch(() => null);
    await clearSnapshot(tableToken).catch(() => null);
    setPending(0);
    setClaimedLocal([]);
    setSnapshot(null);
    toast.success("Data lokal dihapus.");
  }

  if (!tableToken) {
    return (
      <Centered>
        <h1 className="text-xl font-bold text-foreground">Tautan meja tidak lengkap</h1>
        <p className="mt-2 text-base text-muted-foreground">Minta tautan petugas dari admin acara.</p>
      </Centered>
    );
  }

  if (loading) {
    return (
      <Centered>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="mt-2 text-base text-muted-foreground">Memuat meja…</p>
      </Centered>
    );
  }

  if (!session?.valid) {
    return (
      <Centered>
        <h1 className="text-xl font-bold text-foreground">
          {session?.ditutup ? "Acara sudah ditutup" : "Tautan meja tidak berlaku"}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {session?.ditutup
            ? "Tautan petugas berhenti setelah acara ditutup."
            : "Tautan mungkin sudah dicabut admin. Minta tautan baru."}
        </p>
      </Centered>
    );
  }

  const offlineAktif = session.acara.mode_offline !== false;
  const siapOffline = (snapshot?.snapshot?.length ?? 0) > 0;
  const total = session.hitungan.total;
  const sudah = session.hitungan.diserahkan + pending;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
          <div>
            <p className="text-lg font-bold text-foreground">{session.meja.nama}</p>
            <p className="text-sm text-muted-foreground">{session.acara.nama}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-sm font-bold ${
              online ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"
            }`}
          >
            {online ? "Online" : "Offline"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-4 pb-16">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sudah diserahkan</p>
          <p className="mt-1 text-4xl font-black tabular-nums text-foreground">
            {sudah} <span className="text-xl font-bold text-muted-foreground">/ {total}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelompok: {session.kelompok.map((group) => group.nama).join(", ") || "belum ada"}
          </p>
        </div>

        {offlineAktif ? (
          <div
            className={`flex items-start gap-2 rounded-xl border p-3 text-base ${
              siapOffline ? "border-ok/30 bg-ok-bg text-ok" : "border-warn/40 bg-warn-bg text-warn"
            }`}
          >
            {siapOffline ? (
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            ) : (
              <HardDriveDownload className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            )}
            <span className="font-semibold">
              {siapOffline
                ? `Siap offline: ${snapshot.snapshot.length} tiket untuk ${session.meja.nama}`
                : "Belum siap offline. Buka halaman ini sekali lagi saat masih ada sinyal."}
            </span>
          </div>
        ) : (
          <p className="rounded-xl border border-border bg-secondary p-3 text-base text-muted-foreground">
            Mode offline dimatikan admin. Halaman ini perlu sinyal.
          </p>
        )}

        {pending > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-warn/40 bg-warn-bg p-3 text-base font-semibold text-warn">
            <CloudOff className="h-5 w-5 shrink-0" aria-hidden="true" />
            {pending} event menunggu sinkronisasi
          </div>
        )}

        <Button
          className="h-20 w-full rounded-2xl text-2xl font-black tracking-wide"
          onClick={() => setScanOpen(true)}
        >
          <Camera className="mr-3 h-7 w-7" aria-hidden="true" />
          SCAN KUPON
        </Button>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            cek(kode);
          }}
        >
          <Input
            value={kode}
            onChange={(event) => setKode(event.target.value.toUpperCase().slice(0, 6))}
            placeholder="Ketik kode 6 karakter"
            className="h-14 flex-1 font-mono text-xl tracking-[0.3em]"
            inputMode="text"
            autoCapitalize="characters"
            aria-label="Kode kupon"
          />
          <Button type="submit" className="h-14 rounded-xl px-5 text-base font-bold" disabled={busy || kode.length < 6}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Search className="mr-1.5 h-5 w-5" aria-hidden="true" />}
            Cek
          </Button>
        </form>

        {!online && (
          <p className="flex items-center gap-2 rounded-xl border border-warn/40 bg-warn-bg p-3 text-sm font-semibold text-warn">
            <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            Tanpa sinyal: pemindaian dicatat di perangkat ini dan dikirim saat sinyal kembali.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-12 rounded-full px-4 text-sm font-semibold" onClick={loadSession}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Perbarui data
          </Button>
          <Button variant="ghost" className="h-12 rounded-full px-4 text-sm font-semibold" onClick={hapusDataLokal}>
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Hapus data lokal
          </Button>
        </div>

        <div className="rounded-xl border border-border p-3">
          <p className="text-sm font-bold text-foreground">Jadwal kelompok meja ini</p>
          <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
            {session.kelompok.map((group) => (
              <li key={group.nama} className="flex items-center justify-between gap-2">
                <span>{group.nama}</span>
                <span className="font-semibold text-foreground">
                  {group.jam} · {group.jumlah} keluarga
                </span>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <Scanner open={scanOpen} onScan={(value) => { setScanOpen(false); cek(value); }} onClose={() => setScanOpen(false)} />
      <ClaimResult
        view={view}
        onClose={() => setView(null)}
        onDeliver={deliver}
        submitting={submitting}
        diwakilkan={diwakilkan}
        setDiwakilkan={setDiwakilkan}
        namaPengambil={namaPengambil}
        setNamaPengambil={setNamaPengambil}
        online={online}
      />
    </div>
  );
}

function Centered({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center">{children}</div>
    </div>
  );
}