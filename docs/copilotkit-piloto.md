# Piloto CopilotKit — Asistente dentro del cuaderno

Rama: `piloto/copilotkit`. Estado: **piloto apagado por defecto**, aditivo.
No reemplaza ni modifica el Tutor IA, «Estudiar con IA» ni el Copiloto docente.

## Qué prueba

Que CopilotKit aporta lo que Kampus **no** tiene hoy: un asistente que vive
dentro de la pantalla del cuaderno abierto y que puede **actuar** en la app,
no solo conversar:

1. **Lee el cuaderno abierto** (`useCopilotReadable`): recibe el título del
   cuaderno y la estructura de hojas/temas (título de tema o nombre de
   archivo, y fecha de clase). Solo estructura: **nunca** se envía el
   contenido/extracto de las hojas.
2. **Ejecuta una acción frontal estrella** (`useCopilotAction`):
   `generarPlanDeRepasos`. Arma un plan de estudio con repetición espaciada
   (rondas en los días 1, 3, 7 y 14, lógica en
   `lib/copilot-pilot/study-plan.ts`), lo presenta como **tarjeta en la
   pantalla** y ofrece el botón «Ir a mis repasos» hacia el flujo existente
   `/repasos`.
3. **Regla socrática de Kampus**: las instrucciones del asistente obligan a
   guiar con preguntas y prohíben hacer la tarea o resolver exámenes por el
   estudiante, igual que el Tutor IA.

## Cómo se enciende

Variables de entorno (además de las que Kampus ya usa):

| Variable | Valor | Notas |
| --- | --- | --- |
| `NEXT_PUBLIC_COPILOT_PILOT_ENABLED` | `true` | Sin esto (o con otro valor) el piloto no se monta y `/api/copilotkit` responde 404. |
| `OPENAI_API_KEY` | la de la app | Es la misma clave que ya usa el Tutor; el piloto usa el proveedor existente (OpenAI). |
| `OPENAI_MODEL` | opcional | Por defecto `gpt-4.1-mini`, como el resto de rutas. |
| `API_DAILY_LIMIT_COPILOT_PILOT` | opcional | Límite diario por usuario del piloto. Por defecto `30`. |

En local: agrega `NEXT_PUBLIC_COPILOT_PILOT_ENABLED=true` a tu `.env.local`,
reinicia `npm run dev`, inicia sesión y abre un cuaderno con hojas desde
Mis cuadernos → el lector. Aparece el botón del asistente (barra lateral).

## Seguridad: auth y cuota

- La ruta `app/api/copilotkit/route.ts` exige sesión de Supabase:
  sin usuario autenticado responde **401** (GET y POST). No hay acceso
  anónimo al modelo.
- Cada POST consume la cuota diaria existente (`consume_api_quota`, la
  misma RPC de las demás rutas de IA) con la clave propia **`copilot_pilot`**
  vía el helper compartido `consumeDailyUserQuota`. Si la cuota se agota,
  responde **429** con `Retry-After`. Si el runtime falla después de
  consumir, se reembolsa con `refundDailyUserQuotaForCurrentUser`, igual
  que hace el Tutor («la cuota cuenta respuestas, no intentos»).
- Sin cambios de esquema ni migraciones nuevas: la clave `copilot_pilot`
  es solo un valor nuevo en la tabla/RPC existentes.

## Piezas

| Archivo | Rol |
| --- | --- |
| `app/api/copilotkit/route.ts` | Runtime de CopilotKit + auth + cuota. |
| `components/copilot-pilot/notebook-copilot.tsx` | Puerta con la bandera; carga diferida (con la bandera apagada, el JS de CopilotKit ni se descarga). |
| `components/copilot-pilot/notebook-copilot-inner.tsx` | `CopilotKit` + `CopilotSidebar` en español, `useCopilotReadable` y la acción estrella con su tarjeta. |
| `components/study/notebook-reader.tsx` | Único punto de montaje: la página del cuaderno. |
| `lib/copilot-pilot/config.ts` | Bandera y límite diario. |
| `lib/copilot-pilot/study-plan.ts` | Plan espaciado puro y testeable. |

Paquetes: `@copilotkit/react-core`, `@copilotkit/react-ui` y
`@copilotkit/runtime` en **1.79.1**, más `openai` **7.43.0** (el adaptador
de CopilotKit lo requiere; las versiones 4.x/5.x de `openai` chocan con el
peer de zod v4 de la app, la 7.x lo soporta). Se usa la API v1 de
CopilotKit (`CopilotRuntime` + `OpenAIAdapter`), marcada como *deprecated*
por el propio paquete a favor de su v2; para el piloto es la vía estable y
documentada en Next App Router.

## Cómo probarlo

1. Tests automáticos:
   - `npx vitest run lib/copilot-pilot app/api/copilotkit components/copilot-pilot`
     — bandera apagada por defecto, plan espaciado, ruta: 404 sin bandera,
     401 sin sesión, 429 sin cuota, 200 con sesión y cuota (runtime mockeado).
2. Manual (necesita claves reales y sesión real):
   - Enciende la bandera, entra con una cuenta, abre un cuaderno con hojas.
   - Pregunta «¿qué temas tiene este cuaderno?» — debe responder con la
     estructura real del cuaderno abierto.
   - Pide «hazme un plan de repasos» — debe ejecutar la acción y mostrar la
     tarjeta con las rondas 1/3/7/14 y el botón a `/repasos`.
   - Pide «resuélveme este examen» — debe negarse a hacerlo por ti y
     proponerte resolverlo juntos con preguntas.

## Limitaciones conocidas

- La llamada real al modelo no se verificó en CI/local sin una
  `OPENAI_API_KEY` válida ni sesión de Supabase: el cableado está cubierto
  por tests con el runtime mockeado, y la verificación en vivo es el paso
  manual de arriba.
- Cada POST al runtime consume 1 unidad de cuota; una conversación larga
  consume varias (mismo criterio por petición que otras rutas de la app).
- El plan generado es una **propuesta en pantalla**: no crea sesiones en
  `/repasos` ni persiste nada; el botón solo navega al flujo existente.
- Solo se monta en el lector de cuaderno (vista de estudiante con sesión).
  No aparece en la vista demo ni en cuadernos vacíos.
