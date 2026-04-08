# API para Chatbot de Reservas

API REST para que un chatbot consulte disponibilidad y gestione reservas de salas a nombre de usuarios identificados por su RUT.

## Modelo de autorización

```
Token (API Key)  →  autoriza al bot a operar en una organización
RUT              →  identifica al usuario final en operaciones de mutación
```

- **Lecturas** (salas, disponibilidad): solo requieren el token
- **Mutaciones** (crear reserva, eliminar reserva, listar reservas de un usuario): requieren token + RUT

## Autenticación

Todas las peticiones requieren una API Key en el header `Authorization`:

```
Authorization: Bearer bot_<token>
```

SAR_API_KEY=bot_f259e64d7b57f3a3a389250e508e871e33fcee5aca004d3c

---

## Endpoints

Base URL: `/api/bot/`

### 1. Listar salas

```
GET /api/bot/salas/
```

Retorna todas las salas activas de la organización. No requiere RUT.

**Respuesta 200:**

```json
{
  "organizacion": "DCC",
  "total": 2,
  "salas": [
    {
      "id": 5,
      "nombre": "Sala Turing",
      "capacidad": 20,
      "descripcion": "Sala principal del departamento"
    },
    {
      "id": 6,
      "nombre": "Sala Knuth",
      "capacidad": 10,
      "descripcion": "Sala de reuniones"
    }
  ]
}
```

---

### 2. Consultar disponibilidad

```
GET /api/bot/disponibilidad/?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD[&recurso=ID]
```

No requiere RUT. Retorna bloques libres y ocupados para cada sala.

**Parámetros:**

| Param          | Tipo   | Requerido | Descripción                          |
|----------------|--------|-----------|--------------------------------------|
| `fecha_inicio` | date   | Si        | Fecha de inicio del rango (YYYY-MM-DD) |
| `fecha_fin`    | date   | Si        | Fecha de fin del rango (YYYY-MM-DD)   |
| `recurso`      | int    | No        | ID de sala para filtrar              |

**Restricciones:**
- Rango máximo: 31 días
- `fecha_fin` >= `fecha_inicio`
- Solo se muestran días con horario permitido (ej: lun-vie si la org no abre fines de semana)

**Respuesta 200:**

```json
{
  "organizacion": "DCC",
  "fecha_inicio": "2026-04-06",
  "fecha_fin": "2026-04-06",
  "salas": [
    {
      "id": 5,
      "nombre": "Sala Turing",
      "capacidad": 20,
      "dias": [
        {
          "fecha": "2026-04-06",
          "bloques_libres": [
            { "inicio": "08:00", "termino": "10:00" },
            { "inicio": "14:00", "termino": "20:00" }
          ],
          "bloques_ocupados": [
            {
              "inicio": "10:00",
              "termino": "14:00",
              "descripcion": "Reunión de equipo"
            }
          ]
        }
      ]
    }
  ]
}
```

**Errores:**

| Código | Causa                              |
|--------|------------------------------------|
| 400    | Parámetros faltantes o inválidos   |
| 404    | Sala no encontrada en la org       |

---

### 3. Listar reservas de un usuario

```
GET /api/bot/reservas/?rut=12345678
```

Retorna las reservas del usuario identificado por RUT, filtradas a la organización de la API key.

**Parámetros:**

| Param | Tipo   | Requerido | Descripción            |
|-------|--------|-----------|------------------------|
| `rut` | string | Si        | RUT del usuario (username) |

**Respuesta 200:**

```json
{
  "rut": "12345678",
  "total": 2,
  "reservas": [
    {
      "id": 101,
      "recurso_id": 5,
      "recurso_nombre": "Sala Turing",
      "inicio": "2026-04-07T10:00:00",
      "termino": "2026-04-07T12:00:00",
      "categoria": "Docencia",
      "descripcion_uso": "Taller de Python",
      "serie_id": null
    },
    {
      "id": 99,
      "recurso_id": 6,
      "recurso_nombre": "Sala Knuth",
      "inicio": "2026-04-06T14:00:00",
      "termino": "2026-04-06T16:00:00",
      "categoria": null,
      "descripcion_uso": "Reunión",
      "serie_id": "a1b2c3d4-..."
    }
  ]
}
```

**Errores:**

| Código | Causa                    |
|--------|--------------------------|
| 400    | Falta el parámetro `rut` |
| 404    | RUT no encontrado        |

---

### 4. Crear reserva

```
POST /api/bot/reservas/
Content-Type: application/json
```

Crea una reserva **a nombre del usuario identificado por RUT**.

**Body:**

```json
{
  "rut": "12345678",
  "recurso": 5,
  "inicio": "2026-04-06T10:00:00",
  "termino": "2026-04-06T12:00:00",
  "descripcion_uso": "Taller de Python",
  "categoria": 2,
  "repeticion": "weekly",
  "fecha_fin_repeticion": "2026-06-30"
}
```

**Campos:**

| Campo                 | Tipo     | Requerido | Descripción                                   |
|-----------------------|----------|-----------|-----------------------------------------------|
| `rut`                 | string   | Si        | RUT del usuario que reserva                   |
| `recurso`             | int      | Si        | ID de la sala                                 |
| `inicio`              | datetime | Si        | Fecha y hora de inicio (ISO 8601)             |
| `termino`             | datetime | Si        | Fecha y hora de término (ISO 8601)            |
| `descripcion_uso`     | string   | Si        | Descripción del uso de la sala                |
| `categoria`           | int      | No        | ID de categoría (debe ser de la misma org)    |
| `repeticion`          | string   | No        | `"none"` (default), `"daily"`, `"weekly"`, `"monthly"` |
| `fecha_fin_repeticion`| date     | Cond.     | Requerido si `repeticion` != `"none"` (YYYY-MM-DD) |

**Respuesta 201 (creada):**

```json
{
  "mensaje": "Se crearon 4 reserva(s) correctamente.",
  "rut": "12345678",
  "reservas": [
    { "id": 101, "inicio": "2026-04-06T10:00:00", "termino": "2026-04-06T12:00:00" },
    { "id": 102, "inicio": "2026-04-13T10:00:00", "termino": "2026-04-13T12:00:00" },
    { "id": 103, "inicio": "2026-04-20T10:00:00", "termino": "2026-04-20T12:00:00" },
    { "id": 104, "inicio": "2026-04-27T10:00:00", "termino": "2026-04-27T12:00:00" }
  ],
  "serie_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

`serie_id` es `null` para reservas individuales (sin repetición).

**Respuesta 409 (conflictos):**

```json
{
  "error": "conflictos",
  "total_instancias": 4,
  "total_conflictos": 1,
  "conflictos": [
    {
      "instancia": 2,
      "fecha": "2026-04-13",
      "inicio": "10:00",
      "termino": "12:00",
      "ocupado_por": "Clase de Algoritmos"
    }
  ]
}
```

Cuando hay conflictos, **no se crea ninguna reserva**.

**Otros errores:**

| Código | Causa                                              |
|--------|----------------------------------------------------|
| 400    | Campos faltantes, formato inválido, horario no permitido |
| 404    | RUT no encontrado, sala no encontrada/inactiva, categoría no encontrada |
| 409    | Conflicto con reservas existentes                  |

---

### 5. Eliminar reserva

```
DELETE /api/bot/reservas/<id>/
Content-Type: application/json
```

Elimina una reserva. Requiere el RUT del dueño de la reserva en el body.

**Body:**

```json
{
  "rut": "12345678"
}
```

**Respuesta 200:**

```json
{
  "mensaje": "Reserva 101 eliminada correctamente.",
  "id": 101
}
```

**Errores:**

| Código | Causa                                                    |
|--------|----------------------------------------------------------|
| 400    | Falta el campo `rut`                                     |
| 404    | RUT no encontrado, reserva no existe, o no pertenece al usuario/org |

Solo se puede eliminar una reserva si pertenece al usuario indicado por RUT **y** a la organización de la API key.

---

## Validaciones

Las reservas pasan por las mismas validaciones que el sistema web:

1. **RUT válido**: El usuario debe existir en el sistema
2. **Recurso activo**: La sala debe estar activa
3. **Horario permitido**: Debe estar dentro del horario configurado de la organización
4. **Sin conflictos**: No puede haber reservas existentes que se solapen en la misma sala
5. **Categoría válida**: Si se especifica, debe pertenecer a la misma organización

Para reservas recurrentes, **todas** las instancias se validan antes de crear. Si alguna tiene conflicto, no se crea ninguna.

---

## Ejemplo con curl

```bash
# Listar salas
curl -H "Authorization: Bearer bot_abc123..." \
  https://mi-sistema.cl/api/bot/salas/

# Consultar disponibilidad
curl -H "Authorization: Bearer bot_abc123..." \
  "https://mi-sistema.cl/api/bot/disponibilidad/?fecha_inicio=2026-04-06&fecha_fin=2026-04-10"

# Listar reservas de un usuario
curl -H "Authorization: Bearer bot_abc123..." \
  "https://mi-sistema.cl/api/bot/reservas/?rut=12345678"

# Crear reserva a nombre de un usuario
curl -X POST \
  -H "Authorization: Bearer bot_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"rut": "12345678", "recurso": 5, "inicio": "2026-04-06T10:00:00", "termino": "2026-04-06T12:00:00", "descripcion_uso": "Taller"}' \
  https://mi-sistema.cl/api/bot/reservas/

# Eliminar reserva
curl -X DELETE \
  -H "Authorization: Bearer bot_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"rut": "12345678"}' \
  https://mi-sistema.cl/api/bot/reservas/101/
```

---

## Notas de seguridad

- Cada key está limitada a **una sola organización**
- Las mutaciones requieren **token + RUT** — el token solo no basta para operar a nombre de alguien
- Todas las reservas quedan asociadas al usuario real (RUT), no al bot, para trazabilidad
