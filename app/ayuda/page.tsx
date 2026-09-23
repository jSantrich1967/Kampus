import type { Metadata } from "next";
import Link from "next/link";

import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Centro de Ayuda",
  description: "Respuestas a las preguntas frecuentes sobre Kampus.",
};

const FAQS = [
  {
    q: "¿Cómo empiezo a usar Kampus?",
    a: "Crea una cuenta gratuita desde la página principal, completa el onboarding con tus materias y objetivos, y la plataforma generará tu primera ruta de aprendizaje personalizada.",
  },
  {
    q: "¿La demo necesita registro?",
    a: "No. Pulsa «Ver demo» en la página principal y entrarás a una versión de prueba con datos de ejemplo, sin crear cuenta.",
  },
  {
    q: "¿Cuánto cuesta el plan Pro?",
    a: "El plan Pro cuesta $10,30 al mes (Bs. 8.788,93 a la tasa oficial del BCV del 23/09/2026). El plan Estudiante es gratis para siempre y el plan Institución se cotiza a medida.",
  },
  {
    q: "Olvidé mi contraseña, ¿qué hago?",
    a: "En la página de Entrar pulsa «¿Olvidaste tu contraseña?», escribe tu correo y recibirás un enlace para crear una nueva clave.",
  },
  {
    q: "¿Cómo cancelo mi suscripción Pro?",
    a: "Desde los ajustes de tu cuenta puedes cancelar en cualquier momento. Seguirás con Pro hasta el final del periodo ya pagado.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Sí. Usamos cifrado en tránsito, controles de acceso y nunca vendemos tus datos personales. Tienes más detalle en nuestra Política de Privacidad.",
  },
  {
    q: "Soy de una institución, ¿cómo pido una demo?",
    a: "Completa el formulario de contacto al final de la página principal o pulsa «Contactar ventas» en el plan Institución. Respondemos en 24–48 horas laborables.",
  },
  {
    q: "¿Cómo elimino mi cuenta?",
    a: "Escríbenos desde el formulario de contacto indicando el correo de tu cuenta y la eliminaremos junto con tus datos de estudio.",
  },
] as const;

export default function AyudaPage() {
  return (
    <LegalPageShell title="Centro de Ayuda" updated="23 de septiembre de 2026">
      <div className="space-y-6">
        {FAQS.map((faq) => (
          <section key={faq.q} className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-bold text-white">{faq.q}</h2>
            <p className="text-gray-300">{faq.a}</p>
          </section>
        ))}
      </div>

      <p className="pt-4 text-center">
        ¿No encuentras tu respuesta?{" "}
        <Link href="/#contacto" className="font-medium text-purple-400 hover:underline">
          Contáctanos
        </Link>
        .
      </p>
    </LegalPageShell>
  );
}
