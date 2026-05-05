# Kampus (campus-ai)

App [Next.js](https://nextjs.org) (App Router). Desarrollo local:

```bash
npm install
npm run dev
```

Abre [http://localhost:3002](http://localhost:3002) (puerto definido en `package.json`).

```bash
npm run lint       # ESLint
npm run typecheck  # TypeScript (sin emitir JS)
npm run build      # build de producción (`.next` por defecto)
```

**Windows (opcional):** si el antivirus o rutas con espacios bloquean `.next`, copia a `.env.local` las variables `KAMPUS_*` descritas en [`.env.example`](./.env.example) (por ejemplo `KAMPUS_NEXT_DIST_DIR=.next-kampus`).

## CI / CD (GitHub Actions)

- **CI** (`.github/workflows/ci.yml`): en cada push/PR a `main`, ejecuta lint, typecheck y `next build` en **Ubuntu y Windows**.
- **CD** (`.github/workflows/deploy-vercel.yml`): despliegue **manual** con Vercel CLI (`workflow_dispatch`). Úsalo solo si quieres desplegar desde Actions; si ya conectaste el repo en Vercel, el despliegue automático por Git suele bastar (evita duplicar deploys).

## Monitorización (Sentry + Vercel)

- **Sentry — errores:** `NEXT_PUBLIC_SENTRY_DSN` y (opcional) source maps con `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`. Ver [`.env.example`](./.env.example).
- **Sentry — rendimiento:** rutas OpenAI envían transacciones `api.openai.*` y spans `openai.http.*` (latencia total y llamada a OpenAI). Ajusta muestreo con `SENTRY_TRACES_SAMPLE_RATE` / `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`.
- **Sentry — alertas (en la web de Sentry):** Alerts → Create alert → por ejemplo *New issue*, *Issue frequency* (spike), *Regression*, o umbrales en *Performance*. Conecta email/Slack en **Settings → Integrations**.
- **Vercel Speed Insights:** el proyecto incluye `<SpeedInsights />` en el layout. Activa **Speed Insights** en el dashboard del proyecto Vercel (plan según tu cuenta) para Core Web Vitals y métricas reales de usuario.

## Despliegue en Vercel

1. **Importar el repositorio** en [vercel.com/new](https://vercel.com/new) y conectar la cuenta de GitHub.

2. **Directorio raíz (Root Directory)**  
   - Si en GitHub el repo contiene **solo** esta carpeta (`campus-ai` como raíz del repo): déjalo **vacío** o `.`.  
   - Si el repo es el **workspace** padre y dentro está la carpeta `campus-ai`: en Vercel elige **Root Directory** → `campus-ai`.

3. **Framework**: Vercel detecta **Next.js** solo. **Build Command** `npm run build`, **Install Command** `npm install` (o `npm ci` si usas lockfile de forma estricta en CI; Vercel por defecto instala bien).

4. **Variables de entorno** (Project → Settings → Environment Variables). Copia nombres desde [`.env.example`](./.env.example) y rellena al menos:

   | Variable | Entorno | Notas |
   |----------|---------|--------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | URL del proyecto Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | clave anónima (pública) |
   | `OPENAI_API_KEY` | Production, Preview | si usas tutor / transcripción / visión (rutas de servidor) |
   | `OPENAI_MODEL`, etc. | opcional | valores por defecto en `.env.example` |

   Para **producción** con login obligatorio, **no** pongas `NEXT_PUBLIC_REQUIRE_AUTH=false` (solo demos / previews).

5. **Supabase → Authentication → URL configuration**

   - **Site URL**: `https://tu-dominio.vercel.app` (o tu dominio custom).
   - **Redirect URLs**: añade  
     `https://tu-dominio.vercel.app/auth/callback`  
     y, si quieres previews de Vercel, algo como  
     `https://*.vercel.app/auth/callback`  
     (o cada URL de preview que uses).

6. **Después del primer deploy**: en GitHub, el workflow **CI** debe seguir en verde; en el navegador prueba login y callback.

Documentación oficial: [Next.js en Vercel](https://vercel.com/docs/frameworks/nextjs).

**Supabase** (proyecto, env, URLs y SQL de `profiles`): ver [`docs/supabase.md`](./docs/supabase.md).
