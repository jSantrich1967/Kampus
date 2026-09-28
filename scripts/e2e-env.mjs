import fs from "node:fs";

const LIVE_HOST = "emetxjdeqnrxvjyaxfmk.supabase.co";

export function assertSeparateSupabaseUrl(url, label) {
  const value = (url ?? "").trim();
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

export function readEnvFile(path) {
  if (!fs.existsSync(path)) return {};
  const out = {};
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}
