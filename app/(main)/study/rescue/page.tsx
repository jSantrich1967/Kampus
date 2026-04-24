import { redirect } from "next/navigation";

/** @deprecated Use `/study/library/rescue` (rescate vive dentro de Mis cuadernos). */
export default async function StudyRescueRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) v.forEach((x) => q.append(k, x));
    else q.set(k, v);
  }
  const suffix = q.toString();
  redirect(suffix ? `/study/library/rescue?${suffix}` : "/study/library/rescue");
}
