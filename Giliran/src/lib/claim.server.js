// Inti logika klaim. Dipakai pratinjau (dry run), klaim online, dan sinkronisasi offline.
import {
  findTableByToken,
  firstName,
  isOutsideWindow,
  jakartaNow,
  listAll,
  normalizeCode,
  sha256Hex,
  sleep,
  writeAudit,
} from "@/lib/giliran.server";

async function previousHandover(svc, eventId, ticketId) {
  const rows = await listAll(svc.entities.Handover, { event_id: eventId, ticket_id: ticketId }, { limit: 1 });
  if (!rows.length) return { handover: null, table: null };
  const table = await svc.entities.ServiceTable.get(rows[0].service_table_id).catch(() => null);
  return { handover: rows[0], table };
}

async function alreadyResult(svc, eventId, ticket, recipient, group) {
  const { handover, table } = await previousHandover(svc, eventId, ticket.id);
  return {
    status: "already",
    nama_depan: firstName(recipient?.nama),
    kelompok: group?.nama ?? "",
    kode: ticket.kode_6,
    waktu: handover?.waktu ?? "",
    meja_nama: table?.nama ?? "",
    di_luar_gelombang: !!handover?.di_luar_gelombang,
  };
}

/**
 * Satu percobaan klaim.
 * status: invalid_link | closed | not_found | revoked | already | wrong_table | no_stock | ok | conflict
 * dryRun: hanya memeriksa (untuk pratinjau layar), tidak menulis apa pun.
 */
export async function processClaim(svc, input, { dryRun = false } = {}) {
  const audit = (payload) => (dryRun ? Promise.resolve() : writeAudit(svc, payload));

  const table = await findTableByToken(svc, input.tableToken);
  if (!table || table.status_tautan !== "aktif") return { status: "invalid_link" };

  const event = await svc.entities.Event.get(table.event_id).catch(() => null);
  if (!event) return { status: "invalid_link" };
  if (event.status === "ditutup") return { status: "closed" };

  const now = jakartaNow();

  if (!dryRun) {
    const prior = await listAll(
      svc.entities.Handover,
      { event_id: event.id, client_event_id: input.clientEventId },
      { limit: 1 },
    );
    if (prior.length) {
      const priorTicket = await svc.entities.Ticket.get(prior[0].ticket_id).catch(() => null);
      const recipient = priorTicket
        ? await svc.entities.Recipient.get(priorTicket.recipient_id).catch(() => null)
        : null;
      const group = recipient ? await svc.entities.Group.get(recipient.group_id).catch(() => null) : null;
      return {
        status: "ok",
        idempotent: true,
        nama_depan: firstName(recipient?.nama),
        kelompok: group?.nama ?? "",
        jumlah_anggota: recipient?.jumlah_anggota ?? 0,
        kode: priorTicket?.kode_6 ?? "",
        waktu: prior[0].waktu,
        meja_nama: table.nama,
        di_luar_gelombang: !!prior[0].di_luar_gelombang,
      };
    }
  }

  let ticket = null;
  if (input.ticketToken) {
    const hash = await sha256Hex(String(input.ticketToken).trim());
    const rows = await listAll(svc.entities.Ticket, { event_id: event.id, token_hash: hash }, { limit: 1 });
    ticket = rows[0] ?? null;
  } else if (input.kode) {
    const kode = normalizeCode(input.kode);
    if (kode.length === 6) {
      const rows = await listAll(svc.entities.Ticket, { event_id: event.id, kode_6: kode }, { limit: 1 });
      ticket = rows[0] ?? null;
    }
  }

  if (!ticket) {
    await audit({
      eventId: event.id,
      pemilik: event.pemilik,
      aktor: table.nama,
      aksi: "pindai_kupon",
      hasil: "ditolak",
      serviceTableId: table.id,
      detail: "Kupon tidak dikenali",
    });
    return { status: "not_found" };
  }

  const recipient = await svc.entities.Recipient.get(ticket.recipient_id).catch(() => null);
  const group = recipient ? await svc.entities.Group.get(recipient.group_id).catch(() => null) : null;

  if (ticket.status === "dicabut") {
    await audit({
      eventId: event.id,
      pemilik: event.pemilik,
      aktor: table.nama,
      aksi: "pindai_kupon",
      hasil: "ditolak",
      serviceTableId: table.id,
      detail: `Kupon dicabut (sobekan ${ticket.nomor_sobekan}, kode ${ticket.kode_6})`,
    });
    return { status: "revoked", kode: ticket.kode_6, nama_depan: firstName(recipient?.nama) };
  }

  if (ticket.status === "dipakai") {
    const result = await alreadyResult(svc, event.id, ticket, recipient, group);
    await audit({
      eventId: event.id,
      pemilik: event.pemilik,
      aktor: table.nama,
      aksi: "pindai_kupon",
      hasil: "percobaan_ganda",
      serviceTableId: table.id,
      detail: `Kupon sudah diambil di ${result.meja_nama || "meja lain"} (sobekan ${ticket.nomor_sobekan})`,
    });
    return result;
  }

  if (group?.service_table_id && group.service_table_id !== table.id) {
    const target = await svc.entities.ServiceTable.get(group.service_table_id).catch(() => null);
    await audit({
      eventId: event.id,
      pemilik: event.pemilik,
      aktor: table.nama,
      aksi: "pindai_kupon",
      hasil: "ditolak",
      serviceTableId: table.id,
      detail: `Bukan meja ini, kelompok ${group.nama} di ${target?.nama ?? "meja lain"}`,
    });
    return { status: "wrong_table", meja_tujuan: target?.nama ?? "meja lain", kelompok: group.nama };
  }

  const stokAwal = Number(event.stok_awal ?? 0);
  // Stok dalam satuan paket: satu keluarga menerima sebanyak jumlah anggotanya.
  const paket = Math.max(1, Number(recipient?.jumlah_anggota) || 1);
  if (Number(event.terpakai ?? 0) + paket > stokAwal) {
    await audit({
      eventId: event.id,
      pemilik: event.pemilik,
      aktor: table.nama,
      aksi: "serah_terima",
      hasil: "ditolak",
      serviceTableId: table.id,
      detail: "Stok habis",
    });
    return { status: "no_stock" };
  }

  const luarGelombang = isOutsideWindow(group, now);
  const base = {
    nama_depan: firstName(recipient?.nama),
    kelompok: group?.nama ?? "",
    jumlah_anggota: recipient?.jumlah_anggota ?? 0,
    paket,
    kode: ticket.kode_6,
    nomor_sobekan: ticket.nomor_sobekan,
    meja_nama: table.nama,
    di_luar_gelombang: luarGelombang,
  };

  if (dryRun) return { status: "ok", preview: true, ...base };

  // Klaim bersyarat: hanya penulisan yang melihat status masih "aktif" yang berhasil.
  // Dua permintaan serentak untuk tiket yang sama: satu mengubah 1 baris, yang lain 0.
  const stamp = new Date().toISOString();
  const claim = await svc.entities.Ticket.updateMany(
    { id: ticket.id, status: "aktif" },
    { $set: { status: "dipakai", klaim_penanda: input.clientEventId, waktu_klaim: stamp } },
  );
  if (!claim?.updated) {
    await sleep(120);
    const result = await alreadyResult(svc, event.id, ticket, recipient, group);
    await audit({
      eventId: event.id,
      pemilik: event.pemilik,
      aktor: table.nama,
      aksi: "pindai_kupon",
      hasil: "percobaan_ganda",
      serviceTableId: table.id,
      detail: `Dua permintaan serentak untuk sobekan ${ticket.nomor_sobekan}`,
    });
    return result.status === "already" ? result : { ...base, ...result, status: "already" };
  }

  // Pesan satu jatah stok secara atomik: filter memeriksa sisa jatah saat menulis,
  // jadi dua penyerahan bersamaan tidak bisa membuat stok negatif.
  const reserve = await svc.entities.Event.updateMany(
    { id: event.id, terpakai: { $lte: stokAwal - paket } },
    { $inc: { terpakai: paket } },
  );
  if (!reserve?.updated) {
    await svc.entities.Ticket.updateMany(
      { id: ticket.id, status: "dipakai", klaim_penanda: input.clientEventId },
      { $set: { status: "aktif", klaim_penanda: "", waktu_klaim: "" } },
    );
    await audit({
      eventId: event.id,
      pemilik: event.pemilik,
      aktor: table.nama,
      aksi: "serah_terima",
      hasil: "ditolak",
      serviceTableId: table.id,
      detail: "Stok habis",
    });
    return { status: "no_stock" };
  }

  const handover = await svc.entities.Handover.create({
    event_id: event.id,
    pemilik: event.pemilik,
    ticket_id: ticket.id,
    service_table_id: table.id,
    waktu: stamp,
    nama_pengambil: input.namaPengambil || "",
    di_luar_gelombang: luarGelombang,
    client_event_id: input.clientEventId,
    sumber: input.sumber || "online",
  });

  await svc.entities.StockMovement.create({
    event_id: event.id,
    pemilik: event.pemilik,
    handover_id: handover.id,
    jumlah: -paket,
    jenis: "keluar",
  });

  await audit({
    eventId: event.id,
    pemilik: event.pemilik,
    aktor: table.nama,
    aksi: "serah_terima",
    hasil: "berhasil",
    serviceTableId: table.id,
    detail: `Sobekan ${ticket.nomor_sobekan}${luarGelombang ? " (di luar gelombang)" : ""}${
      input.namaPengambil ? `, diwakilkan: ${input.namaPengambil}` : ""
    }`,
  });

  const finalTicket = await svc.entities.Ticket.get(ticket.id).catch(() => null);
  if (!finalTicket || finalTicket.klaim_penanda !== input.clientEventId) {
    await svc.entities.Incident.create({
      event_id: event.id,
      pemilik: event.pemilik,
      ticket_id: ticket.id,
      jenis: "konflik",
      status: "terbuka",
      catatan_admin: `Sobekan ${ticket.nomor_sobekan} diklaim dua perangkat. Meja: ${table.nama}.`,
    });
    return { status: "conflict", ...base };
  }

  return { status: "ok", waktu: stamp, ...base };
}