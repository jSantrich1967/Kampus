/**
 * Constructor del payload para `POST /api/v1/ppt/presentation/generate` de
 * Presenton. Campos verificados contra el README oficial de
 * github.com/presenton/presenton (sección "Generate Presentation via API"):
 *
 * - `content` (string, requerido): contenido principal. Con `slides_markdown`
 *   sin prompt adicional se pasa "".
 * - `slides_markdown` (string[] | null): un Markdown por diapositiva; su longitud
 *   determina el número de diapositivas. Máx. 50 ítems; cada ítem se trunca a
 *   ~100 palabras por defecto (MAX_OUTLINE_WORDS), por eso recortamos a 95.
 * - `n_slides`, `language` (default "English"), `template` (default "general"),
 *   `tone`, `verbosity`, `web_search`, `include_title_slide`,
 *   `include_table_of_contents`, `files`, `export_as` ("pptx" | "pdf").
 */

export type PresentonExportFormat = "pptx" | "pdf";

export type NotebookDocumentForPresentation = {
  topic?: string | null;
  lessonPoint?: string | null;
  filename: string;
  /** Extracto del texto extraído del documento (ya recortado por quien llama). */
  excerpt: string;
};

export type NotebookForPresentation = {
  subject: string;
  documents: NotebookDocumentForPresentation[];
};

export type BuildPresentonPayloadOptions = {
  nSlides: number;
  exportAs: PresentonExportFormat;
  language?: string;
};

/** Payload exacto que se envía a Presenton (JSON). */
export type PresentonGeneratePayload = {
  content: string;
  slides_markdown: string[] | null;
  instructions: string;
  tone: "educational";
  verbosity: "standard";
  web_search: false;
  n_slides: number;
  language: string;
  template: "general";
  include_table_of_contents: boolean;
  include_title_slide: boolean;
  export_as: PresentonExportFormat;
};

const MAX_SLIDES_MARKDOWN = 50;
/** Presenton trunca cada ítem a 100 palabras por defecto; dejamos margen. */
const MAX_WORDS_PER_SLIDE = 95;

function clipWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return words.slice(0, maxWords).join(" ");
}

function clipChars(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n\n...(recortado)`;
}

const INSTRUCTIONS =
  "Usa únicamente el contenido del cuaderno del estudiante que viene en las diapositivas: " +
  "organízalo y resume sin inventar datos, cifras ni fuentes que no estén en ese material. " +
  "Mantén los títulos de cada tema tal como los escribió el estudiante.";

/**
 * Construye el payload de generación desde el cuaderno del propio usuario.
 * - Si hay documentos con tema o texto, usa `slides_markdown` (un tema por
 *   diapositiva, hasta `nSlides`) y `content` vacío, como indica la doc.
 * - Si no hay documentos utilizables, cae a modo `content` con la materia.
 */
export function buildPresentonPayload(
  notebook: NotebookForPresentation,
  options: BuildPresentonPayloadOptions,
): PresentonGeneratePayload {
  const language = options.language?.trim() || "Spanish";
  const usable = notebook.documents.filter(
    (d) => (d.topic?.trim() || d.lessonPoint?.trim() || d.excerpt.trim()).length > 0,
  );

  if (usable.length > 0) {
    const slides = usable.slice(0, Math.min(options.nSlides, MAX_SLIDES_MARKDOWN)).map((doc) => {
      const heading = doc.topic?.trim() || doc.lessonPoint?.trim() || doc.filename;
      const body = clipWords(doc.excerpt, MAX_WORDS_PER_SLIDE);
      return body ? `# ${heading}\n\n${body}` : `# ${heading}`;
    });
    return {
      content: "",
      slides_markdown: slides,
      instructions: INSTRUCTIONS,
      tone: "educational",
      verbosity: "standard",
      web_search: false,
      n_slides: slides.length,
      language,
      template: "general",
      include_table_of_contents: false,
      include_title_slide: true,
      export_as: options.exportAs,
    };
  }

  return {
    content: clipChars(
      `Presentación educativa sobre la materia «${notebook.subject}». ` +
        "El estudiante aún no tiene temas con texto en este cuaderno; estructura una " +
        "introducción general a la materia sin inventar datos específicos.",
      2000,
    ),
    slides_markdown: null,
    instructions: INSTRUCTIONS,
    tone: "educational",
    verbosity: "standard",
    web_search: false,
    n_slides: options.nSlides,
    language,
    template: "general",
    include_table_of_contents: false,
    include_title_slide: true,
    export_as: options.exportAs,
  };
}
