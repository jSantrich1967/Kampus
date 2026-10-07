import { redirect } from "next/navigation";

/** /calendar no existe como ruta: el calendario vive en /exams/calendar. */
export default function CalendarAliasPage() {
  redirect("/exams/calendar");
}
