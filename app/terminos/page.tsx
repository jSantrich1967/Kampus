import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Términos de Servicio",
  description: "Condiciones de uso de la plataforma Kampus.",
};

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-white">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

export default function TerminosPage() {
  return (
    <LegalPageShell title="Términos de Servicio" updated="23 de septiembre de 2026">
      <section className="space-y-3">
        <H>1. El servicio</H>
        <P>
          Kampus es una plataforma educativa con inteligencia artificial que ofrece rutas de aprendizaje
          personalizadas, tutor IA, analíticas de progreso y herramientas para docentes e instituciones.
          Estos términos regulan tu uso de la plataforma web y de sus aplicaciones asociadas.
        </P>
      </section>

      <section className="space-y-3">
        <H>2. Tu cuenta</H>
        <P>
          Debes registrarte con datos veraces y mantener tu contraseña a salvo. Eres responsable de la
          actividad realizada desde tu cuenta. Si detectas un uso no autorizado, avísanos de inmediato.
          Podemos suspender cuentas que incumplan estos términos.
        </P>
      </section>

      <section className="space-y-3">
        <H>3. Planes y pagos</H>
        <P>
          El plan Estudiante es gratuito. El plan Pro es de pago mensual y se puede cancelar en cualquier
          momento desde los ajustes de tu cuenta; la cancelación aplica al final del periodo facturado.
          Los precios se muestran en dólares estadounidenses y su equivalente en bolívares a la tasa
          oficial del BCV indicada en la página de precios.
        </P>
      </section>

      <section className="space-y-3">
        <H>4. Uso aceptable</H>
        <P>
          Te comprometes a no usar la plataforma para fines ilícitos, a no intentar vulnerar su seguridad,
          a no extraer datos de forma masiva y a no subir contenido que infrinja derechos de terceros. El
          contenido generado por la IA debe revisarse antes de usarse con fines académicos formales.
        </P>
      </section>

      <section className="space-y-3">
        <H>5. Propiedad intelectual</H>
        <P>
          La plataforma, su diseño y su código son propiedad de Kampus EdTech. Tus apuntes, materiales
          subidos y datos de estudio siguen siendo tuyos; nos concedes únicamente la licencia necesaria
          para prestarte el servicio.
        </P>
      </section>

      <section className="space-y-3">
        <H>6. Disponibilidad y responsabilidad</H>
        <P>
          Trabajamos para mantener el servicio disponible, pero no garantizamos un funcionamiento
          ininterrumpido ni libre de errores. En la medida permitida por la ley, nuestra responsabilidad
          se limita al importe pagado por el servicio en los 12 meses anteriores.
        </P>
      </section>

      <section className="space-y-3">
        <H>7. Cambios en los términos</H>
        <P>
          Podemos actualizar estos términos para reflejar cambios en el servicio o en la normativa. Te
          avisaremos de los cambios relevantes y la fecha de última actualización que figura arriba indica
          la versión vigente.
        </P>
      </section>

      <section className="space-y-3">
        <H>8. Contacto</H>
        <P>
          Para dudas sobre estos términos, usa el formulario de contacto de la página principal o
          escríbenos al correo indicado allí.
        </P>
      </section>
    </LegalPageShell>
  );
}
