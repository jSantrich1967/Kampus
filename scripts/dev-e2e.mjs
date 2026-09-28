/**
 * Starts Next on port 3010 using ONLY the test project in .env.e2e.
 * The app on port 3002 keeps using .env.local and is not changed.
 */
import { spawn } from "node:child_process";

import { assertSeparateSupabaseUrl, readEnvFile } from "./e2e-env.mjs";

const file = readEnvFile(".env.e2e");
const url = assertSeparateSupabaseUrl(file.E2E_SUPABASE_URL, "E2E_SUPABASE_URL");
const anon = file.E2E_SUPABASE_ANON_KEY?.trim();
if (!anon) throw new Error("E2E_SUPABASE_ANON_KEY is empty in .env.e2e.");

const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
  NEXT_PUBLIC_REQUIRE_AUTH: "true",
};
delete env.SUPABASE_SERVICE_ROLE_KEY;
delete env.E2E_SUPABASE_SERVICE_ROLE_KEY;

const child = spawn(
  "npx",
  ["next", "dev", "--webpack", "--hostname", "127.0.0.1", "--port", "3010"],
  { stdio: "inherit", env, shell: true },
);

child.on("exit", (code) => process.exit(code ?? 0));
