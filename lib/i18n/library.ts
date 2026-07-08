import type { Locale } from "@/lib/i18n/nav";

export const libraryCopy: Record<
  Locale,
  {
    nextNotebookTitle: string;
    nextNotebookHint: string;
    nextNotebookEmpty: string;
    nextNotebookCta: string;
    examInDays: (days: number) => string;
    filterAll: string;
    filterEmpty: string;
    filterExam: string;
    filterUnlinked: string;
    viewNotebooks: string;
    viewClasses: string;
    classFeedTitle: string;
    classFeedHint: string;
    classFeedEmpty: string;
    classFeedMissing: string;
    classFeedUnlinked: string;
    classFeedReady: string;
    classFeedUploadCta: string;
    sortPriority: string;
    sortRecent: string;
    sortName: string;
    recentStripTitle: string;
    quickKit: string;
    linkedNotes: (linked: number, total: number) => string;
    openReader: string;
    quickUpload: string;
    quickQuiz: string;
    quickUploadModalTitle: string;
    quickUploadModalHint: string;
    quickUploadDropLabel: string;
    quickUploadDragHint: string;
    quickUploadDragActive: string;
    quickUploadFormats: string;
    quickUploadProgress: string;
    quickUploadSuccessTitle: string;
    quickUploadSuccessBody: (count: number, subject: string) => string;
    quickUploadClose: string;
    quickUploadLoginCta: string;
    quickUploadLinkedHint: string;
    searchNoResults: string;
    filterCount: (count: number) => string;
    calendarUploadBanner: string;
    subjectHubTitle: string;
    subjectHubHint: string;
    subjectHubKit: string;
    subjectHubClasses: string;
    subjectHubUnlinkedHint: string;
    subjectHubEmptyHint: string;
    openCalendarCta: string;
    cardNoClasses: string;
    cardUnlinkedOnly: (count: number) => string;
    cardMoreClasses: (count: number) => string;
    demoReaderTitle: string;
    demoReaderBody: string;
    readerDropOverlay: string;
  }
> = {
  es: {
    nextNotebookTitle: "Tu siguiente cuaderno",
    nextNotebookHint: "Priorizamos lo que más impacta en tu examen y en el quiz.",
    nextNotebookEmpty: "Crea un cuaderno por materia para empezar a subir apuntes.",
    nextNotebookCta: "Ir al cuaderno",
    examInDays: (days) => `Examen en ${days} día${days === 1 ? "" : "s"}`,
    filterAll: "Todos",
    filterEmpty: "Vacíos",
    filterExam: "Examen pronto",
    filterUnlinked: "Sin clase",
    viewNotebooks: "Cuadernos",
    viewClasses: "Por clase",
    classFeedTitle: "Todas tus clases",
    classFeedHint: "Material agrupado por sesión — incluye clases de hoy sin apuntes.",
    classFeedEmpty: "Aún no hay clases registradas. Sube apuntes vinculados al calendario o configura tu horario.",
    classFeedMissing: "Sin apuntes",
    classFeedUnlinked: "Sin vincular",
    classFeedReady: "Listo",
    classFeedUploadCta: "Subir ahora",
    sortPriority: "Prioridad",
    sortRecent: "Recientes",
    sortName: "A–Z",
    recentStripTitle: "Editados recientemente",
    quickKit: "Kit",
    linkedNotes: (linked, total) => `${linked}/${total} vinculados a clase`,
    openReader: "Abrir lector",
    quickUpload: "Subir",
    quickQuiz: "Quiz",
    quickUploadModalTitle: "Subir apuntes",
    quickUploadModalHint: "PDF, imagen o texto — sin salir de la biblioteca.",
    quickUploadDropLabel: "Arrastra archivos aquí o toca para elegir",
    quickUploadDragHint: "También puedes soltar PDFs e imágenes desde tu carpeta",
    quickUploadDragActive: "Suelta para subir",
    quickUploadFormats: "PDF · PNG · JPG · TXT · hasta 50 MB",
    quickUploadProgress: "Subiendo…",
    quickUploadSuccessTitle: "¡Listo!",
    quickUploadSuccessBody: (count, subject) =>
      `${count} archivo${count === 1 ? "" : "s"} en “${subject}”. Ya puedes abrir el lector o generar un kit.`,
    quickUploadClose: "Seguir en biblioteca",
    quickUploadLoginCta: "Iniciar sesión para subir",
    quickUploadLinkedHint: "Estos apuntes se vincularán a la clase del calendario.",
    searchNoResults: "Ningún cuaderno coincide con tu búsqueda. Prueba otra materia, tema o fecha.",
    filterCount: (count) => (count > 0 ? ` (${count})` : ""),
    calendarUploadBanner: "Sube apuntes vinculados a la clase del calendario.",
    subjectHubTitle: "Resumen del cuaderno",
    subjectHubHint: "Material por clase, quiz y kit desde un solo lugar.",
    subjectHubKit: "Generar kit",
    subjectHubClasses: "Clases recientes",
    subjectHubUnlinkedHint: "Tienes apuntes pero ninguno vinculado a una clase. Súbelos desde el calendario o edita etiquetas.",
    subjectHubEmptyHint: "Sube tu primer apunte para empezar a agrupar por clases.",
    openCalendarCta: "Calendario",
    cardNoClasses: "Sin apuntes todavía",
    cardUnlinkedOnly: (count) => `${count} apunte${count === 1 ? "" : "s"} sin vincular a clase`,
    cardMoreClasses: (count) => `+${count} clase${count === 1 ? "" : "s"} más`,
    demoReaderTitle: "Modo demo del lector",
    demoReaderBody: "Inicia sesión para subir PDFs e imágenes y vincularlos a tus clases.",
    readerDropOverlay: "Suelta para agregar al cuaderno",
  },
};
