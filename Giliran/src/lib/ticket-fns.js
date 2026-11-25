import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";

const eventIdInput = z.object({ eventId: z.string().min(1).max(80) });

async function loadEventBundle(svc, event) {
  const { listAll } = await import("@/lib/giliran.server");
  const [groups, recipients, tickets, tables] = await Promise.all([
    listAll(svc.entities.Group, { event_id: event.id }),
    listAll(svc.entities.Recipient, { event_id: event.id }, { sort: "nama" }),
    listAll(svc.entities.Ticket, { event_id: event.id }, { sort: "nomor_sobekan" }),
    listAll(svc.entities.ServiceTable, { event_id: event.id }, { sort: "urutan" }),
  ]);
  return { groups, recipients, tickets, tables };
}

function latestTicketsByRecipient(tickets) {
  const map = new Map();
  for (const ticket of tickets) {
    const current = map.get(ticket.recipient_id);
    if (!current || (ticket.versi_terbit ?? 1) >= (current.versi_terbit ?? 1)) {
      map.set(ticket.recipient_id, ticket);
    }
  }
  return map;
}

export const generateTickets = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(eventIdInput)
  .handler(async ({ data, context }) => {
    const { requireEventOwner, randomCode, randomToken, sha256Hex, writeAudit } = await import(
      "@/lib/giliran.server"
    );
    const svc = context.getBase44().asServiceRole;
    const event = await requireEventOwner(context.getBase44(), data.eventId, context.user);
    if (event.status === "ditutup") {
      throw Object.assign(new Error("Acara sudah ditutup."), { status: 400 });
    }
    const { groups, recipients, tickets } = await loadEventBundle(svc, event);
    const groupById = new Map(groups.map((group) => [group.id, group]));
    const active = new Set(tickets.filter((ticket) => ticket.status === "aktif").map((ticket) => ticket.recipient_id));
    const usedCodes = new Set(tickets.map((ticket) => ticket.kode_6));
    let nomor = tickets.reduce((max, ticket) => Math.max(max, Number(ticket.nomor_sobekan ?? 0)), 0);

    const coupons = [];
    for (const recipient of recipients) {
      if (active.has(recipient.id)) continue;
      let kode = randomCode();
      let guard = 0;
      while (usedCodes.has(kode) && guard < 50) {
        kode = randomCode();
        guard += 1;
      }
      usedCodes.add(kode);
      nomor += 1;
      const token = randomToken();
      const group = groupById.get(recipient.group_id);
      await svc.entities.Ticket.create({
        event_id: event.id,
        pemilik: event.pemilik,
        recipient_id: recipient.id,
        token_hash: await sha256Hex(token),
        kode_6: kode,
        nomor_sobekan: nomor,
        status: "aktif",
        versi_terbit: 1,
      });
      coupons.push({
        recipientId: recipient.id,
        nama: recipient.nama,
        kelompok: group?.nama ?? "—",
        jam: group?.gelombang_mulai ? `${group.gelombang_mulai}–${group.gelombang_selesai}` : "",
        kode,
        token,
        nomor_sobekan: nomor,
      });
    }

    await writeAudit(svc, {
      eventId: event.id,
      pemilik: event.pemilik,
      aktor: context.user.email,
      aksi: "kupon_dibuat",
      hasil: "berhasil",
      detail: `${coupons.length} kupon baru`,
    });

    return { coupons, dilewati: recipients.length - coupons.length };
  });

export const reissueTicket = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ eventId: z.string().min(1).max(80), recipientId: z.string().min(1).max(80) }))
  .handler(async ({ data, context }) => {
    const { requireEventOwner, randomCode, randomToken, sha256Hex, writeAudit } = await import(
      "@/lib/giliran.server"
    );
    const svc = context.getBase44().asServiceRole;
    const event = await requireEventOwner(context.getBase44(), data.eventId, context.user);
    if (event.status === "ditutup") {
      throw Object.assign(new Error("Acara sudah ditutup."), { status: 400 });
    }
    const { groups, recipients, tickets } = await loadEventBundle(svc, event);
    const recipient = recipients.find((row) => row.id === data.recipientId);
    if (!recipient) throw Object.assign(new Error("Penerima tidak ditemukan."), { status: 404 });
    const group = groups.find((row) => row.id === recipient.group_id);
    const mine = tickets.filter((ticket) => ticket.recipient_id === recipient.id);
    const latest = mine.sort((a, b) => (b.versi_terbit ?? 1) - (a.versi_terbit ?? 1))[0];

    for (const ticket of mine) {
      if (ticket.status === "aktif") await svc.entities.Ticket.update(ticket.id, { status: "dicabut" });
    }

    const usedCodes = new Set(tickets.map((ticket) => ticket.kode_6));
    let kode = randomCode();
    let guard = 0;
    while (usedCodes.has(kode) && guard < 50) {
      kode = randomCode();
      guard += 1;
    }
    const nomor = tickets.reduce((max, ticket) => Math.max(max, Number(ticket.nomor_sobekan ?? 0)), 0) + 1;
    const versi = (latest?.versi_terbit ?? 0) + 1;
    const token = randomToken();
    const ticket = await svc.entities.Ticket.create({
      event_id: event.id,
      pemilik: event.pemilik,
      recipient_id: recipient.id,
      token_hash: await sha256Hex(token),
      kode_6: kode,
      nomor_sobekan: nomor,
      status: "aktif",
      versi_terbit: versi,
    });

    await writeAudit(svc, {
      eventId: event.id,
      pemilik: event.pemilik,
      aktor: context.user.email,
      aksi: "kupon_diterbitkan_ulang",
      hasil: "berhasil",
      detail: `${recipient.nama} · versi ${versi} · sobekan ${nomor}`,
    });

    return {
      coupon: {
        recipientId: recipient.id,
        nama: recipient.nama,
        kelompok: group?.nama ?? "—",
        jam: group?.gelombang_mulai ? `${group.gelombang_mulai}–${group.gelombang_selesai}` : "",
        kode,
        token,
        nomor_sobekan: nomor,
        versi_terbit: versi,
        ticketId: ticket.id,
      },
    };
  });

export const listIncidents = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(eventIdInput)
  .handler(async ({ data, context }) => {
    const { requireEventOwner, listAll } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const event = await requireEventOwner(context.getBase44(), data.eventId, context.user);
    const { recipients, tickets } = await loadEventBundle(svc, event);
    const incidents = await listAll(svc.entities.Incident, { event_id: event.id }, { sort: "-created_date" });
    const recipientById = new Map(recipients.map((row) => [row.id, row]));
    const ticketById = new Map(tickets.map((row) => [row.id, row]));
    return incidents.map((incident) => {
      const ticket = ticketById.get(incident.ticket_id);
      const recipient = ticket ? recipientById.get(ticket.recipient_id) : null;
      return {
        ...incident,
        nomor_sobekan: ticket?.nomor_sobekan ?? null,
        kode_6: ticket?.kode_6 ?? "",
        penerima: recipient?.nama ?? "",
        recipient_id: recipient?.id ?? "",
      };
    });
  });

export const markIncident = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      eventId: z.string().min(1).max(80),
      ticketId: z.string().min(1).max(80),
      jenis: z.enum(["kupon_ganda", "fotokopi", "konflik", "lainnya"]),
      catatan: z.string().max(400).optional().default(""),
    }),
  )
  .handler(async ({ data, context }) => {
    const { requireEventOwner, writeAudit } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const event = await requireEventOwner(context.getBase44(), data.eventId, context.user);
    const incident = await svc.entities.Incident.create({
      event_id: event.id,
      pemilik: event.pemilik,
      ticket_id: data.ticketId,
      jenis: data.jenis,
      status: "terbuka",
      catatan_admin: data.catatan ?? "",
    });
    await writeAudit(svc, {
      eventId: event.id,
      pemilik: event.pemilik,
      aktor: context.user.email,
      aksi: "insiden_ditandai",
      hasil: "berhasil",
      detail: data.jenis,
    });
    return { id: incident.id };
  });

export const resolveIncident = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      eventId: z.string().min(1).max(80),
      incidentId: z.string().min(1).max(80),
      catatan: z.string().max(400).optional().default(""),
    }),
  )
  .handler(async ({ data, context }) => {
    const { requireEventOwner, writeAudit } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const event = await requireEventOwner(context.getBase44(), data.eventId, context.user);
    await svc.entities.Incident.update(data.incidentId, {
      status: "selesai",
      catatan_admin: data.catatan ?? "",
    });
    await writeAudit(svc, {
      eventId: event.id,
      pemilik: event.pemilik,
      aktor: context.user.email,
      aksi: "insiden_diselesaikan",
      hasil: "berhasil",
      detail: data.catatan ?? "",
    });
    return { ok: true };
  });

export const listLogs = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(
    z.object({
      eventId: z.string().min(1).max(80),
      hasil: z.enum(["semua", "berhasil", "ditolak", "percobaan_ganda"]).optional().default("semua"),
    }),
  )
  .handler(async ({ data, context }) => {
    const { requireEventOwner, listAll } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const event = await requireEventOwner(context.getBase44(), data.eventId, context.user);
    const query = { event_id: event.id };
    if (data.hasil && data.hasil !== "semua") query.hasil = data.hasil;
    const logs = await listAll(svc.entities.AuditLog, query, { sort: "-waktu", limit: 200 });
    const tables = await listAll(svc.entities.ServiceTable, { event_id: event.id });
    const tableById = new Map(tables.map((table) => [table.id, table.nama]));
    return logs.map((log) => ({ ...log, meja: tableById.get(log.service_table_id) ?? "—" }));
  });

export const getStock = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(eventIdInput)
  .handler(async ({ data, context }) => {
    const { requireEventOwner, listAll } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const event = await requireEventOwner(context.getBase44(), data.eventId, context.user);
    const { groups, recipients, tickets } = await loadEventBundle(svc, event);
    const handoverRows = await listAll(svc.entities.Handover, { event_id: event.id });
    const ticketById = new Map(tickets.map((ticket) => [ticket.id, ticket]));
    const recipientById = new Map(recipients.map((row) => [row.id, row]));
    // Stok dalam satuan paket: satu keluarga menghabiskan sebanyak jumlah anggotanya.
    const paketOf = (recipientId) => Math.max(1, Number(recipientById.get(recipientId)?.jumlah_anggota) || 1);
    const servedRecipients = new Set();
    let paketDiserahkan = 0;
    for (const handover of handoverRows) {
      const ticket = ticketById.get(handover.ticket_id);
      if (!ticket) continue;
      servedRecipients.add(ticket.recipient_id);
      paketDiserahkan += paketOf(ticket.recipient_id);
    }
    const groupById = new Map(groups.map((group) => [group.id, group]));
    const perWave = new Map();
    for (const recipient of recipients) {
      if (servedRecipients.has(recipient.id)) continue;
      const group = groupById.get(recipient.group_id);
      const wave = group?.gelombang ?? 0;
      perWave.set(wave, (perWave.get(wave) ?? 0) + paketOf(recipient.id));
    }
    return {
      stok_awal: Number(event.stok_awal ?? 0),
      diserahkan: paketDiserahkan,
      sisa: Number(event.stok_awal ?? 0) - paketDiserahkan,
      tiket_aktif: tickets.filter((ticket) => ticket.status === "aktif").length,
      dicadangkan: [...perWave.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([gelombang, jumlah]) => ({ gelombang, jumlah })),
      cadangkan_jatah: !!event.cadangkan_jatah,
    };
  });

export const getReport = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      eventId: z.string().min(1).max(80),
      sobekan_fisik: z.coerce.number().min(0).max(100000),
      stok_fisik: z.coerce.number().min(0).max(100000),
    }),
  )
  .handler(async ({ data, context }) => {
    const { requireEventOwner, listAll } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const event = await requireEventOwner(context.getBase44(), data.eventId, context.user);
    const { recipients, tickets, tables } = await loadEventBundle(svc, event);
    const [handovers, incidents, logs] = await Promise.all([
      listAll(svc.entities.Handover, { event_id: event.id }, { sort: "waktu", limit: 500 }),
      listAll(svc.entities.Incident, { event_id: event.id }, { sort: "-created_date" }),
      listAll(svc.entities.AuditLog, { event_id: event.id }, { limit: 500 }),
    ]);
    const recipientById = new Map(recipients.map((row) => [row.id, row]));
    const ticketById = new Map(tickets.map((row) => [row.id, row]));
    const tableById = new Map(tables.map((row) => [row.id, row.nama]));

    const digital = handovers.length;
    const paketDigital = handovers.reduce((total, handover) => {
      const ticket = ticketById.get(handover.ticket_id);
      return total + Math.max(1, Number(ticket ? recipientById.get(ticket.recipient_id)?.jumlah_anggota : 1) || 1);
    }, 0);
    const terpakaiStok = Number(event.stok_awal ?? 0) - data.stok_fisik;
    const selisih = {
      digital_vs_sobekan: digital - data.sobekan_fisik,
      paket_vs_terpakai: paketDigital - terpakaiStok,
    };

    return {
      stok_awal: Number(event.stok_awal ?? 0),
      digital,
      paket_digital: paketDigital,
      sobekan_fisik: data.sobekan_fisik,
      stok_fisik: data.stok_fisik,
      terpakai_stok: terpakaiStok,
      selisih,
      cocok: selisih.digital_vs_sobekan === 0 && selisih.paket_vs_terpakai === 0,
      jejak: handovers.map((handover) => {
        const ticket = ticketById.get(handover.ticket_id);
        const recipient = ticket ? recipientById.get(ticket.recipient_id) : null;
        return {
          nomor_sobekan: ticket?.nomor_sobekan ?? null,
          kode_6: ticket?.kode_6 ?? "",
          nama: recipient?.nama ?? "",
          meja: tableById.get(handover.service_table_id) ?? "—",
          waktu: handover.waktu,
          nama_pengambil: handover.nama_pengambil ?? "",
          di_luar_gelombang: !!handover.di_luar_gelombang,
        };
      }),
      ringkasan: {
        percobaan_ganda: logs.filter((log) => log.hasil === "percobaan_ganda").length,
        insiden: incidents.length,
        insiden_terbuka: incidents.filter((incident) => incident.status === "terbuka").length,
        terbit_ulang: tickets.filter((ticket) => (ticket.versi_terbit ?? 1) > 1).length,
        perwakilan: handovers.filter((handover) => !!handover.nama_pengambil).length,
        luar_gelombang: handovers.filter((handover) => handover.di_luar_gelombang).length,
      },
      insiden: incidents.map((incident) => {
        const ticket = ticketById.get(incident.ticket_id);
        const recipient = ticket ? recipientById.get(ticket.recipient_id) : null;
        return {
          id: incident.id,
          jenis: incident.jenis,
          status: incident.status,
          catatan_admin: incident.catatan_admin ?? "",
          nomor_sobekan: ticket?.nomor_sobekan ?? null,
          kode_6: ticket?.kode_6 ?? "",
          penerima: recipient?.nama ?? "",
          recipient_id: recipient?.id ?? "",
        };
      }),
    };
  });

export const closeEvent = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      eventId: z.string().min(1).max(80),
      mode_retensi: z.enum(["anonim", "arsip_lpj"]),
      tanggal_akhir_retensi: z.string().max(20).optional().default(""),
      konfirmasi: z.boolean().optional().default(false),
    }),
  )
  .handler(async ({ data, context }) => {
    const { requireEventOwner, writeAudit } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const event = await requireEventOwner(context.getBase44(), data.eventId, context.user);
    if (event.status === "ditutup") {
      throw Object.assign(new Error("Acara ini sudah ditutup."), { status: 400 });
    }
    const insidenTerbuka = await svc.entities.Incident.count({ event_id: event.id, status: "terbuka" });
    if (insidenTerbuka > 0 && !data.konfirmasi) {
      return { perlu_konfirmasi: true, insiden_terbuka: insidenTerbuka };
    }
    if (data.mode_retensi === "arsip_lpj" && !data.tanggal_akhir_retensi) {
      throw Object.assign(new Error("Isi tanggal akhir penyimpanan arsip LPJ."), { status: 400 });
    }

    if (data.mode_retensi === "anonim") {
      const { recipients, tickets } = await loadEventBundle(svc, event);
      const latest = latestTicketsByRecipient(tickets);
      const changes = recipients.map((recipient) => {
        const ticket = latest.get(recipient.id);
        const nomor = ticket?.nomor_sobekan ?? "—";
        return { id: recipient.id, nama: `Penerima #${nomor}`, hp: "" };
      });
      if (changes.length) await svc.entities.Recipient.bulkUpdate(changes);
    }

    await svc.entities.ServiceTable.updateMany(
      { event_id: event.id },
      { $set: { status_tautan: "dicabut", link_token_hash: "" } },
    );
    await svc.entities.Event.update(event.id, {
      status: "ditutup",
      mode_retensi: data.mode_retensi,
      tanggal_akhir_retensi: data.mode_retensi === "arsip_lpj" ? data.tanggal_akhir_retensi : "",
      ditutup_pada: new Date().toISOString(),
    });
    await writeAudit(svc, {
      eventId: event.id,
      pemilik: event.pemilik,
      aktor: context.user.email,
      aksi: "acara_ditutup",
      hasil: "berhasil",
      detail: `Mode retensi: ${data.mode_retensi}`,
    });
    return { ok: true };
  });

export const createDonorLink = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(eventIdInput)
  .handler(async ({ data, context }) => {
    const { requireEventOwner, randomToken, sha256Hex } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const event = await requireEventOwner(context.getBase44(), data.eventId, context.user);
    const token = randomToken();
    await svc.entities.Event.update(event.id, { laporan_token_hash: await sha256Hex(token) });
    return { token };
  });