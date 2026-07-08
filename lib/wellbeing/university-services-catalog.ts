export type UniversityServiceLink = {
  id: string;
  label: string;
  description: string;
  href: string;
  external?: boolean;
};

type VenezuelaInstitution = {
  /** Nombre corto para mostrar en UI */
  label: string;
  /** Claves normalizadas (normalizeInstitutionKey) y alias cortos */
  aliases: string[];
  services: UniversityServiceLink[];
};

/** Recursos nacionales — se muestran siempre al final. */
const VENEZUELA_NATIONAL_SERVICES: UniversityServiceLink[] = [
  {
    id: "crisis-siempre-juntos",
    label: "Línea Siempre Juntos (Venezuela)",
    description: "Contención emocional y primeros auxilios psicológicos — gratuito.",
    href: "tel:08002586867",
  },
  {
    id: "fpv-lapsi",
    label: "LAPSI — Federación de Psicólogos de Venezuela",
    description: "Primeros auxilios psicológicos (vie–dom, 8:00 a.m.–8:00 p.m.).",
    href: "https://fpv.org.ve/servicios/",
    external: true,
  },
  {
    id: "settings-university",
    label: "Configurar mi universidad",
    description: "En Ajustes escribe el nombre exacto (ej. UCV, USB, UCAB) para ver más enlaces.",
    href: "/settings",
  },
];

/** Sin universidad reconocida — enlaces genéricos Venezuela. */
const GENERIC_VENEZUELA_SERVICES: UniversityServiceLink[] = [
  {
    id: "mppeu",
    label: "Ministerio del Poder Popular para la Educación Universitaria",
    description: "Marco oficial de educación universitaria en Venezuela.",
    href: "https://www.mpppst.gob.ve/",
    external: true,
  },
  {
    id: "orientation-generic",
    label: "Orientación universitaria",
    description: "Busca «bienestar estudiantil» o «desarrollo estudiantil» en la web de tu centro.",
    href: "/settings",
  },
  ...VENEZUELA_NATIONAL_SERVICES,
];

const VENEZUELA_INSTITUTIONS: Record<string, VenezuelaInstitution> = {
  ucv: {
    label: "Universidad Central de Venezuela (UCV)",
    aliases: ["ucv", "universidad-central-de-venezuela", "central-de-venezuela"],
    services: [
      {
        id: "ucv-obe",
        label: "UCV — Bienestar estudiantil (OBE)",
        description: "Organización de Bienestar Estudiantil y departamento de psicología.",
        href: "http://www.ucv.ve/organizacion/secretaria-general/acerca-de-secretaria-general-ucv/coordinacion-general-de-la-secretaria/organizacion-de-bienestar-estudiantil.html",
        external: true,
      },
      {
        id: "ucv-portal",
        label: "UCV — Portal institucional",
        description: "Trámites, calendario y servicios estudiantiles.",
        href: "https://www.ucv.ve/",
        external: true,
      },
    ],
  },
  usb: {
    label: "Universidad Simón Bolívar (USB)",
    aliases: ["usb", "universidad-simon-bolivar", "simon-bolivar"],
    services: [
      {
        id: "usb-portal",
        label: "USB — Portal institucional",
        description: "Información académica y servicios al estudiante.",
        href: "https://www.usb.ve/",
        external: true,
      },
      {
        id: "usb-desarrollo",
        label: "USB — Desarrollo estudiantil",
        description: "Acompañamiento integral y orientación (consulta en tu facultad).",
        href: "https://www.usb.ve/",
        external: true,
      },
    ],
  },
  ula: {
    label: "Universidad de Los Andes (ULA)",
    aliases: ["ula", "universidad-de-los-andes", "los-andes"],
    services: [
      {
        id: "ula-portal",
        label: "ULA — Portal institucional",
        description: "Servicios estudiantiles y bienestar en Mérida.",
        href: "https://www.ula.ve/",
        external: true,
      },
      {
        id: "ula-bienestar",
        label: "ULA — Bienestar estudiantil",
        description: "Orientación y apoyo psicológico — confirma horario en tu sede.",
        href: "https://www.ula.ve/",
        external: true,
      },
    ],
  },
  ucab: {
    label: "Universidad Católica Andrés Bello (UCAB)",
    aliases: ["ucab", "universidad-catolica-andres-bello", "catolica-andres-bello"],
    services: [
      {
        id: "ucab-cadh",
        label: "UCAB — Centro CADH",
        description: "Asesoramiento psicológico y desarrollo humano.",
        href: "https://www.ucab.edu.ve/informacion-institucional/unidades-de-apoyo/cadh/",
        external: true,
      },
      {
        id: "ucab-psicolinea",
        label: "UCAB — PsicoLínea / PsicoData",
        description: "Línea de ayuda psicológica de la Escuela de Psicología.",
        href: "https://psicologia.ucab.edu.ve/",
        external: true,
      },
      {
        id: "ucab-apoyo",
        label: "UCAB — Unidades de apoyo",
        description: "DIDES, apoyo educativo y programas de acompañamiento.",
        href: "https://www.ucab.edu.ve/informacion-institucional/unidades-de-apoyo/",
        external: true,
      },
    ],
  },
  unimet: {
    label: "Universidad Metropolitana (UNIMET)",
    aliases: ["unimet", "universidad-metropolitana", "metropolitana"],
    services: [
      {
        id: "unimet-portal",
        label: "UNIMET — Portal institucional",
        description: "Servicios al estudiante y vida universitaria.",
        href: "https://www.unimet.edu.ve/",
        external: true,
      },
    ],
  },
  luz: {
    label: "Universidad del Zulia (LUZ)",
    aliases: ["luz", "universidad-del-zulia", "del-zulia"],
    services: [
      {
        id: "luz-portal",
        label: "LUZ — Portal institucional",
        description: "Bienestar y trámites en Maracaibo.",
        href: "https://www.luz.edu.ve/",
        external: true,
      },
    ],
  },
  unexpo: {
    label: "Universidad Nacional Experimental Politécnica (UNEXPO)",
    aliases: ["unexpo", "universidad-nacional-experimental-politecnica", "politecnica-unexpo"],
    services: [
      {
        id: "unexpo-portal",
        label: "UNEXPO — Portal institucional",
        description: "Sedes regionales y servicios estudiantiles.",
        href: "https://www.unexpo.edu.ve/",
        external: true,
      },
    ],
  },
  ubv: {
    label: "Universidad Bolivariana de Venezuela (UBV)",
    aliases: ["ubv", "universidad-bolivariana-de-venezuela", "bolivariana"],
    services: [
      {
        id: "ubv-portal",
        label: "UBV — Portal institucional",
        description: "Misiónes educativas y apoyo al estudiante.",
        href: "https://www.ubv.edu.ve/",
        external: true,
      },
    ],
  },
  uc: {
    label: "Universidad de Carabobo",
    aliases: ["universidad-de-carabobo", "carabobo"],
    services: [
      {
        id: "uc-portal",
        label: "Universidad de Carabobo — Portal",
        description: "Servicios estudiantiles en Valencia.",
        href: "http://www.uc.edu.ve/",
        external: true,
      },
    ],
  },
};

function normalizeKey(university: string): string {
  return university
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/**
 * Maps profile.university text to a canonical Venezuela institution id (ucv, usb, …).
 * Used for pulse, services and institution panels.
 */
export function matchVenezuelaInstitutionKey(university: string): string | null {
  const key = normalizeKey(university);
  if (key.length < 2) return null;

  for (const [id, inst] of Object.entries(VENEZUELA_INSTITUTIONS)) {
    if (inst.aliases.some((alias) => key === alias || key.includes(alias))) {
      return id;
    }
  }

  return null;
}

export function getMatchedVenezuelaInstitution(university: string): { id: string; label: string } | null {
  const id = matchVenezuelaInstitutionKey(university);
  if (!id) return null;
  const inst = VENEZUELA_INSTITUTIONS[id];
  return inst ? { id, label: inst.label } : null;
}

export function resolveUniversityServices(university: string): UniversityServiceLink[] {
  const matchedId = matchVenezuelaInstitutionKey(university);
  if (!matchedId) return GENERIC_VENEZUELA_SERVICES.slice(0, 6);

  const inst = VENEZUELA_INSTITUTIONS[matchedId];
  if (!inst) return GENERIC_VENEZUELA_SERVICES.slice(0, 6);

  const ids = new Set(inst.services.map((s) => s.id));
  const merged = [...inst.services, ...VENEZUELA_NATIONAL_SERVICES.filter((s) => !ids.has(s.id))];
  return merged.slice(0, 6);
}

/** Canonical key for Supabase pulse/alerts — prefers Venezuela match, else normalized slug. */
export function institutionKeyFromUniversityName(university: string): string | null {
  const ve = matchVenezuelaInstitutionKey(university);
  if (ve) return ve;
  const key = normalizeKey(university);
  return key.length >= 2 ? key : null;
}
