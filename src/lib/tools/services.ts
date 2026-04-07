import { tool } from "ai";
import { z } from "zod";

const DCC_SERVICES_API_URL = process.env.DCC_SERVICES_API_URL ?? "http://127.0.0.1:3000";

export const listServices = tool({
  description:
    "Lista todos los servicios disponibles en el DCC (Departamento de Ciencias de la Computación). Incluye descripción, URL y categoría de cada servicio.",
  inputSchema: z.object({
    _unused: z.string().optional().describe("No se necesitan parámetros"),
  }),
  execute: async () => {
    try {
      const res = await fetch(`${DCC_SERVICES_API_URL}/api/services`);
      if (!res.ok) return { error: true, status: res.status, message: "Error fetching services" };
      return await res.json();
    } catch (error) {
      return { error: true, message: String(error) };
    }
  },
});
