import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEvent } from "@/lib/admin-fns";
import { todayInput } from "@/lib/format";

export function EventForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    nama: "",
    tanggal: todayInput(),
    jenis_paket: "Paket Sembako",
    stok_awal: 100,
    jumlah_meja: 2,
    menit_per_orang: 2,
  });
  const [errorMsg, setErrorMsg] = useState("");

  const mutation = useMutation({
    mutationFn: (payload) => createEvent({ data: payload }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      navigate({ to: "/acara/$eventId", params: { eventId: res.id } });
    },
    onError: (err) => {
      setErrorMsg(err?.message || "Gagal membuat acara. Coba lagi.");
    },
  });

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    mutation.mutate({
      nama: form.nama,
      tanggal: form.tanggal,
      jenis_paket: form.jenis_paket,
      stok_awal: Number(form.stok_awal),
      jumlah_meja: Number(form.jumlah_meja),
      menit_per_orang: Number(form.menit_per_orang),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6">
      <div className="space-y-2">
        <Label htmlFor="nama">Nama acara</Label>
        <Input
          id="nama"
          required
          maxLength={120}
          placeholder="Contoh: Pembagian Sembako RW 05"
          value={form.nama}
          onChange={handleChange("nama")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tanggal">Tanggal acara</Label>
          <Input
            id="tanggal"
            type="date"
            required
            value={form.tanggal}
            onChange={handleChange("tanggal")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jenis_paket">Jenis paket bantuan</Label>
          <Input
            id="jenis_paket"
            required
            maxLength={80}
            placeholder="Contoh: Paket Sembako"
            value={form.jenis_paket}
            onChange={handleChange("jenis_paket")}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="stok_awal">Stok awal (paket)</Label>
          <Input
            id="stok_awal"
            type="number"
            min={0}
            max={100000}
            required
            value={form.stok_awal}
            onChange={handleChange("stok_awal")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jumlah_meja">Jumlah meja</Label>
          <Input
            id="jumlah_meja"
            type="number"
            min={1}
            max={30}
            required
            value={form.jumlah_meja}
            onChange={handleChange("jumlah_meja")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="menit_per_orang">Menit per orang</Label>
          <Input
            id="menit_per_orang"
            type="number"
            step="0.5"
            min={0.5}
            max={30}
            required
            value={form.menit_per_orang}
            onChange={handleChange("menit_per_orang")}
          />
        </div>
      </div>

      {errorMsg && (
        <p className="rounded-xl border border-bad/30 bg-bad-bg px-4 py-3 text-sm font-medium text-bad">
          {errorMsg}
        </p>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" size="lg" disabled={mutation.isPending} className="h-12 rounded-full px-6 text-base font-semibold">
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Buat acara
        </Button>
      </div>
    </form>
  );
}
