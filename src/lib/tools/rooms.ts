import { tool } from "ai";
import { z } from "zod";

async function sarFetch(path: string, options?: RequestInit) {
  const sarApiUrl =
    process.env.ROOMS_API_URL ??
    "https://apps.dcc.uchile.cl/sistema_administracion_recursos";
  const sarApiKey = process.env.SAR_API_KEY ?? "";
  const url = `${sarApiUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${sarApiKey}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: true, status: res.status, ...data };
  return data;
}

export function createRoomTools(rut: string) {
  return {
    listRooms: tool({
      description: "Lista todas las salas disponibles del DCC con su ID, nombre, capacidad y descripción.",
      inputSchema: z.object({
        _unused: z.string().optional().describe("No se necesitan parámetros"),
      }),
      execute: async () => sarFetch("/api/bot/salas/"),
    }),

    checkRoomAvailability: tool({
      description:
        "Consulta la disponibilidad de salas del DCC en un rango de fechas. Retorna bloques libres y ocupados por sala y día. Rango máximo: 31 días.",
      inputSchema: z.object({
        startDate: z.string().describe("Fecha inicio en formato YYYY-MM-DD"),
        endDate: z.string().describe("Fecha fin en formato YYYY-MM-DD"),
        roomId: z
          .number()
          .optional()
          .describe("ID numérico de la sala para filtrar. Usar listRooms para obtener IDs."),
      }),
      execute: async ({ startDate, endDate, roomId }) => {
        const params = new URLSearchParams({
          fecha_inicio: startDate,
          fecha_fin: endDate,
        });
        if (roomId !== undefined) params.set("recurso", String(roomId));
        return sarFetch(`/api/bot/disponibilidad/?${params}`);
      },
    }),

    listMyReservations: tool({
      description: "Lista las reservas del usuario autenticado.",
      inputSchema: z.object({
        _unused: z.string().optional().describe("No se necesitan parámetros"),
      }),
      execute: async () => sarFetch(`/api/bot/reservas/?rut=${rut}`),
    }),

    createReservation: tool({
      description: `Crea una reserva de sala a nombre del usuario autenticado.
IMPORTANTE: Siempre confirmar los detalles con el usuario antes de ejecutar.
Si hay conflictos, no se crea ninguna reserva y se retornan los conflictos.`,
      inputSchema: z.object({
        roomId: z.number().describe("ID numérico de la sala. Usar listRooms para obtener IDs."),
        date: z.string().describe("Fecha en formato YYYY-MM-DD"),
        startTime: z.string().describe("Hora inicio en formato HH:MM"),
        endTime: z.string().describe("Hora término en formato HH:MM"),
        description: z.string().describe("Descripción del uso de la sala"),
        categoryId: z.number().optional().describe("ID de categoría de uso (opcional)"),
        repetition: z
          .enum(["none", "daily", "weekly", "monthly"])
          .optional()
          .describe("Tipo de repetición (por defecto: none)"),
        repeatUntil: z
          .string()
          .optional()
          .describe("Fecha fin de repetición YYYY-MM-DD (requerido si repetition != none)"),
      }),
      execute: async ({ roomId, date, startTime, endTime, description, categoryId, repetition, repeatUntil }) => {
        const rep = repetition ?? "none";
        if (rep !== "none" && !repeatUntil) {
          return { error: true, message: "Para reservas recurrentes se requiere fecha fin de repetición (repeatUntil)." };
        }

        const body: Record<string, unknown> = {
          rut,
          recurso: roomId,
          inicio: `${date}T${startTime}:00`,
          termino: `${date}T${endTime}:00`,
          descripcion_uso: description,
          repeticion: rep,
        };
        if (categoryId !== undefined) body.categoria = categoryId;
        if (rep !== "none") body.fecha_fin_repeticion = repeatUntil;

        return sarFetch("/api/bot/reservas/", {
          method: "POST",
          body: JSON.stringify(body),
        });
      },
    }),

    deleteReservation: tool({
      description: "Elimina una reserva del usuario autenticado por su ID.",
      inputSchema: z.object({
        reservationId: z.number().describe("ID de la reserva a eliminar"),
      }),
      execute: async ({ reservationId }) => {
        return sarFetch(`/api/bot/reservas/${reservationId}/`, {
          method: "DELETE",
          body: JSON.stringify({ rut }),
        });
      },
    }),
  };
}
