import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertSeparateSupabaseUrl, readEnvFile } from "./e2e-env.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = readEnvFile(path.join(root, ".env.e2e"));

function required(name) {
  const value = (env[name] ?? process.env[name] ?? "").trim();
  if (!value) return "";
  return value;
}

const url = required("E2E_SUPABASE_URL");
const anon = required("E2E_SUPABASE_ANON_KEY");
const studentEmail = required("E2E_STUDENT_EMAIL");
const studentPassword = required("E2E_STUDENT_PASSWORD");
const otherEmail = required("E2E_OTHER_EMAIL");
const otherPassword = required("E2E_OTHER_PASSWORD");

if (!url || !anon || !studentEmail || !studentPassword || !otherEmail || !otherPassword) {
  console.log("Skipped certificate issuer check: test accounts are not configured in .env.e2e.");
  process.exit(0);
}

assertSeparateSupabaseUrl(url, "E2E_SUPABASE_URL");

function client() {
  return createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signIn(email, password) {
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(`Could not sign in a test account: ${error?.message ?? "no user"}`);
  }
  return { supabase, userId: data.user.id };
}

const code = `KMP-CHK${Date.now().toString(36).toUpperCase()}`;

const student = await signIn(studentEmail, studentPassword);
const other = await signIn(otherEmail, otherPassword);

const spoof = await student.supabase.from("certificates").insert({
  code: `${code}S`,
  owner_id: student.userId,
  issuer_id: other.userId,
  owner_name: "Test student",
  title: "Spoof check",
  detail: "",
});

if (!spoof.error) {
  await student.supabase.from("certificates").delete().eq("code", `${code}S`);
  throw new Error("Test account was able to store another account as issuer. Apply the certificate issuer migration on the test project.");
}

const declared = await student.supabase
  .from("certificates")
  .insert({
    code: `${code}D`,
    owner_id: student.userId,
    issuer_id: null,
    owner_name: "Test student",
    title: "Declared check",
    detail: "",
  })
  .select("id")
  .single();

if (declared.error) {
  throw new Error(`Test account could not declare its own achievement: ${declared.error.message}`);
}

const accredited = await other.supabase
  .from("certificates")
  .insert({
    code: `${code}A`,
    owner_id: null,
    issuer_id: other.userId,
    owner_name: "Test student",
    title: "Accredited check",
    detail: "",
  })
  .select("id")
  .single();

if (accredited.error) {
  await student.supabase.from("certificates").delete().eq("id", declared.data.id);
  throw new Error(`Second test account could not issue as itself: ${accredited.error.message}`);
}

await student.supabase.from("certificates").delete().eq("id", declared.data.id);
await other.supabase.from("certificates").delete().eq("id", accredited.data.id);

console.log("Certificate issuer check passed on the test project.");
