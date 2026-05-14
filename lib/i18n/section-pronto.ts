import type { Locale } from "@/lib/i18n/nav";

export const sectionProntoCopy: Record<
  Locale,
  {
    teacherTitle: string;
    teacherBody: string;
    institutionTitle: string;
    institutionBody: string;
  }
> = {
  es: {
    teacherTitle: "Pronto: falta poco para activarse",
    teacherBody:
      "Puedes recorrer el flujo en vista previa. Estamos cerrando integración con datos reales (entregas, rúbricas y publicación).",
    institutionTitle: "Pronto: falta poco para activarse",
    institutionBody:
      "El panel institucional se está endureciendo para producción. Falta poco para cohortes y métricas enlazadas a tus fuentes.",
  },
};
