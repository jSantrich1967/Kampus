import { subjectToPathSegment } from "@/lib/notebooks/paths";

export type SubjectCoverTheme = {
  id: string;
  /** Short allegorical line for the cover. */
  allegory: string;
  /** Accent color for borders and highlights (CSS color). */
  accent: string;
  /** Optional texture keyword for CSS class. */
  texture: "grid" | "dots" | "waves" | "rings";
};

const DEFAULT_THEME: SubjectCoverTheme = {
  id: "general",
  allegory: "Donde tus ideas toman forma página a página.",
  accent: "hsl(258 65% 62%)",
  texture: "dots",
};

export function getSubjectCoverTheme(subjectName: string): SubjectCoverTheme {
  const s = subjectToPathSegment(subjectName?.trim() || "General");

  if (/(econometr|estad|probab|data|analit|metric|regres)/.test(s)) {
    return {
      id: "data",
      allegory: "Los datos cuentan historias — tú aprendes a escucharlas.",
      accent: "hsl(198 72% 52%)",
      texture: "grid",
    };
  }
  if (/(econom|macro|micro|finanz|contab|admin|marketing|negoc|empresa|banca|mercado|bolsa|inversion|cafe|comercio)/.test(s)) {
    return {
      id: "economy",
      allegory: "Recursos, decisiones y valor en cada línea de tus apuntes.",
      accent: "hsl(42 88% 54%)",
      texture: "waves",
    };
  }
  if (/(calculo|algebra|geometr|matemat|trigonom|vector|ecuacion|integral|deriv)/.test(s)) {
    return {
      id: "math",
      allegory: "El cambio y el patrón detrás de cada demostración.",
      accent: "hsl(278 70% 58%)",
      texture: "grid",
    };
  }
  if (/(base-de-dato|database|sql|postgres|mysql)/.test(s)) {
    return {
      id: "database",
      allegory: "Ordenar el conocimiento para encontrarlo al instante.",
      accent: "hsl(168 55% 46%)",
      texture: "grid",
    };
  }
  if (/(program|codigo|software|comput|sistem|algorit|ia|machine|ml|ai|web|frontend|backend|node|react|inform)/.test(s)) {
    return {
      id: "programming",
      allegory: "Lógica que construye mundos dentro de la pantalla.",
      accent: "hsl(152 60% 44%)",
      texture: "dots",
    };
  }
  if (/(quimic|fisic|biolog|ciencia|laboratorio)/.test(s)) {
    return {
      id: "science",
      allegory: "Preguntar, observar y explicar el mundo con evidencia.",
      accent: "hsl(205 80% 52%)",
      texture: "rings",
    };
  }
  if (/(farmac|medic|salud|anatom|fisiolog|microbio)/.test(s)) {
    return {
      id: "health",
      allegory: "El cuerpo y la vida como texto por descifrar.",
      accent: "hsl(350 72% 58%)",
      texture: "waves",
    };
  }
  if (/(derecho|jurid|legal|constit|civil|penal|laboral)/.test(s)) {
    return {
      id: "law",
      allegory: "Normas que ordenan la convivencia y la justicia.",
      accent: "hsl(38 55% 50%)",
      texture: "rings",
    };
  }
  if (/(histori|geograf|cultura|internac|politic|sociolog)/.test(s)) {
    return {
      id: "humanities",
      allegory: "Memoria colectiva y contexto para entender el presente.",
      accent: "hsl(22 70% 52%)",
      texture: "waves",
    };
  }
  if (/(psicol|mente|neuro|cognit)/.test(s)) {
    return {
      id: "psychology",
      allegory: "La mente como mapa de conductas, emociones y aprendizaje.",
      accent: "hsl(292 58% 58%)",
      texture: "dots",
    };
  }

  return DEFAULT_THEME;
}
