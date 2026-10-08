import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: "Cómo recoge, usa y protege Kampus tus datos personales.",
};

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-white">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

export default function PrivacidadPage() {
  return (
    <LegalPageShell title="Política de Privacidad" updated="8 de octubre de 2026">
      <section className="space-y-3">
        <H>1. Responsable de tus datos</H>
        <P>
          Kampus es el responsable del tratamiento de los datos personales que recoge esta plataforma.
          Para cualquier tema de privacidad puedes escribirnos a{" "}
          <a className="text-indigo-300 underline" href="mailto:ventas@kampus.app">
            ventas@kampus.app
          </a>{" "}
          o desde el formulario de contacto de la página principal.
        </P>
      </section>

      <section className="space-y-3">
        <H>2. Qué datos recogemos</H>
        <P>
          Recogemos solo lo necesario para que estudies con Kampus: datos de cuenta (nombre y correo
          electrónico; tu contraseña la guarda cifrada nuestro proveedor de autenticación y nunca la
          vemos), tu perfil de estudio (carrera, materias, horarios, exámenes y trabajos que registras),
          tu actividad dentro de la app (cuadernos, tarjetas de estudio, mensajes en la Comunidad, duelos
          y conversaciones con el Tutor IA), y tu racha y progreso. Si activas los avisos, también
          guardamos tu número de WhatsApp. Si pagas el plan Pro, guardamos la referencia del pago que
          nos reportas (nunca tus datos bancarios completos: el pago lo haces en tu propio banco, Zelle
          o Binance).
        </P>
      </section>

      <section className="space-y-3">
        <H>3. Para qué los usamos</H>
        <P>
          Usamos tus datos para prestarte el servicio: organizar tu estudio, generar tus planes y
          diagnósticos con IA, mostrarte tu progreso, operar la Comunidad y los duelos, y enviarte los
          avisos que tú actives. Nunca vendemos tus datos personales ni los usamos para publicidad de
          terceros.
        </P>
      </section>

      <section className="space-y-3">
        <H>4. Inteligencia artificial</H>
        <P>
          El Tutor IA, el Modo examen y otras ayudas de estudio funcionan con modelos de OpenAI. Cuando
          los usas, el texto de tus preguntas y de la materia que consultas se envía a ese proveedor
          para generar la respuesta. No compartas en esos campos datos sensibles que no quieras que un
          proveedor de IA procese (documentos de identidad, datos de salud o financieros).
        </P>
      </section>

      <section className="space-y-3">
        <H>5. Avisos por WhatsApp y correo</H>
        <P>
          Los avisos por WhatsApp son opcionales: solo se envían si registras tu número y activas el
          interruptor en Ajustes, y puedes desactivarlos en cualquier momento desde esa misma pantalla.
          Son avisos de tu propia actividad (exámenes, exposiciones, entregas, clases virtuales y
          suspendidas, y duelos), no publicidad. Por correo solo enviamos mensajes de tu cuenta
          (verificación, recuperación de contraseña y avisos importantes del servicio).
        </P>
      </section>

      <section className="space-y-3">
        <H>6. Con quién compartimos datos</H>
        <P>
          Compartimos datos únicamente con los proveedores que operan la plataforma, cada uno solo con
          lo que necesita: Supabase (base de datos y autenticación), Vercel (alojamiento de la web),
          Twilio y WhatsApp (envío de los avisos que activaste) y OpenAI (funciones de IA descritas
          arriba). Todos procesan los datos por encargo nuestro y con medidas de seguridad. Si tu
          cuenta pertenece a una institución educativa con convenio, esa institución puede ver tu
          progreso académico dentro de Kampus según ese convenio.
        </P>
      </section>

      <section className="space-y-3">
        <H>7. Cuánto tiempo los conservamos</H>
        <P>
          Conservamos tus datos mientras tu cuenta esté activa. Si eliminas tu cuenta, borramos tu
          perfil y tus datos de estudio de los sistemas activos; pueden quedar copias residuales en
          respaldos por un máximo de 30 días. Los registros mínimos de pagos y de avisos enviados se
          conservan hasta 24 meses por control operativo y obligaciones contables.
        </P>
      </section>

      <section className="space-y-3">
        <H>8. Tus derechos</H>
        <P>
          Puedes pedir en cualquier momento el acceso, la corrección o la eliminación de tus datos
          escribiéndonos al correo de contacto. Respondemos las solicitudes en un máximo de 15 días
          hábiles. Buena parte de tu información la puedes editar tú mismo desde Ajustes.
        </P>
      </section>

      <section className="space-y-3">
        <H>9. Seguridad</H>
        <P>
          Protegemos tus datos con cifrado en tránsito (HTTPS), controles de acceso por cuenta (cada
          estudiante solo ve lo suyo) y copias de seguridad. Ningún sistema es perfecto: si detectamos
          un incidente que afecte tus datos, te avisaremos por correo.
        </P>
      </section>

      <section className="space-y-3">
        <H>10. Cookies y almacenamiento local</H>
        <P>
          Usamos las cookies técnicas de sesión necesarias para mantenerte conectado y una cookie de
          demo cuando pruebas la plataforma sin cuenta. También guardamos preferencias en tu navegador
          (por ejemplo, el menú y tus cajas locales de estudio). Puedes borrarlas desde tu navegador
          cuando quieras; sin las de sesión no podrás mantener tu cuenta abierta.
        </P>
      </section>

      <section className="space-y-3">
        <H>11. Menores de edad</H>
        <P>
          Kampus lo usan también estudiantes escolares. Si eres menor de edad, usa la plataforma con el
          conocimiento de tu representante. No recogemos datos de menores con fines publicitarios.
        </P>
      </section>
    </LegalPageShell>
  );
}
