export const INVESTORS = ["Calendly", "Descript", "Gumroad", "Notion", "Figma"] as const;

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
    role: "Estudiante de Ingeniería · UNAM",
    rating: 5,
  },
  {
    quote:
      "El motor adaptativo ajusta el ritmo de cada alumno. Por fin tengo datos claros para intervenir antes de que alguien se quede atrás.",
    name: "Prof. Carlos Ruiz",
    role: "Docente de Matemáticas · UPC",
    rating: 5,
  },
  {
    quote:
      "Integramos Kampus en nuestro campus virtual en pocas semanas. El equipo docente lo adoptó porque realmente ahorra tiempo.",
    name: "Ana Beltrán",
    role: "Directora de Innovación · Instituto Cervantes Digital",
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
    price: "€9",
    period: "/ mes",
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
  { id: "inversores", label: "Inversores", file: "sections/investors-section.tsx" },
  { id: "funciones", label: "Funciones", file: "sections/features-section.tsx" },
  { id: "testimonios", label: "Testimonios", file: "sections/testimonials-section.tsx" },
  { id: "precios", label: "Precios", file: "sections/pricing-section.tsx" },
  { id: "contacto", label: "Contacto", file: "kampus-contact-footer.tsx" },
  { id: "register", label: "Registro", file: "auth/email-auth-panel.tsx", href: "/register" },
  { id: "login", label: "Login", file: "auth/email-auth-panel.tsx", href: "/login" },
] as const;

export type LandingSectionId = (typeof LANDING_SECTIONS)[number]["id"];
