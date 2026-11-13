export type Turno = "Comida" | "Cena";

export interface Reserva {
  id: string;
  fecha: string; // YYYY-MM-DD
  turno: Turno;
  nombre: string;
  telefono: string;
  comensales: number;
  estado: string;
  fechaCreacion: string;
}

export const ESTADOS = ["Confirmada", "Pendiente", "Cancelada", "Sentada"];

/** Convierte filas de Google Sheets (con cabecera) en reservas. */
export function parseRows(rows: string[][]): Reserva[] {
  if (!rows.length) return [];
  const [header = [], ...data] = rows;
  const norm = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const idx = (name: string) => header.findIndex((h) => norm(h) === norm(name));
  const c = {
    id: idx("ID"),
    fecha: idx("Fecha"),
    turno: idx("Turno"),
    nombre: idx("Nombre Cliente"),
    tel: idx("Teléfono"),
    com: idx("Comensales"),
    estado: idx("Estado"),
    creado: idx("FechaCreacion"),
  };
  return data
    .filter((r) => r[c.id])
    .map((r) => ({
      id: r[c.id] ?? "",
      fecha: (r[c.fecha] ?? "").slice(0, 10),
      turno: (r[c.turno] ?? "").toLowerCase().startsWith("cena") ? "Cena" : "Comida",
      nombre: r[c.nombre] ?? "",
      telefono: (() => {
        const t = (r[c.tel] ?? "").split("@")[0]?.trim() ?? "";
        if (/^\d{9}$/.test(t)) return `+34${t}`;
        return /^\d{10,}$/.test(t) ? `+${t}` : t;
      })(),
      comensales: parseInt(r[c.com] ?? "0", 10) || 0,
      estado: r[c.estado] ?? "Pendiente",
      fechaCreacion: r[c.creado] ?? "",
    }));
}

const NOMBRES = [
  "Lucía Martínez", "Javier Gómez", "Carmen Ruiz", "Pablo Fernández", "Elena Navarro",
  "Diego Torres", "Marta Sánchez", "Sergio López", "Ana Morales", "Raúl Ortega",
  "Isabel Romero", "Álvaro Castro",
];

/** Datos de ejemplo deterministas por fecha (cuando no hay hoja conectada). */
export function demoReservas(fecha: string): Reserva[] {
  let seed = [...fecha].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) % 1000) / 1000;
  const n = 6 + Math.floor(rnd() * 8);
  return Array.from({ length: n }, (_, i) => {
    const e = rnd();
    return {
      id: `R-${fecha.replace(/-/g, "").slice(2)}-${String(i + 1).padStart(2, "0")}`,
      fecha,
      turno: rnd() > 0.45 ? "Cena" : "Comida",
      nombre: NOMBRES[Math.floor(rnd() * NOMBRES.length)],
      telefono: `+34 6${Math.floor(10000000 + rnd() * 89999999)}`,
      comensales: 1 + Math.floor(rnd() * 8),
      estado: e < 0.65 ? "Confirmada" : e < 0.85 ? "Pendiente" : "Cancelada",
      fechaCreacion: `${fecha}T09:${String(i * 4).padStart(2, "0")}:00`,
    } as Reserva;
  });
}

export function resumen(reservas: Reserva[]) {
  const activas = reservas.filter((r) => r.estado !== "Cancelada");
  const sum = (t?: Turno) =>
    activas.filter((r) => !t || r.turno === t).reduce((a, r) => a + r.comensales, 0);
  return {
    comensales: sum(),
    comida: reservas.filter((r) => r.turno === "Comida").length,
    cena: reservas.filter((r) => r.turno === "Cena").length,
    comensalesComida: sum("Comida"),
    comensalesCena: sum("Cena"),
  };
}
