export const TRUST_ITEMS = [
  { label: "Sin tarjeta", sub: "La cuenta gratis no pide pago" },
  { label: "En tu navegador", sub: "Sin instalar nada, en tu teléfono o PC" },
  { label: "Cancela cuando quieras", sub: "Sin permanencia ni letra pequeña" },
] as const;

export const TESTIMONIALS = [
  {
    quote:
      "Pasé de estudiar 3 horas sin rumbo a sesiones de 45 minutos con plan. La misión diaria me dice exactamente por dónde empezar y aprobé Cálculo con 17.",
    name: "María F.",
    role: "Estudiante universitaria · Lima",
    rating: 5,
  },
  {
    quote:
      "Genero el examen de práctica en minutos y veo quién va quedando atrás antes del parcial. Me ahorra las noches armando pruebas en Word.",
    name: "Carlos R.",
    role: "Docente de Matemáticas · Colegio San Ignacio",
    rating: 5,
  },
  {
    quote:
      "El reporte para la familia nos quitó las discusiones de '¿estudiaste?'. Ahora vemos el progreso real cada semana, sin tener que preguntar.",
    name: "Ana B.",
    role: "Madre de dos estudiantes · Bogotá",
    rating: 5,
  },
] as const;

export const PRICING_PLANS = [
  {
    name: "Estudiante",
    price: "Gratis",
    period: "para siempre",
    description: "Todo lo que necesitas para estudiar con plan, sin pagar nada.",
    features: [
      "Tu misión diaria de estudio",
      "Plan adaptativo según tus exámenes",
      "Tarjetas y resúmenes con IA (uso diario limitado)",
      "Seguimiento de tu progreso",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$10,30",
    period: "/ mes",
    usdPrice: 10.3,
    description: "Para rendir al máximo cuando se acerca el examen.",
    features: [
      "Todo lo del plan Estudiante, sin límites",
      "Generador de exámenes de práctica ilimitados",
      "Modo Aprobar: repaso intensivo antes del examen",
      "Reportes para tu familia",
    ],
    highlighted: true,
  },
  {
    name: "Institución",
    price: "A medida",
    period: "",
    description: "Licencias para facultades, academias y centros formativos.",
    features: ["Panel docente", "Integración LMS", "SSO y administración", "Formación del equipo"],
    highlighted: false,
  },
] as const;

export const LANDING_SECTIONS = [
  { id: "nav", label: "Navegación", file: "kampus-lumina-nav.tsx" },
  { id: "hero", label: "Héroe / Inicio", file: "sections/hero-section.tsx" },
  { id: "como-funciona", label: "Cómo funciona", file: "sections/how-it-works-section.tsx" },
  { id: "funciones", label: "Funciones", file: "sections/features-section.tsx" },
  { id: "testimonios", label: "Testimonios", file: "sections/testimonials-section.tsx" },
  { id: "precios", label: "Precios", file: "sections/pricing-section.tsx" },
  { id: "faq", label: "Preguntas frecuentes", file: "sections/faq-section.tsx" },
  { id: "cta-final", label: "CTA final", file: "sections/final-cta-section.tsx" },
  { id: "contacto", label: "Contacto", file: "kampus-contact-footer.tsx" },
  { id: "register", label: "Registro", file: "auth/email-auth-panel.tsx", href: "/register" },
  { id: "login", label: "Login", file: "auth/email-auth-panel.tsx", href: "/login" },
] as const;

export const FAQS = [
  {
    question: "¿Kampus es gratis?",
    answer:
      "Sí. El plan Estudiante es gratis para siempre e incluye tu misión diaria de estudio, plan adaptativo según tus exámenes, tarjetas y resúmenes con IA, y seguimiento de tu progreso. El plan Pro quita los límites, suma exámenes de práctica ilimitados, el Modo Aprobar y reportes para tu familia.",
  },
  {
    question: "¿Cómo se calcula el precio en bolívares?",
    answer:
      "El precio en bolívares se calcula automáticamente con la tasa oficial del dólar publicada por el BCV y se actualiza todos los días, así que siempre pagas el equivalente justo en el momento de tu suscripción.",
  },
  {
    question: "¿Puedo usar Kampus en mi colegio o universidad?",
    answer:
      "Sí. El plan Institución está pensado para facultades, academias y centros formativos: incluye panel docente, integración con tu LMS, inicio de sesión institucional (SSO) y formación para tu equipo. Escríbenos desde la sección de contacto y te armamos una propuesta a medida.",
  },
  {
    question: "¿Necesito instalar algo?",
    answer:
      "No. Kampus funciona directamente en tu navegador, en computadora o teléfono. Si quieres, puedes instalarla como aplicación desde el navegador para acceder más rápido.",
  },
  {
    question: "¿Kampus reemplaza a mis profesores?",
    answer:
      "No, los potencia. Kampus es una herramienta de apoyo: personaliza la práctica, organiza el estudio y le da al docente datos claros del progreso de cada estudiante para intervenir a tiempo.",
  },
  {
    question: "¿Qué necesito para empezar?",
    answer:
      "Solo crear tu cuenta gratis. En minutos tienes tu primera misión de estudio lista, sin tarjeta ni compromiso.",
  },
  {
    question: "¿Qué pasa con mis datos si cancelo el plan Pro?",
    answer:
      "Nada se borra: vuelves al plan Estudiante gratis y conservas tu cuenta, tu progreso y tus materiales. Puedes volver a Pro cuando quieras.",
  },
] as const;

export type LandingSectionId = (typeof LANDING_SECTIONS)[number]["id"];
