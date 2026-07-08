export function buildStudentWorkHref(workId: string): string {
  return `/collaborate/investigaciones?work=${encodeURIComponent(workId.trim())}`;
}
