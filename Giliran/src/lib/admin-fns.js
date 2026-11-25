import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";

const eventIdInput = z.object({ eventId: z.string().min(1).max(80) });

const rowSchema = z.object({
  nama: z.string().min(1).max(80),
  kelompok: z.string().min(1).max(40),
  jumlah_anggota: z.coerce.number().min(1).max(50),
  hp: z.string().max(30).optional().default(""),
});

export const listMyEvents = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { listAll } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const user = context.user;
    const events = await listAll(svc.entities.Event, { pemilik: user.id }, { sort: "-tanggal" });
    const withCounts = await Promise.all(
      events.map(async (event) => {
        const [penerima, diserahkan] = await Promise.all([
          svc.entities.Recipient.count({ event_id: event.id }),
          svc.entities.Handover.count({ event_id: event.id }),
        ]);
        return { ...event, jumlah_penerima: penerima, diserahkan };
      }),
    );
    return withCounts;
  });

export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      nama: z.string().min(1).max(120),
      tanggal: z.string().min(4).max(20),
      jenis_paket: z.string().min(1).max(80),
      stok_awal: z.coerce.number().min(0).max(100000),
      jumlah_meja: z.coerce.number().min(1).max(30),
      menit_per_orang: z.coerce.number().min(0.5).max(30),
    }),
  )
  .handler(async ({ data, context }) => {
    const { writeAudit } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const user = context.user;
    const event = await svc.entities.Event.create({
      nama: data.nama.trim(),
      tanggal: data.tanggal,
      jenis_paket: data.jenis_paket.trim(),
      stok_awal: data.stok_awal,
      terpakai: 0,
      jumlah_meja: data.jumlah_meja,
      menit_per_orang: data.menit_per_orang,
      faktor_utilisasi: 0.8,
      cadangkan_jatah: false,
      mode_offline: true,
      status: "draf",
      mode_retensi: "anonim",
      pemilik: user.id,
    });
    const tables = Array.from({ length: data.jumlah_meja }, (_, index) => ({
      event_id: event.id,
      pemilik: user.id,
      nama: `Meja ${index + 1}`,
      urutan: index + 1,
      status_tautan: "dicabut",
    }));
    await svc.entities.ServiceTable.bulkCreate(tables);
    await writeAudit(svc, {
      eventId: event.id,
      pemilik: user.id,
      aktor: user.email,
      aksi: "acara_dibuat",
      hasil: "berhasil",
      detail: `${event.nama} · ${data.jumlah_meja} meja`,
    });
    return { id: event.id };
  });

export const getEventWorkspace = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(eventIdInput)
  .handler(async ({ data, context }) => {
    const { requireEventOwner, listAll } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const event = await requireEventOwner(context.getBase44(), data.eventId, context.user);
    const [tables, groups, penerima, diserahkan, percobaanGanda, insidenTerbuka, tiketAktif] = await Promise.all([
      listAll(svc.entities.ServiceTable, { event_id: event.id }, { sort: "urutan" }),
      listAll(svc.entities.Group, { event_id: event.id }, { sort: "nama" }),
      svc.entities.Recipient.count({ event_id: event.id }),
      svc.entities.Handover.count({ event_id: event.id }),
      svc.entities.AuditLog.count({ event_id: event.id, hasil: "percobaan_ganda" }),
      svc.entities.Incident.count({ event_id: event.id, status: "terbuka" }),
      svc.entities.Ticket.count({ event_id: event.id, status: "aktif" }),
    ]);
    return {
      event,
      tables,
      groups,
      stats: {
        penerima,
        diserahkan,
        belum: Math.max(penerima - diserahkan, 0),
        sisa_stok: Number(event.stok_awal ?? 0) - Number(event.terpakai ?? 0),
        percobaan_ganda: percobaanGanda,
        insiden_terbuka: insidenTerbuka,
        tiket_aktif: tiketAktif,
      },
    };
  });

export const getRecipients = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(eventIdInput)
  .handler(async ({ data, context }) => {
    const { requireEventOwner, listAll } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const event = await requireEventOwner(context.getBase44(), data.eventId, context.user);
    const [groups, recipients, tickets] = await Promise.all([
      listAll(svc.entities.Group, { event_id: event.id }, { sort: "nama" }),
      listAll(svc.entities.Recipient, { event_id: event.id }, { sort: "nama" }),
      listAll(svc.entities.Ticket, { event_id: event.id }, { sort: "nomor_sobekan" }),
    ]);
    const groupById = new Map(groups.map((group) => [group.id, group]));
    const ticketByRecipient = new Map();
    for (const ticket of tickets) {
      const current = ticketByRecipient.get(ticket.recipient_id);
      if (!current || (ticket.versi_terbit ?? 1) >= (current.versi_terbit ?? 1)) {
        ticketByRecipient.set(ticket.recipient_id, ticket);
      }
    }
    return {
      groups,
      recipients: recipients.map((recipient) => {
        const group = groupById.get(recipient.group_id);
        const ticket = ticketByRecipient.get(recipient.id) ?? null;
        return {
          id: recipient.id,
          nama: recipient.nama,
          group_id: recipient.group_id,
          kelompok: group?.nama ?? "—",
          jumlah_anggota: recipient.jumlah_anggota ?? 0,
          hp: recipient.hp ?? "",
          tiket: ticket
            ? {
                id: ticket.id,
                kode_6: ticket.kode_6,
                nomor_sobekan: ticket.nomor_sobekan,
                status: ticket.status,
                versi_terbit: ticket.versi_terbit ?? 1,
              }
            : null,
        };
      }),
    };
  });

export const saveRecipients = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ eventId: z.string().min(1).max(80), rows: z.array(rowSchema).min(1).max(300) }))
  .handler(async ({ data, context }) => {
    const { requireEventOwner, listAll, writeAudit } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const event = await requireEventOwner(context.getBase44(), data.eventId, context.user);
    const existingGroups = await listAll(svc.entities.Group, { event_id: event.id });
    const groupByName = new Map(existingGroups.map((group) => [group.nama.toLowerCase(), group]));

    const newGroups = [];
    const seen = new Set();
    for (const row of data.rows) {
      const key = row.kelompok.trim().toLowerCase();
      if (!key || groupByName.has(key) || seen.has(key)) continue;
      seen.add(key);
      newGroups.push(key);
    }
    if (newGroups.length) {
      const created = await svc.entities.Group.bulkCreate(
        newGroups.map((key, index) => ({
          event_id: event.id,
          pemilik: event.pemilik,
          nama: data.rows.find((row) => row.kelompok.trim().toLowerCase() === key).kelompok.trim(),
          jumlah_keluarga: 0,
          gelombang: index + 1,
          gelombang_mulai: "",
          gelombang_selesai: "",
          service_table_id: "",
        })),
      );
      for (const group of created) groupByName.set(group.nama.toLowerCase(), group);
    }

    await svc.entities.Recipient.bulkCreate(
      data.rows.map((row) => ({
        event_id: event.id,
        pemilik: event.pemilik,
        group_id: groupByName.get(row.kelompok.trim().toLowerCase()).id,
        nama: row.nama.trim(),
        jumlah_anggota: row.jumlah_anggota,
        hp: row.hp?.trim() ?? "",
      })),
    );

    const allGroups = await listAll(svc.entities.Group, { event_id: event.id });
    const allRecipients = await listAll(svc.entities.Recipient, { event_id: event.id });
    const counts = new Map();
    for (const recipient of allRecipients) {
      counts.set(recipient.group_id, (counts.get(recipient.group_id) ?? 0) + 1);
    }
    await Promise.all(
      allGroups.map((group) =>
        svc.entities.Group.update(group.id, { jumlah_keluarga: counts.get(group.id) ?? 0 }),
      ),
    );

    await writeAudit(svc, {
      eventId: event.id,
      pemilik: event.pemilik,
      aktor: context.user.email,
      aksi: "penerima_ditambah",
      hasil: "berhasil",
      detail: `${data.rows.length} penerima ditambahkan`,
    });

    return { saved: data.rows.length, groups: allGroups.length };
  });

export const saveSchedule = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      eventId: z.string().min(1).max(80),
      rows: z
        .array(
          z.object({
            groupId: z.string().min(1).max(80),
            gelombang: z.coerce.number().min(1).max(30),
            mulai: z.string().max(10),
            selesai: z.string().max(10),
            tableId: z.string().max(80).optional().default(""),
          }),
        )
        .min(1)
        .max(100),
    }),
  )
  .handler(async ({ data, context }) => {
    const { requireEventOwner, writeAudit } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const event = await requireEventOwner(context.getBase44(), data.eventId, context.user);
    await Promise.all(
      data.rows.map((row) =>
        svc.entities.Group.update(row.groupId, {
          gelombang: row.gelombang,
          gelombang_mulai: row.mulai,
          gelombang_selesai: row.selesai,
          service_table_id: row.tableId || "",
        }),
      ),
    );
    await writeAudit(svc, {
      eventId: event.id,
      pemilik: event.pemilik,
      aktor: context.user.email,
      aksi: "jadwal_ditetapkan",
      hasil: "berhasil",
      detail: `${data.rows.length} kelompok dijadwalkan`,
    });
    return { ok: true };
  });

export const updateEventSettings = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      eventId: z.string().min(1).max(80),
      patch: z.object({
        menit_per_orang: z.coerce.number().min(0.5).max(30).optional(),
        faktor_utilisasi: z.coerce.number().min(0.3).max(1).optional(),
        cadangkan_jatah: z.boolean().optional(),
        mode_offline: z.boolean().optional(),
        mode_retensi: z.enum(["anonim", "arsip_lpj"]).optional(),
        tanggal_akhir_retensi: z.string().max(20).optional(),
        stok_awal: z.coerce.number().min(0).max(100000).optional(),
        status: z.enum(["draf", "siap", "berjalan"]).optional(),
      }),
    }),
  )
  .handler(async ({ data, context }) => {
    const { requireEventOwner, writeAudit } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const event = await requireEventOwner(context.getBase44(), data.eventId, context.user);
    if (event.status === "ditutup") {
      throw Object.assign(new Error("Acara sudah ditutup dan tidak bisa diubah."), { status: 400 });
    }
    await svc.entities.Event.update(event.id, data.patch);
    await writeAudit(svc, {
      eventId: event.id,
      pemilik: event.pemilik,
      aktor: context.user.email,
      aksi: "pengaturan_diubah",
      hasil: "berhasil",
      detail: Object.keys(data.patch).join(", "),
    });
    return { ok: true };
  });

export const createTableLink = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ eventId: z.string().min(1).max(80), tableId: z.string().min(1).max(80) }))
  .handler(async ({ data, context }) => {
    const { requireEventOwner, randomToken, sha256Hex, writeAudit } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const event = await requireEventOwner(context.getBase44(), data.eventId, context.user);
    if (event.status === "ditutup") {
      throw Object.assign(new Error("Acara sudah ditutup."), { status: 400 });
    }
    const table = await svc.entities.ServiceTable.get(data.tableId);
    if (!table || table.event_id !== event.id) {
      throw Object.assign(new Error("Meja tidak ditemukan pada acara ini."), { status: 404 });
    }
    const token = randomToken();
    await svc.entities.ServiceTable.update(table.id, {
      link_token_hash: await sha256Hex(token),
      status_tautan: "aktif",
    });
    await writeAudit(svc, {
      eventId: event.id,
      pemilik: event.pemilik,
      aktor: context.user.email,
      aksi: "tautan_meja_dibuat",
      hasil: "berhasil",
      serviceTableId: table.id,
      detail: table.nama,
    });
    return { token, tableId: table.id, nama: table.nama };
  });

export const revokeTableLink = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ eventId: z.string().min(1).max(80), tableId: z.string().min(1).max(80) }))
  .handler(async ({ data, context }) => {
    const { requireEventOwner, writeAudit } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const event = await requireEventOwner(context.getBase44(), data.eventId, context.user);
    await svc.entities.ServiceTable.update(data.tableId, { link_token_hash: "", status_tautan: "dicabut" });
    await writeAudit(svc, {
      eventId: event.id,
      pemilik: event.pemilik,
      aktor: context.user.email,
      aksi: "tautan_meja_dicabut",
      hasil: "berhasil",
      serviceTableId: data.tableId,
      detail: "Tautan petugas dicabut",
    });
    return { ok: true };
  });