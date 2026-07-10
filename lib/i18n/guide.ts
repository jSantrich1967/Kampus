import type { Locale } from "@/lib/i18n/nav";
import type { UserRole } from "@/lib/schemas/profile";

export type GuideSectionId =
  | "today"
  | "library"
  | "flashcards"
  | "exams"
  | "agendaCalendar"
  | "risk"
  | "passMode"
  | "community"
  | "rooms"
  | "myPresentations"
  | "myResearch"
  | "wellbeing"
  | "diary"
  | "psychologist"
  | "teaching"
  | "institution"
  | "settings";

export type GuideSectionCopy = {
  title: string;
  href: string;
  roles: UserRole[];
  premium?: boolean;
  objective: string;
  howItWorks: string;
  benefits: string[];
  tip: string;
};

export const guideCopy: Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    description: string;
    introTitle: string;
    introBody: string;
    labels: {
      objective: string;
      howItWorks: string;
      benefits: string;
      tip: string;
      openSection: string;
      premium: string;
    };
    groupFilterAll: string;
    sections: Record<GuideSectionId, GuideSectionCopy>;
  }
> = {
  es: {
    eyebrow: "Ayuda",
    title: "Guía de Kampus",
    description:
      "Qué hace cada parte de la app, para qué sirve y cómo te ayuda a estudiar mejor — sin tecnicismos.",
    introTitle: "¿Cómo usar esta guía?",
    introBody:
      "Cada tarjeta describe una sección del menú: su objetivo, cómo funciona paso a paso, las bondades para tu aprendizaje y un consejo práctico. Pulsa «Ir a la sección» cuando quieras probarla.",
    labels: {
      objective: "Objetivo",
      howItWorks: "Cómo funciona",
      benefits: "Bondades para el estudiante",
      tip: "Consejo",
      openSection: "Ir a la sección",
      premium: "Incluye funciones Premium",
    },
    groupFilterAll: "Todas",
    sections: {
      today: {
        title: "Hoy",
        href: "/today",
        roles: ["student", "teacher", "institution", "learner"],
        objective: "Organizar tu día académico en un solo vistazo.",
        howItWorks:
          "Muestra tu plan del día, clases, recordatorios de material, racha de estudio y accesos rápidos al siguiente paso (cuaderno, quiz o repaso). Se actualiza según tu perfil y calendario.",
        benefits: [
          "Evita decidir cada mañana «por dónde empiezo».",
          "Conecta clases reales con acciones concretas (subir apuntes, repasar).",
          "Mantiene el hábito con rachas y bloques cortos.",
        ],
        tip: "Revisa Hoy al empezar la jornada; marca hecho lo que completes para ver progreso.",
      },
      library: {
        title: "Mis cuadernos",
        href: "/study/library",
        roles: ["student", "teacher", "learner"],
        objective: "Guardar y estudiar todo el material de tus materias en un solo lugar.",
        howItWorks:
          "Subes PDFs, fotos o notas por materia. La app extrae el texto, lo organiza por clase o etiqueta y puedes hojear cada archivo con efecto de página (clic en bordes, flechas o deslizar). También puedes generar un kit de estudio con resumen, ideas clave, quiz y tarjetas.",
        benefits: [
          "Tus apuntes dejan de estar dispersos en el móvil o en carpetas sueltas.",
          "La IA trabaja sobre tu contenido real, no sobre temarios genéricos.",
          "Puedes generar kit de una sola hoja o de todo el cuaderno.",
        ],
        tip: "Cuanto más claro sea el PDF o la foto, mejor será el kit. Regenera el kit si activas Premium para ver la versión completa.",
      },
      flashcards: {
        title: "Tarjetas",
        href: "/study/flashcards",
        roles: ["student", "teacher", "institution", "learner"],
        objective: "Repasar con recuperación activa (recordar sin mirar apuntes).",
        howItWorks:
          "Crea mazos por materia o usa tarjetas sugeridas desde tu plan. Volteas cartas frente/reverso, priorizando temas débiles del perfil.",
        benefits: [
          "La recuperación activa fija mejor la memoria que solo releer.",
          "Sesiones cortas encajan entre clases.",
          "Se enlaza con Modo aprobar y el kit del cuaderno.",
        ],
        tip: "Haz 10–15 minutos después de generar un kit nuevo, usando las tarjetas que propone la IA.",
      },
      exams: {
        title: "Exámenes",
        href: "/exams",
        roles: ["student", "teacher", "learner"],
        objective: "Centralizar fechas, entregas y evaluaciones por materia.",
        howItWorks:
          "Listas parciales, quizzes y trabajos con fechas. Desde aquí ves qué materia está más cargada y saltas a repaso o material del cuaderno.",
        benefits: [
          "Anticipas semanas críticas antes de que sea tarde.",
          "Ves qué exámenes tienen poco material en el cuaderno.",
          "Priorizas estudio según proximidad de la fecha.",
        ],
        tip: "Vincula apuntes de cada examen en Mis cuadernos para que el quiz use contenido de esa evaluación.",
      },
      agendaCalendar: {
        title: "Mi calendario",
        href: "/exams/calendar",
        roles: ["student", "teacher", "learner"],
        objective: "Ver clases, entregas y exámenes en una agenda visual.",
        howItWorks:
          "Combina horario de clases, trabajos pendientes y fechas de examen. Puedes generar kits de estudio ligados a eventos del calendario.",
        benefits: [
          "Relacionas cada clase con su material y fecha límite.",
          "Planificas la semana sin cambiar de app.",
          "Detectas huecos libres para estudiar.",
        ],
        tip: "Después de una clase, sube el apunte el mismo día: el calendario y el quiz lo agradecerán.",
      },
      risk: {
        title: "Radar académico",
        href: "/risk",
        roles: ["student", "teacher", "institution", "learner"],
        objective: "Detectar riesgo de atraso antes del examen.",
        howItWorks:
          "Cruza exámenes próximos, material faltante, clases perdidas y hábitos. Muestra alertas por materia con acciones sugeridas (subir apuntes, kit, tarjetas).",
        benefits: [
          "Señales tempranas en lugar de sustos la víspera del parcial.",
          "Enfoque en materias con más riesgo, no en todo a la vez.",
          "Acciones claras, no solo un «número rojo».",
        ],
        tip: "Si una materia sale en rojo por falta de material, sube al menos un PDF antes de pedir un kit.",
      },
      passMode: {
        title: "Modo aprobar",
        href: "/pass-mode",
        roles: ["student"],
        premium: true,
        objective: "Un plan diario para aprobar: foco, repaso y práctica bajo presión.",
        howItWorks:
          "Arma una secuencia de bloques (tarjetas, foco en tema débil, quiz cronometrado). El quiz de presión usa apuntes del cuaderno. Premium desbloquea el simulador oral de profesor.",
        benefits: [
          "Convierte «tengo que estudiar» en pasos de 15–25 minutos.",
          "El quiz simula presión de examen con preguntas de tus clases.",
          "El simulador Premium entrena explicar en voz alta como en un oral.",
        ],
        tip: "Activa Premium en Ajustes (demo) y completa los tres bloques del plan al menos dos días seguidos antes del parcial.",
      },
      community: {
        title: "Comunidad",
        href: "/community",
        roles: ["student", "teacher", "learner"],
        objective: "Compartir dudas y recursos con otros de tus materias.",
        howItWorks:
          "Canales por asignatura: publicas preguntas, respondes a compañeros, marcas respuestas útiles y puedes compartir kits de estudio.",
        benefits: [
          "Aprendes viendo cómo otros explican el mismo tema.",
          "Reduce la sensación de ir solo en la carrera.",
          "Descubres materiales que no tenías en el cuaderno.",
        ],
        tip: "Antes de preguntar, busca en el canal: muchas dudas ya están resueltas.",
      },
      rooms: {
        title: "Aula virtual",
        href: "/collaborate/aula-virtual",
        roles: ["student", "teacher", "institution", "learner"],
        objective: "Clases en vivo, salas de estudio y sesiones con compañeros o docentes.",
        howItWorks:
          "Entras a salas programadas, compartes pantalla o notas y puedes transcribir la sesión para guardarla como apunte.",
        benefits: [
          "Repaso grupal sin salir de Kampus.",
          "La transcripción alimenta tu cuaderno después de clase.",
          "Útil para grupos de estudio antes de exámenes.",
        ],
        tip: "Tras una sesión importante, revisa la transcripción y guárdala en el cuaderno de la materia.",
      },
      myPresentations: {
        title: "Mis exposiciones",
        href: "/collaborate/exposiciones",
        roles: ["student", "teacher", "institution", "learner"],
        objective: "Preparar y practicar presentaciones orales con ayuda de la IA.",
        howItWorks:
          "Defines tema, fecha y guion; el tutor sugiere estructura, preguntas del jurado y puntos débiles. Puedes ensayar con cronómetro.",
        benefits: [
          "Menos miedo al día de la exposición.",
          "Anticipas preguntas difíciles del profesor o tribunal.",
          "Mejoras claridad y tiempo de habla.",
        ],
        tip: "Graba un ensayo en voz alta y compáralo con las preguntas probables que sugiere la app.",
      },
      myResearch: {
        title: "Mis investigaciones",
        href: "/collaborate/investigaciones",
        roles: ["student", "teacher", "institution", "learner"],
        objective: "Organizar trabajos de investigación, entregas y hitos.",
        howItWorks:
          "Registras título, fechas y estado del trabajo. Ves pendientes urgentes y enlaces al material en cuadernos.",
        benefits: [
          "No pierdes de vista entregas parciales de un TFG o monografía.",
          "Priorizas lo urgente junto a exámenes normales.",
          "Todo el contexto académico en un solo sistema.",
        ],
        tip: "Pon fecha de entrega realista una semana antes del límite oficial para tener margen de revisión.",
      },
      wellbeing: {
        title: "Inicio bienestar",
        href: "/wellbeing",
        roles: ["student", "teacher", "learner"],
        objective: "Cuidar tu equilibrio emocional mientras estudias.",
        howItWorks:
          "Recursos de bienestar, enlaces a diario y chat de apoyo. No sustituye atención profesional urgente, pero ayuda en el día a día.",
        benefits: [
          "Reconoce que rendir académico depende también de cómo te sientes.",
          "Rutinas breves sin abandonar el estudio.",
          "Acceso rápido al diario y al espacio de conversación guiada.",
        ],
        tip: "Si el estrés sube antes de exámenes, usa el diario 3 minutos antes de abrir el cuaderno.",
      },
      diary: {
        title: "Mi Diario",
        href: "/wellbeing/diary",
        roles: ["student", "teacher", "learner"],
        objective: "Registrar ánimo, energía e intención del día de forma privada.",
        howItWorks:
          "Check-in diario con preguntas guía. Opcional: exportar resumen para orientación (si tú lo autorizas).",
        benefits: [
          "Detectas patrones (días malos antes de parciales, sueño, etc.).",
          "Baja la carga mental al poner palabras a cómo te sientes.",
          "Complementa el estudio con autoconocimiento.",
        ],
        tip: "Haz el check-in a la misma hora cada día; la racha ayuda a ver tendencias.",
      },
      psychologist: {
        title: "Psicólogo (chat)",
        href: "/wellbeing/psychologist",
        roles: ["student", "teacher", "learner"],
        objective: "Conversación guiada de apoyo emocional con IA (no es terapia clínica).",
        howItWorks:
          "Chat con límites diarios y tono de primeros auxilios psicológicos: escucha, orientación y derivación a recursos humanos si hace falta.",
        benefits: [
          "Desahogo inmediato cuando no puedes hablar con nadie.",
          "Sugerencias de autocuidado entre sesiones de estudio.",
          "Puente hacia ayuda profesional si la situación lo requiere.",
        ],
        tip: "En crisis grave o pensamientos de hacerte daño, contacta servicios de emergencia o tu universidad; el chat no reemplaza eso.",
      },
      teaching: {
        title: "Copiloto docente",
        href: "/teaching",
        roles: ["teacher"],
        objective: "Apoyar al profesor con feedback, cohorte y materiales.",
        howItWorks:
          "Vista docente: seguimiento de alumnos, sugerencias de refuerzo y herramientas alineadas con lo que ven los estudiantes en Kampus.",
        benefits: [
          "Coherencia entre lo que enseñas y lo que repasan en la app.",
          "Detección temprana de alumnos con poco material o riesgo.",
          "Menos fricción al recomendar recursos digitales.",
        ],
        tip: "Indica a tu clase que suban apuntes al cuaderno de la materia para que el radar y el quiz sean útiles.",
      },
      institution: {
        title: "Panel institucional",
        href: "/institution",
        roles: ["institution"],
        objective: "Visión agregada de adopción y bienestar en la institución.",
        howItWorks:
          "Métricas de uso, cohortes y señales agregadas (sin exponer datos personales de forma irresponsable). Pensado para coordinación académica.",
        benefits: [
          "Decisiones con datos sobre herramientas de estudio.",
          "Alineación entre campus digital y aula física.",
          "Seguimiento de iniciativas de bienestar estudiantil.",
        ],
        tip: "Combina este panel con encuestas presenciales: los números cuentan una parte de la historia.",
      },
      settings: {
        title: "Ajustes",
        href: "/settings",
        roles: ["student", "teacher", "institution", "learner"],
        objective: "Personalizar plan, rol, materias y cuenta.",
        howItWorks:
          "Cambias idioma, materias del perfil, plan Gratis/Premium (demo), rol de prueba y reinicio de onboarding. Con sesión, sincroniza perfil en la nube.",
        benefits: [
          "Adaptas Kampus a tu semestre real.",
          "Modo prueba premium para explorar kits completos.",
          "Control de privacidad y cierre de sesión.",
        ],
        tip: "Usa «Activar modo prueba premium» si quieres ver todas las funciones antes de decidir un plan real.",
      },
    },
  },
};
