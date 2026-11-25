// Rumus kapasitas gelombang GILIRAN. Dipakai di layar supaya admin bisa memeriksa angkanya.
export const DEFAULT_UTILISATION = 0.8;

export function parseClock(value) {
  const match = /^(\d{1,2})[:.](\d{2})$/.exec(String(value ?? "").trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function clockLabel(totalMinutes) {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hh = String(Math.floor(minutes / 60) % 24).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Waktu satu kelompok di satu meja (menit) = keluarga × menit_per_orang ÷ faktor_utilisasi */
export function groupMinutes(jumlahKeluarga, menitPerOrang, utilisasi) {
  const m = Number(menitPerOrang) || 0;
  const u = Number(utilisasi) || 0;
  if (!m || !u) return 0;
  return (Number(jumlahKeluarga) * m) / u;
}

/** Kapasitas nominal per meja per jam = 60 ÷ menit_per_orang */
export function nominalPerHour(menitPerOrang) {
  const m = Number(menitPerOrang) || 0;
  return m ? 60 / m : 0;
}

/** Kapasitas per meja dalam satu jendela = (menit jendela ÷ menit_per_orang) × utilisasi */
export function windowCapacity(windowMinutes, menitPerOrang, utilisasi) {
  const m = Number(menitPerOrang) || 0;
  if (!m) return 0;
  return (Number(windowMinutes) / m) * (Number(utilisasi) || 0);
}

/** Estimasi total jika hanya satu meja dipakai (menit) = total keluarga × menit ÷ utilisasi */
export function singleTableMinutes(totalKeluarga, menitPerOrang, utilisasi) {
  return groupMinutes(totalKeluarga, menitPerOrang, utilisasi);
}

/**
 * Usulan gelombang: kelompok diurutkan per nama, lalu dibagi memanjang
 * (kolom per meja) supaya setiap meja melayani satu kelompok di tiap gelombang.
 */
export function suggestWaves(groups, tableCount, menitPerOrang, utilisasi, startClock = "09:00") {
  const tables = Math.max(1, Number(tableCount) || 1);
  const list = [...groups].sort((a, b) => String(a.nama).localeCompare(String(b.nama), "id"));
  if (!list.length) return [];
  const required = list.map((group) => groupMinutes(group.jumlah_keluarga, menitPerOrang, utilisasi));
  const longest = Math.max(...required);
  const windowLength = Math.max(30, Math.ceil(longest / 30) * 30);
  const waveCount = Math.ceil(list.length / tables);
  const start = parseClock(startClock) ?? 9 * 60;

  return Array.from({ length: waveCount }, (_, waveIndex) => {
    const members = [];
    for (let i = 0; i < list.length; i += 1) {
      const wave = i % waveCount;
      if (wave !== waveIndex) continue;
      const tableIndex = Math.floor(i / waveCount);
      const group = list[i];
      members.push({
        groupId: group.id,
        nama: group.nama,
        jumlahKeluarga: Number(group.jumlah_keluarga ?? 0),
        tableIndex: Math.min(tableIndex, tables - 1),
        butuh: groupMinutes(group.jumlah_keluarga, menitPerOrang, utilisasi),
      });
    }
    return {
      gelombang: waveIndex + 1,
      mulai: clockLabel(start + waveIndex * windowLength),
      selesai: clockLabel(start + (waveIndex + 1) * windowLength),
      jendela: windowLength,
      groups: members,
    };
  });
}

export function minutesBetween(mulai, selesai) {
  const a = parseClock(mulai);
  const b = parseClock(selesai);
  if (a === null || b === null || b <= a) return 0;
  return b - a;
}