/** The live Kampus project. Tests and seeds must never talk to it. */
const LIVE_HOST = "emetxjdeqnrxvjyaxfmk.supabase.co";

export function assertSeparateSupabaseUrl(url: string | undefined, label: string): string {
  const value = url?.trim() ?? "";
  if (!value) {
    throw new Error(`${label} is empty. Put the test project URL in .env.e2e.`);
  }
  let host = "";
  try {
    host = new URL(value).host;
  } catch {
    throw new Error(`${label} is not a URL.`);
  }
  if (host === LIVE_HOST || value.includes(LIVE_HOST)) {
    throw new Error(`${label} points at the live project. Use a separate Supabase project.`);
  }
  return value;
}
