const HEADERS = ["nama", "kelompok", "jumlah_anggota", "hp"];

function detectDelimiter(line) {
  const semicolons = (line.match(/;/g) ?? []).length;
  const commas = (line.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

function splitLine(line, delimiter) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

/** Teks CSV → baris {nama, kelompok, jumlah_anggota, hp} */
export function parseRecipientCsv(text) {
  const lines = String(text ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => line.trim().length > 0);
  if (!lines.length) return [];
  const delimiter = detectDelimiter(lines[0]);
  const first = splitLine(lines[0], delimiter).map((cell) => cell.toLowerCase());
  const hasHeader = HEADERS.some((header) => first.includes(header));
  const body = hasHeader ? lines.slice(1) : lines;
  const index = {
    nama: hasHeader ? first.indexOf("nama") : 0,
    kelompok: hasHeader ? first.indexOf("kelompok") : 1,
    jumlah_anggota: hasHeader ? first.indexOf("jumlah_anggota") : 2,
    hp: hasHeader ? first.indexOf("hp") : 3,
  };
  return body.map((line) => {
    const cells = splitLine(line, delimiter);
    const pick = (key) => (index[key] >= 0 ? cells[index[key]] ?? "" : "");
    return {
      nama: pick("nama"),
      kelompok: pick("kelompok"),
      jumlah_anggota: pick("jumlah_anggota"),
      hp: pick("hp"),
    };
  });
}

export function downloadCsvTemplate() {
  const rows = [
    HEADERS.join(","),
    "Siti Aminah,RT 01,4,081200000001",
    "Budi Santoso,RT 01,3,",
    "Rina Wati,RT 02,5,081200000003",
  ].join("\n");
  const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "templat-penerima-giliran.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename, headers, rows) {
  const escape = (value) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const body = [headers.join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Periksa baris: kolom wajib, jumlah anggota, dan baris ganda (nama + kelompok). */
export function validateRows(rows) {
  const seen = new Map();
  return rows.map((row) => {
    const errors = [];
    const nama = String(row.nama ?? "").trim();
    const kelompok = String(row.kelompok ?? "").trim();
    const anggota = Number(String(row.jumlah_anggota ?? "").replace(",", "."));
    if (!nama) errors.push("Nama kosong");
    if (!kelompok) errors.push("Kelompok kosong");
    if (!Number.isFinite(anggota) || anggota < 1) errors.push("Jumlah anggota harus angka ≥ 1");
    const key = `${nama.toLowerCase()}|${kelompok.toLowerCase()}`;
    if (nama && kelompok) {
      if (seen.has(key)) {
        errors.push("Baris ganda");
        seen.get(key).errors.push("Baris ganda");
      } else {
        seen.set(key, { errors });
      }
    }
    return { ...row, errors };
  });
}