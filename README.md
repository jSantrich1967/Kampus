# Kampus (campus-ai)

App [Next.js](https://nextjs.org) (App Router). Desarrollo local:

```bash
npm install
npm run dev
```

Abre [http://localhost:3002](http://localhost:3002) (puerto definido en `package.json`).

```bash
npm run lint   # ESLint
npm run build  # build de producción (usa `.next`; en dev se puede usar `.next-kampus`)
```

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
