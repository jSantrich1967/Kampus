# Piloto Presenton dentro de Kampus (rama `piloto/presenton`)

Generar una presentación (PPTX editable o PDF) desde el cuaderno del propio
estudiante/profesor, dentro del módulo **Mis exposiciones**
(`/collaborate/exposiciones`). Apagado por defecto con feature flag.

## Arquitectura

```
Navegador (Exposiciones)
  → POST /api/presenton/generate        (ruta de Kampus: sesión + cuota)
    → Presenton (servicio externo autoalojado, Docker)
      POST /api/v1/ppt/presentation/generate
  ← { presentationId, downloadUrl, editUrl }
```

- La clave API de Presenton vive **solo en el servidor** de Kampus; el cliente
  nunca la ve ni llama a Presenton directamente.
- La ruta exige sesión de Supabase (401 sin sesión), consume cuota diaria con la
  clave propia `presenton_generate` (RPC `consume_api_quota`, vía
  `consumeDailyUserQuota`) y **reembolsa** la cuota si el cuaderno no existe, si
  no tiene texto extraído o si Presenton falla (patrón de las rutas hermanas).
- El cuaderno y sus documentos se cargan filtrando por `user_id` del usuario
  autenticado: nadie puede generar desde el cuaderno de otro.
- Sin `PRESENTON_API_URL` o con la flag apagada, la ruta responde
  **503 `PRESENTON_NOT_CONFIGURED`** y la UI muestra un aviso amistoso.

## API de Presenton: verificado vs. supuesto

Verificado leyendo el README y el código FastAPI del repo oficial
`github.com/presenton/presenton` (oct-2026):

- Endpoint: `POST /api/v1/ppt/presentation/generate`, JSON.
- Autenticación: clave `sk-presenton-...` como `Authorization: Bearer ...`,
  creada en **Admin → API keys**. NO es basic auth (por eso la env es
  `PRESENTON_API_KEY`, no usuario/contraseña).
- Payload: `content` (requerido; `""` cuando se usa `slides_markdown`),
  `slides_markdown` (un Markdown por diapositiva; su longitud define el número
  de diapositivas; máx. 50; cada ítem se trunca a ~100 palabras por defecto),
  `instructions`, `tone`, `verbosity`, `web_search`, `n_slides`, `language`
  (default `"English"`), `template` (default `"general"`),
  `include_title_slide`, `include_table_of_contents`, `files`, `export_as`
  (`"pptx"` | `"pdf"`).
- Respuesta: `{ presentation_id, path, edit_path }`. `path` es la ruta del
  archivo exportado en el host de Presenton (bajo `/app_data/...`) y
  `edit_path` la del editor (`/presentation?id=...`). Kampus construye las URL
  absolutas con la base configurada.
- Existe además `POST /api/v1/ppt/presentation/{id}/export` para re-exportar
  una presentación ya generada en el otro formato (no usado en este piloto).

Supuesto / por verificar en la prueba en vivo:

- Que el `path` devuelto se pueda descargar con un GET simple desde el
  navegador del usuario contra el host de Presenton (las rutas `/app_data/...`
  tienen control de autorización por usuario en Presenton; si el GET anónimo
  falla, el siguiente paso es un proxy de descarga en la propia ruta de Kampus
  que reenvíe el archivo con la clave API).
- El tiempo real de generación (la ruta declara `maxDuration = 300`).

## Variables de entorno

```bash
# Cliente (activa la UI del piloto)
NEXT_PUBLIC_PRESENTON_PILOT_ENABLED=true
# Servidor (nunca NEXT_PUBLIC_)
PRESENTON_API_URL=http://localhost:5001
PRESENTON_API_KEY=<redacted>   # Presenton → Admin → API keys
API_DAILY_LIMIT_PRESENTON_GENERATE=5   # opcional, default 5
```

## Probar en vivo (local)

1. Levantar Presenton con Docker (comando del README oficial; elige el LLM que
   quieras — con Ollama local no pagas API):

   ```bash
   docker run -it --name presenton -p 5001:80 \
     -e LLM="ollama" -e OLLAMA_MODEL="llama3.2:3b" \
     -e IMAGE_PROVIDER="pexels" -e PEXELS_API_KEY="******" \
     -v "./app_data:/app_data" \
     ghcr.io/presenton/presenton:latest
   ```

2. Abrir `http://localhost:5001`, crear la cuenta admin y generar la clave en
   **Admin → API keys**.
3. En Kampus (esta rama): definir las variables de arriba en `.env.local`,
   arrancar con `npm run dev`, entrar con una cuenta que tenga un cuaderno con
   documentos ya extraídos e ir a **Colaborar → Mis exposiciones → Generar
   presentación desde mi cuaderno**.

## ⚠️ Advertencia de producción (léela antes de soñar con esto en kampus-swart)

Presenton es un **servicio aparte de larga duración** (FastAPI + Next +
Chromium para exportar). **No puede correr en Vercel**, donde vive Kampus hoy.
Para producción haría falta hospedarlo en otro sitio (un VPS, o la PC de Joreg
para el piloto) y apuntar `PRESENTON_API_URL` a ese host. Esa decisión de
hospedaje y su costo **no** forman parte de esta rama: el piloto solo deja el
lado Kampus listo y apagado por defecto.

## Archivos del piloto

- `lib/presenton/flag.ts` — flag pública on/off.
- `lib/presenton/config.ts` — config de servidor + clave de cuota.
- `lib/presenton/payload.ts` — constructor del payload documentado (+ tests).
- `lib/presenton/client.ts` — cliente HTTP de la API de Presenton (+ tests).
- `app/api/presenton/generate/route.ts` — ruta con sesión, cuota y reembolso (+ tests).
- `components/collaborate/presenton-generator.tsx` — tarjeta en Exposiciones (+ tests).
- `components/collaborate/exposiciones-entry.tsx` — montaje en el módulo (solo con flag).
