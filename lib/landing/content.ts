export const HERO_STATS = [
  { value: "95%", label: "Precisión de", sub: "personalización" },
  { value: "30%", label: "Eficiencia de", sub: "aprendizaje" },
  { value: "100,000+", label: "Usuarios activos", sub: null },
] as const;

export const TESTIMONIALS = [
  {
    quote:
      "Kampus entendió en una semana cómo estudio mejor. Mis notas subieron y dejé de estudiar a ciegas la noche antes del examen.",
    name: "Laura Méndez",
    role: "Estudiante de bachillerato",
    rating: 5,
  },
  {
    quote:
      "El motor adaptativo ajusta el ritmo de cada alumno. Por fin tengo datos claros para intervenir antes de que alguien se quede atrás.",
    name: "Prof. Carlos Ruiz",
    role: "Docente de Matemáticas · Colegio",
    rating: 5,
  },
  {
    quote:
      "Integramos Kampus en nuestro campus virtual en pocas semanas. El equipo docente lo adoptó porque realmente ahorra tiempo.",
    name: "Ana Beltrán",
    role: "Directora · Academia online",
    rating: 5,
  },
] as const;

export const PRICING_PLANS = [
  {
    name: "Estudiante",
    price: "Gratis",
    period: "para siempre",
    description: "Ideal para empezar con rutas personalizadas y tutor IA básico.",
    features: ["Rutas adaptativas", "Tutor IA 24/7", "Seguimiento de progreso"],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$10,30",
    period: "/ mes",
    usdPrice: 10.3,
    description: "Para quienes quieren máximo rendimiento durante el curso.",
    features: ["Todo lo de Estudiante", "Modo Aprobar", "Analíticas avanzadas", "Soporte prioritario"],
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
  { id: "funciones", label: "Funciones", file: "sections/features-section.tsx" },
  { id: "testimonios", label: "Testimonios", file: "sections/testimonials-section.tsx" },
  { id: "precios", label: "Precios", file: "sections/pricing-section.tsx" },
  { id: "faq", label: "Preguntas frecuentes", file: "sections/faq-section.tsx" },
  { id: "contacto", label: "Contacto", file: "kampus-contact-footer.tsx" },
  { id: "register", label: "Registro", file: "auth/email-auth-panel.tsx", href: "/register" },
  { id: "login", label: "Login", file: "auth/email-auth-panel.tsx", href: "/login" },
] as const;

export const FAQS = [
  {
    question: "¿Kampus es gratis?",
    answer:
      "Sí. El plan Estudiante es gratis para siempre e incluye rutas de aprendizaje adaptativas, tutor IA básico y seguimiento de progreso. El plan Pro desbloquea el modo Aprobar, analíticas avanzadas y soporte prioritario.",
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
      "Solo crear tu cuenta gratis. En minutos tienes tu primera ruta de aprendizaje adaptativa lista, sin tarjeta ni compromiso.",
  },
] as const;

export type LandingSectionId = (typeof LANDING_SECTIONS)[number]["id"];
