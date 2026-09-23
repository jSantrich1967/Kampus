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
    teacherTitle: "Ya puedes usarlo",
    teacherBody:
      "El flujo de rúbrica, revisión y publicación ya funciona. Pruébalo con tus datos y publica cuando estés listo.",
    institutionTitle: "Vista previa",
    institutionBody:
      "Estás viendo una vista previa del panel institucional con datos de ejemplo.",
  },
};
