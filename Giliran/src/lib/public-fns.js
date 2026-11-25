import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tokenInput = z.object({ token: z.string().min(10).max(200) });

export const getTicketByToken = createServerFn({ method: "POST" })
  .validator(tokenInput)
  .handler(async ({ data, context }) => {
    const { firstName, listAll, sha256Hex } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const hash = await sha256Hex(data.token.trim());
    const tickets = await listAll(svc.entities.Ticket, { token_hash: hash }, { limit: 1 });
    const ticket = tickets[0];
    if (!ticket) return { found: false };
    const event = await svc.entities.Event.get(ticket.event_id).catch(() => null);
    if (!event) return { found: false };
    if (event.status === "ditutup") return { found: false, ditutup: true };
    const recipient = await svc.entities.Recipient.get(ticket.recipient_id).catch(() => null);
    if (!recipient) return { found: false };
    const group = await svc.entities.Group.get(recipient.group_id).catch(() => null);
    const table = group?.service_table_id
      ? await svc.entities.ServiceTable.get(group.service_table_id).catch(() => null)
      : null;
    return {
      found: true,
      nama_depan: firstName(recipient.nama),
      kelompok: group?.nama ?? "—",
      jam: group?.gelombang_mulai ? `${group.gelombang_mulai}–${group.gelombang_selesai}` : "Belum dijadwalkan",
      meja: table?.nama ?? "Belum ditentukan",
      status: ticket.status,
      kode_6: ticket.kode_6,
      nomor_sobekan: ticket.nomor_sobekan,
      tanggal: event.tanggal,
      event_nama: event.nama,
      jenis_paket: event.jenis_paket,
      hp: recipient.hp ?? "",
    };
  });

export const getTableSession = createServerFn({ method: "POST" })
  .validator(tokenInput)
  .handler(async ({ data, context }) => {
    const { findTableByToken, firstName, listAll } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const table = await findTableByToken(svc, data.token);
    if (!table || table.status_tautan !== "aktif") return { valid: false };
    const event = await svc.entities.Event.get(table.event_id).catch(() => null);
    if (!event || event.status === "ditutup") return { valid: false, ditutup: true };

    const [groups, recipients, tickets] = await Promise.all([
      listAll(svc.entities.Group, { event_id: event.id, service_table_id: table.id }, { sort: "gelombang" }),
      listAll(svc.entities.Recipient, { event_id: event.id }),
      listAll(svc.entities.Ticket, { event_id: event.id }),
    ]);
    const groupById = new Map(groups.map((group) => [group.id, group]));
    const assignedRecipients = recipients.filter((recipient) => groupById.has(recipient.group_id));
    const recipientById = new Map(assignedRecipients.map((recipient) => [recipient.id, recipient]));
    const assignedTickets = tickets.filter((ticket) => recipientById.has(ticket.recipient_id));
    const delivered = assignedTickets.filter((ticket) => ticket.status === "dipakai").length;

    return {
      valid: true,
      meja: { id: table.id, nama: table.nama },
      acara: {
        id: event.id,
        nama: event.nama,
        tanggal: event.tanggal,
        status: event.status,
        mode_offline: event.mode_offline !== false,
        cadangkan_jatah: !!event.cadangkan_jatah,
      },
      kelompok: groups.map((group) => ({
        nama: group.nama,
        jumlah: assignedRecipients.filter((recipient) => recipient.group_id === group.id).length,
        jam: group.gelombang_mulai ? `${group.gelombang_mulai}–${group.gelombang_selesai}` : "Belum dijadwalkan",
      })),
      hitungan: { diserahkan: delivered, total: assignedRecipients.length },
      // Snapshot dibatasi server: hanya kelompok yang ditugaskan ke meja ini.
      snapshot: assignedTickets.map((ticket) => {
        const recipient = recipientById.get(ticket.recipient_id);
        return {
          token_hash: ticket.token_hash,
          kode_6: ticket.kode_6,
          nama_depan: firstName(recipient?.nama),
          kelompok: groupById.get(recipient?.group_id)?.nama ?? "",
          jumlah_anggota: Math.max(1, Number(recipient?.jumlah_anggota) || 1),
          status: ticket.status,
          nomor_sobekan: ticket.nomor_sobekan,
        };
      }),
    };
  });

export const previewClaim = createServerFn({ method: "POST" })
  .validator(
    z.object({
      tableToken: z.string().min(10).max(200),
      ticketToken: z.string().max(200).optional(),
      kode: z.string().max(10).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { processClaim } = await import("@/lib/claim.server");
    const svc = context.getBase44().asServiceRole;
    if (!data.ticketToken && !data.kode) return { status: "not_found" };
    return processClaim(
      svc,
      {
        tableToken: data.tableToken,
        ticketToken: data.ticketToken,
        kode: data.kode,
        clientEventId: "preview",
        namaPengambil: "",
        sumber: "online",
      },
      { dryRun: true },
    );
  });

export const claimTicket = createServerFn({ method: "POST" })
  .validator(
    z.object({
      tableToken: z.string().min(10).max(200),
      ticketToken: z.string().max(200).optional(),
      kode: z.string().max(10).optional(),
      client_event_id: z.string().min(8).max(80),
      nama_pengambil: z.string().max(80).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { processClaim } = await import("@/lib/claim.server");
    const svc = context.getBase44().asServiceRole;
    if (!data.ticketToken && !data.kode) return { status: "not_found" };
    return processClaim(svc, {
      tableToken: data.tableToken,
      ticketToken: data.ticketToken,
      kode: data.kode,
      clientEventId: data.client_event_id,
      namaPengambil: data.nama_pengambil ?? "",
      sumber: "online",
    });
  });

export const syncOfflineEvents = createServerFn({ method: "POST" })
  .validator(
    z.object({
      tableToken: z.string().min(10).max(200),
      events: z
        .array(
          z.object({
            client_event_id: z.string().min(8).max(80),
            ticketToken: z.string().max(200).optional(),
            kode: z.string().max(10).optional(),
            nama_pengambil: z.string().max(80).optional(),
            urutan_lokal: z.coerce.number().min(0).max(100000),
          }),
        )
        .min(1)
        .max(200),
    }),
  )
  .handler(async ({ data, context }) => {
    const { processClaim } = await import("@/lib/claim.server");
    const { findTableByToken, listAll, writeAudit } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const table = await findTableByToken(svc, data.tableToken);
    if (!table || table.status_tautan !== "aktif") return { valid: false, results: [] };

    const results = [];
    for (const event of data.events) {
      const result = await processClaim(svc, {
        tableToken: data.tableToken,
        ticketToken: event.ticketToken,
        kode: event.kode,
        clientEventId: event.client_event_id,
        namaPengambil: event.nama_pengambil ?? "",
        sumber: "offline",
      });

      if (result.status === "already") {
        let ticketId = "";
        if (result.kode) {
          const rows = await listAll(
            svc.entities.Ticket,
            { event_id: table.event_id, kode_6: result.kode },
            { limit: 1 },
          );
          ticketId = rows[0]?.id ?? "";
        }
        await svc.entities.Incident.create({
          event_id: table.event_id,
          pemilik: table.pemilik,
          ticket_id: ticketId,
          jenis: "konflik",
          status: "terbuka",
          catatan_admin: `Sinkronisasi offline: tiket ${result.kode ?? ""} sudah diambil di ${
            result.meja_nama || "meja lain"
          }. Urutan lokal ${event.urutan_lokal}. Admin memutuskan.`,
        });
        await writeAudit(svc, {
          eventId: table.event_id,
          pemilik: table.pemilik,
          aktor: table.nama,
          aksi: "sinkron_offline",
          hasil: "ditolak",
          serviceTableId: table.id,
          detail: `Konflik offline untuk kode ${result.kode ?? "-"}`,
        });
        results.push({ client_event_id: event.client_event_id, status: "conflict", detail: result });
        continue;
      }

      results.push({ client_event_id: event.client_event_id, status: result.status, detail: result });
    }
    return { valid: true, results };
  });

export const getDonorReport = createServerFn({ method: "POST" })
  .validator(tokenInput)
  .handler(async ({ data, context }) => {
    const { listAll, sha256Hex } = await import("@/lib/giliran.server");
    const svc = context.getBase44().asServiceRole;
    const hash = await sha256Hex(data.token.trim());
    const events = await listAll(svc.entities.Event, { laporan_token_hash: hash }, { limit: 1 });
    const event = events[0];
    if (!event) return { found: false };
    const [recipients, handovers, groups] = await Promise.all([
      svc.entities.Recipient.count({ event_id: event.id }),
      listAll(svc.entities.Handover, { event_id: event.id }),
      svc.entities.Group.count({ event_id: event.id }),
    ]);
    return {
      found: true,
      nama: event.nama,
      tanggal: event.tanggal,
      jenis_paket: event.jenis_paket,
      stok_awal: Number(event.stok_awal ?? 0),
      diserahkan: Number(event.terpakai ?? 0),
      sisa: Number(event.stok_awal ?? 0) - Number(event.terpakai ?? 0),
      jumlah_penerima: recipients,
      jumlah_kelompok: groups,
      perwakilan: handovers.filter((handover) => !!handover.nama_pengambil).length,
      di_luar_gelombang: handovers.filter((handover) => handover.di_luar_gelombang).length,
      status: event.status,
    };
  });