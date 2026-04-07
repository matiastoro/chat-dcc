import { tool } from "ai";
import { z } from "zod";

const ATRACK_BASE = process.env.ATRACK_URL ?? "http://127.0.0.1:3000";

async function atrackFetch(rut: string, path: string, options?: RequestInit) {
  const url = `${ATRACK_BASE}/api/professors/${rut}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await res.json();
  if (!res.ok) return { error: true, status: res.status, ...data };
  return data;
}

export function createAcademicTools(rut: string) {
  return {
    listStudents: tool({
      description:
        "Lista todos los estudiantes del profesor, incluyendo su última fecha de reunión y plazos pendientes.",
      inputSchema: z.object({
        _unused: z.string().optional().describe("No se necesitan parámetros"),
      }),
      execute: async () => atrackFetch(rut, "/students"),
    }),

    registerMeeting: tool({
      description:
        "Registra una reunión con un estudiante. Usa el nombre (o nombre parcial) del estudiante. Si es ambiguo, retorna candidatos para que el usuario elija.",
      inputSchema: z.object({
        studentName: z.string().describe("Nombre (o nombre parcial) del estudiante"),
        notes: z.string().optional().describe("Notas opcionales sobre la reunión"),
      }),
      execute: async ({ studentName, notes }) => {
        return atrackFetch(rut, "/students/meetings", {
          method: "POST",
          body: JSON.stringify({ studentName, notes }),
        });
      },
    }),
  };
}
