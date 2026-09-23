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
    <LegalPageShell title="Política de Privacidad" updated="23 de septiembre de 2026">
      <section className="space-y-3">
        <H>1. Qué datos recogemos</H>
        <P>
          Cuando creas una cuenta recogemos tu nombre, correo electrónico y los datos de tu perfil de
          estudio (materias, objetivos, horarios). También registramos información de uso: páginas
          visitadas, interacciones con el tutor IA y métricas de progreso necesarias para personalizar tu
          aprendizaje.
        </P>
      </section>

      <section className="space-y-3">
        <H>2. Para qué los usamos</H>
        <P>
          Usamos tus datos para prestarte el servicio (rutas adaptativas, tutor IA, analíticas), mejorar la
          plataforma, comunicarnos contigo sobre tu cuenta y, solo si lo aceptas, enviarte novedades del
          producto. Nunca vendemos tus datos personales a terceros.
        </P>
      </section>

      <section className="space-y-3">
        <H>3. Compartir datos</H>
        <P>
          Compartimos datos únicamente con proveedores que nos ayudan a operar el servicio
          (alojamiento, autenticación y analítica), bajo acuerdos que les obligan a protegerlos. Si una
          institución educativa gestiona tu cuenta, podrá ver tu progreso académico según su convenio.
        </P>
      </section>

      <section className="space-y-3">
        <H>4. Tus derechos</H>
        <P>
          Puedes solicitar en cualquier momento el acceso, rectificación o eliminación de tus datos
          escribiendo a nuestro correo de contacto. Eliminar tu cuenta borra tu perfil y tus datos de
          estudio de nuestros sistemas activos.
        </P>
      </section>

      <section className="space-y-3">
        <H>5. Seguridad y conservación</H>
        <P>
          Protegemos tus datos con cifrado en tránsito, controles de acceso y copias de seguridad.
          Conservamos tu información mientras tu cuenta esté activa y durante el tiempo exigido por la
          normativa aplicable.
        </P>
      </section>

      <section className="space-y-3">
        <H>6. Cookies</H>
        <P>
          Usamos cookies técnicas necesarias para la sesión y la seguridad, y cookies de analítica para
          entender el uso de la plataforma. Puedes gestionarlas desde tu navegador; desactivar las
          técnicas puede impedir el inicio de sesión.
        </P>
      </section>

      <section className="space-y-3">
        <H>7. Contacto</H>
        <P>
          Para cualquier duda sobre esta política o sobre tus datos, escríbenos a través del formulario de
          contacto de la página principal y te responderemos a la brevedad.
        </P>
      </section>
    </LegalPageShell>
  );
}
