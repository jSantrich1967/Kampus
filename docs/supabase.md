# Supabase para Kampus

Guía para crear el proyecto, conectar la app y crear la tabla de perfiles que usa el código (`profiles` + RLS).

## 1. Crear el proyecto

1. Entra en [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Elige región cercana a tus usuarios, contraseña de la base (la guardas tú) y crea el proyecto.
3. Espera a que termine el aprovisionamiento.

## 2. Claves y variables de entorno

1. En el proyecto: **Settings** (engranaje) → **API**.
2. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Pégalas en **`.env.local`** (local) y en **Vercel → Environment Variables** (producción/preview).  
   **Nunca** pongas la clave **service_role** en el front ni en variables `NEXT_PUBLIC_*`; solo en backend seguro si algún día la necesitas.

## 3. Autenticación (email y Google)

### Email

1. **Authentication** → **Providers** → **Email**: actívalo si quieres registro/login con correo y contraseña (es lo que usa el panel de la app).
2. Opcional: **Authentication** → **Email Templates** para personalizar el correo de confirmación.

### Google (Gmail)

La app muestra **«Continuar con Google»** en `/login` y `/register` (`signInWithOAuth` → `/auth/callback`).

1. En [Google Cloud Console](https://console.cloud.google.com/):
   - Crea un proyecto (o usa uno existente).
   - **APIs & Services** → **OAuth consent screen**: configura pantalla de consentimiento (tipo *External* para pruebas).
   - **Credentials** → **Create credentials** → **OAuth client ID** → tipo **Web application**.
   - **Authorized JavaScript origins**: `http://localhost:3002` y tu URL de producción (ej. `https://tu-app.vercel.app`).
   - **Authorized redirect URIs**: la URL que muestra Supabase al activar Google (suele ser `https://<tu-proyecto>.supabase.co/auth/v1/callback`).
2. En Supabase: **Authentication** → **Providers** → **Google** → activar y pegar **Client ID** y **Client Secret** de Google.
3. Confirma que en **URL Configuration** (sección 4) están `http://localhost:3002/auth/callback` y la de producción.

Tras guardar, prueba en local: **Continuar con Google** debe redirigir a Google y volver a la app con sesión iniciada.

## 4. URLs del sitio y redirecciones (muy importante)

Sin esto, el login con OAuth o el flujo por **código** (`/auth/callback`) fallará en producción o en local.

1. **Authentication** → **URL Configuration**.
2. **Site URL**:
   - Local: `http://localhost:3002` (el `dev` de este repo usa el puerto **3002**).
   - Producción: `https://tu-app.vercel.app` (o tu dominio).
3. **Redirect URLs** — añade **todas** las que vayas a usar, por ejemplo:
   - `http://localhost:3002/auth/callback`
   - `http://localhost:3002/**` (si Supabase lo permite en tu plan; si no, lista URLs concretas)
   - `https://tu-app.vercel.app/auth/callback`
   - Para previews de Vercel: `https://*.vercel.app/auth/callback` (si tu proyecto de Supabase lo admite) o cada URL de preview.

La ruta de la app es **`/auth/callback`** (ver `app/auth/callback/route.ts`).

## 5. Base de datos: tabla `profiles`

La app guarda el perfil del usuario (JSON) en **`public.profiles`** con políticas RLS (cada usuario solo ve/edita su fila).

1. En Supabase: **SQL Editor** → **New query**.
2. Abre en tu editor el archivo del repo  
   [`supabase/migrations/20260423120000_profiles.sql`](../supabase/migrations/20260423120000_profiles.sql)  
   y **copia todo el contenido** al editor SQL de Supabase.
3. Ejecuta (**Run**). No debe dar error; si aparece algo sobre `execute function` vs `execute procedure`, depende de la versión de Postgres del proyecto; en la mayoría de proyectos nuevos de Supabase el script actual es válido.

Qué hace el script (resumen):

- Crea la tabla **`profiles`** (`id` = usuario de `auth.users`, `body` = JSON del perfil).
- Trigger para crear fila al registrarse un usuario.
- **RLS** para que solo el usuario autenticado acceda a su fila.

## 6. Comprobar que todo va bien

1. Local: `.env.local` con las dos variables `NEXT_PUBLIC_*`, `npm run dev`, abre `http://localhost:3002`.
2. Registro / login; al entrar, en **Table Editor** → `profiles` deberías ver filas al crear usuarios (y el `body` se irá rellenando desde la app).

## 7. Auth en la app (middleware)

Si existen URL y anon key, el **middleware** exige sesión en rutas privadas salvo que desactives el requisito con `NEXT_PUBLIC_REQUIRE_AUTH=false` (solo **local** o **Vercel Preview**).

En **Vercel Production** esa variable en `false` **no está permitida**: el build falla y, aunque existiera, el runtime **ignora** el bypass. Detalle en `next.config.ts`, `lib/supabase/env.ts` y `.env.example`.

Con protección activa, solo son públicas **`/login`**, **`/register`** y **`/auth/*`** (el resto, incluido `/` y `/onboarding`, exige sesión).

## Referencia en código

| Pieza | Archivo |
|--------|---------|
| Variables públicas y bypass de auth | `lib/supabase/env.ts` |
| Cliente en el navegador | `lib/supabase/client.ts` |
| Callback OAuth / PKCE | `app/auth/callback/route.ts` |
| Middleware de sesión | `middleware.ts` |
| Sincronización del perfil | `lib/supabase/profile-sync.ts`, `components/kampus/kampus-provider.tsx` |

Si algo falla, anota el **mensaje exacto** (navegador o consola de Vercel) y el paso (login, callback, guardar perfil).
