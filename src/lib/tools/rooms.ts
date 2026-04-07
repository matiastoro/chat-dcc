import { tool } from "ai";
import { z } from "zod";

const SAR_API_URL =
  process.env.ROOMS_API_URL ??
  "https://apps.dcc.uchile.cl/sistema_administracion_recursos";

const OFFICE_START = 8;
const OFFICE_END = 20;
// Chile timezone offset — API returns dates with this offset
const TZ_OFFSET = "-04:00";

// Known room IDs from SAR API
const ROOM_IDS: Record<string, number> = {
  "P306 - Ada Lovelace": 1,
  "Fundadores DCC": 2,
  "Efraín Friedmann": 3,
  "P307 - Grace Hopper": 4,
  "Ramón Picarte": 5,
  "P303 - Philippe Flajolet": 6,
};

// Known category IDs from SAR API
const CATEGORY_IDS: Record<string, number> = {
  "Clases": 2,
  "Reunión de Trabajo": 3,
  "Taller - Foro - Seminario - Conferencia - Feria": 5,
  "Otros": 6,
  "Actividad Academico-Social": 7,
  "Examen de Título": 16,
};

interface Prestamo {
  id: number;
  inicio: string;
  termino: string;
  recurso_nombre: string;
  user_nombre: string;
  categoria_nombre: string;
  descripcion_uso: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function computeFreeSlots(
  reservations: Prestamo[],
  dateStr: string
): string[] {
  const sorted = reservations
    .map((r) => ({
      start: new Date(r.inicio),
      end: new Date(r.termino),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const dayStart = new Date(`${dateStr}T${pad(OFFICE_START)}:00:00${TZ_OFFSET}`);
  const dayEnd = new Date(`${dateStr}T${pad(OFFICE_END)}:00:00${TZ_OFFSET}`);

  // Extract local time (in Chile TZ) from a Date object
  const localHM = (d: Date): string => {
    // Convert UTC ms back to Chile local time
    const offsetMs = -4 * 60 * 60 * 1000; // -04:00
    const local = new Date(d.getTime() + offsetMs);
    return `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
  };

  const free: string[] = [];
  let cursor = dayStart;

  for (const slot of sorted) {
    if (slot.end <= cursor) continue;
    if (slot.start > cursor) {
      free.push(`${localHM(cursor)}-${localHM(slot.start)}`);
    }
    if (slot.end > cursor) cursor = slot.end;
  }

  if (cursor < dayEnd) {
    free.push(`${localHM(cursor)}-${localHM(dayEnd)}`);
  }

  return free;
}

function resolveRoomId(roomName: string): number | null {
  const needle = roomName.toLowerCase();
  for (const [name, id] of Object.entries(ROOM_IDS)) {
    if (name.toLowerCase().includes(needle) || needle.includes(name.toLowerCase())) {
      return id;
    }
  }
  return null;
}

function resolveCategoryId(categoryName: string): number | null {
  const needle = categoryName.toLowerCase();
  for (const [name, id] of Object.entries(CATEGORY_IDS)) {
    if (name.toLowerCase().includes(needle) || needle.includes(name.toLowerCase())) {
      return id;
    }
  }
  return null;
}

export function createRoomTools(_rut: string) {
  return {
    checkRoomAvailability: tool({
      description:
        "Consulta la disponibilidad de salas del DCC en un rango de fechas. Retorna los bloques LIBRES de cada sala por día.",
      inputSchema: z.object({
        startDate: z.string().describe("Fecha inicio en formato YYYY-MM-DD"),
        endDate: z.string().describe("Fecha fin en formato YYYY-MM-DD"),
        room: z
          .string()
          .optional()
          .describe(
            "Nombre de la sala para filtrar (ej: 'Efraín Friedmann', 'Ada Lovelace'). Si se omite, muestra todas."
          ),
      }),
      execute: async ({ startDate, endDate, room }) => {
        try {
          // API fecha_fin is exclusive, so add one day
          const endExclusive = new Date(endDate);
          endExclusive.setDate(endExclusive.getDate() + 1);
          const endExclusiveStr = endExclusive.toISOString().split("T")[0];

          const params = new URLSearchParams({
            fecha_inicio: startDate,
            fecha_fin: endExclusiveStr,
          });

          // Determine which rooms to show
          let targetRooms: string[];
          if (room) {
            const needle = room.toLowerCase();
            targetRooms = Object.keys(ROOM_IDS).filter(
              (name) => name.toLowerCase().includes(needle) || needle.includes(name.toLowerCase())
            );
            if (targetRooms.length === 0) {
              return {
                error: true,
                message: `Sala "${room}" no encontrada. Salas disponibles: ${Object.keys(ROOM_IDS).join(", ")}`,
              };
            }
            // Filter by resource ID in the API query
            for (const name of targetRooms) {
              params.append("recursos", String(ROOM_IDS[name]));
            }
          } else {
            targetRooms = Object.keys(ROOM_IDS);
          }

          const res = await fetch(`${SAR_API_URL}/api/prestamos/?${params}`);
          console.log(`[rooms] API request: ${SAR_API_URL}/api/prestamos/?${params}`);
          if (!res.ok) return { error: true, status: res.status };

          const data: Prestamo[] = await res.json();
          console.log("[rooms] data count:", data.length, "items:", data.map(r => `${r.recurso_nombre} ${r.inicio}`).join(", "));
          const start = new Date(startDate);
          const end = new Date(endDate);
          const dates: string[] = [];
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(d.toISOString().split("T")[0]);
          }

          const availability: Record<
            string,
            { date: string; freeSlots: string[] }[]
          > = {};

          for (const roomName of targetRooms) {
            availability[roomName] = [];
            for (const dateStr of dates) {
              const dayReservations = data.filter(
                (r) =>
                  r.recurso_nombre === roomName &&
                  r.inicio.startsWith(dateStr)
              );
              console.log(`[rooms] ${roomName} on ${dateStr}: ${dayReservations.length} reservations`);
              const freeSlots = computeFreeSlots(dayReservations, dateStr);
              availability[roomName].push({ date: dateStr, freeSlots });
            }
          }

          return {
            period: `${startDate} a ${endDate}`,
            officeHours: `${pad(OFFICE_START)}:00-${pad(OFFICE_END)}:00`,
            availability,
          };
        } catch (error) {
          return { error: true, message: String(error) };
        }
      },
    }),

    createRoomReservation: tool({
      description: `Crea una reserva de sala en el DCC.
Salas disponibles: ${Object.keys(ROOM_IDS).join(", ")}.
Categorías: ${Object.keys(CATEGORY_IDS).join(", ")}.
IMPORTANTE: Siempre confirmar los detalles con el usuario antes de ejecutar esta herramienta.`,
      inputSchema: z.object({
        room: z.string().describe("Nombre de la sala (ej: 'Efraín Friedmann')"),
        date: z.string().describe("Fecha en formato YYYY-MM-DD"),
        startTime: z.string().describe("Hora inicio en formato HH:MM"),
        endTime: z.string().describe("Hora término en formato HH:MM"),
        category: z.string().describe("Categoría de uso (ej: 'Reunión de Trabajo', 'Clases', 'Otros')"),
        description: z.string().describe("Descripción del uso de la sala"),
        repetition: z
          .enum(["none", "daily", "weekly", "monthly"])
          .optional()
          .describe("Tipo de repetición (por defecto: none)"),
        repeatUntil: z
          .string()
          .optional()
          .describe("Fecha fin de repetición en formato YYYY-MM-DD (requerido si repetition != none)"),
      }),
      execute: async ({ room, date, startTime, endTime, category, description, repetition, repeatUntil }) => {
        const roomId = resolveRoomId(room);
        if (roomId === null) {
          return {
            error: true,
            message: `Sala "${room}" no encontrada. Salas disponibles: ${Object.keys(ROOM_IDS).join(", ")}`,
          };
        }

        const categoryId = resolveCategoryId(category);
        if (categoryId === null) {
          return {
            error: true,
            message: `Categoría "${category}" no encontrada. Categorías: ${Object.keys(CATEGORY_IDS).join(", ")}`,
          };
        }

        const rep = repetition ?? "none";
        if (rep !== "none" && !repeatUntil) {
          return {
            error: true,
            message: "Para reservas recurrentes se requiere fecha fin de repetición (repeatUntil).",
          };
        }

        const body = {
          inicio: `${date}T${startTime}:00.000Z`,
          termino: `${date}T${endTime}:00.000Z`,
          recurso: roomId,
          categoria: categoryId,
          descripcion_uso: description,
          repeticion: rep,
          fecha_fin_repeticion: rep !== "none" ? repeatUntil : null,
        };

        try {
          // TODO: Auth token pendiente — el equipo de desarrollo está
          // trabajando en autenticación por RUT + token privado para el agente.
          const res = await fetch(
            `${SAR_API_URL}/api/admin/prestamos/recurrente/`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          );

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: true, status: res.status, ...errorData };
          }

          return { success: true, ...(await res.json()) };
        } catch (error) {
          return { error: true, message: String(error) };
        }
      },
    }),
  };
}
