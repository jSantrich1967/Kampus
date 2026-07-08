export type HumanSupportResource = {
  id: string;
  title: string;
  description: string;
  href?: string;
  phone?: string;
  urgent?: boolean;
};

/** Número único de emergencias en Venezuela. */
export const VENEZUELA_EMERGENCY_PHONE = "171";

export function phoneTelHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

export const HUMAN_SUPPORT_RESOURCES: HumanSupportResource[] = [
  {
    id: "emergency",
    title: "Emergencia inmediata",
    description: "Si estás en peligro o con ideas de hacerte daño, llama ahora.",
    phone: VENEZUELA_EMERGENCY_PHONE,
    urgent: true,
  },
  {
    id: "siempre-juntos",
    title: "Línea Siempre Juntos",
    description: "Escucha y contención emocional gratuita — Venezuela.",
    phone: "0800-2586867",
  },
  {
    id: "lapsi-fpv",
    title: "LAPSI — Federación de Psicólogos",
    description: "Primeros auxilios psicológicos (vie–dom, 8:00 a.m.–8:00 p.m.) — Venezuela.",
    phone: "0424-2907338",
  },
  {
    id: "campus",
    title: "Servicios de tu universidad",
    description: "En Ajustes indica tu universidad (UCV, USB, UCAB…) para ver enlaces de bienestar.",
    href: "/settings",
  },
  {
    id: "professional",
    title: "Terapeuta acreditado",
    description: "El chat IA ayuda a ordenar ideas; un profesional humano puede acompañarte en profundidad.",
    href: "/wellbeing/psychologist",
  },
];
