/**
 * Creates two confirmed users on a SEPARATE Supabase project.
 * Refuses the live project. Does not print keys.
 *
 * 1. Create an empty project in the Supabase dashboard.
 * 2. Apply this repo's supabase/migrations there.
 * 3. Fill .env.e2e (see .env.example). Never put those keys in .env.local.
 * 4. node scripts/seed-e2e-users.mjs
 */
import { assertSeparateSupabaseUrl, readEnvFile } from "./e2e-env.mjs";

const env = { ...readEnvFile(".env.e2e"), ...process.env };
const url = assertSeparateSupabaseUrl(env.E2E_SUPABASE_URL, "E2E_SUPABASE_URL").replace(/\/$/, "");
const serviceKey = env.E2E_SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!serviceKey) {
  throw new Error("E2E_SUPABASE_SERVICE_ROLE_KEY is empty. It belongs only in .env.e2e.");
}

const accounts = [
  {
    email: env.E2E_STUDENT_EMAIL?.trim() || "e2e-student@example.com",
    password: env.E2E_STUDENT_PASSWORD?.trim(),
    profile: finishedProfile("Estudiante Prueba", "student"),
  },
  {
    email: env.E2E_OTHER_EMAIL?.trim() || "e2e-other@example.com",
    password: env.E2E_OTHER_PASSWORD?.trim(),
    profile: finishedProfile("Otra Cuenta", "student"),
  },
];

for (const account of accounts) {
  if (!account.password || account.password.length < 8) {
    throw new Error(`Set a password of at least 8 characters for ${account.email} in .env.e2e.`);
  }
}

function finishedProfile(displayName, role) {
  return {
    onboardingFinished: true,
    plan: "free",
    role,
    displayName,
    university: "Universidad de Prueba",
    major: "Prueba",
    semester: "1",
    subjects: ["Matemática"],
    upcomingExams: [],
    weakTopics: [],
    missedClassesApprox: 0,
    weeklyAvailabilityHours: 10,
    preferredLanguage: "es",
    interestedInCommunity: false,
    learningGoals: "Probar el inicio de sesión",
    streakDays: 0,
  };
}

async function createConfirmedUser(email, password) {
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.ok && body.id) return body.id;

  const already = res.status === 422 || String(body.msg || body.message || "").toLowerCase().includes("already");
  if (!already) {
    throw new Error(`Could not create ${email} (${res.status}). Apply migrations on the test project first.`);
  }

  const list = await fetch(`${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
  });
  const listed = await list.json().catch(() => ({}));
  const found = Array.isArray(listed.users) ? listed.users.find((user) => user.email === email) : null;
  if (!found?.id) throw new Error(`User ${email} already exists but could not be loaded.`);
  return found.id;
}

async function saveProfile(userId, profile) {
  const res = await fetch(`${url}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ id: userId, body: profile }),
  });
  if (!res.ok) {
    throw new Error(`Could not save the profile (${res.status}). The test project needs the profiles table.`);
  }
}

for (const account of accounts) {
  const id = await createConfirmedUser(account.email, account.password);
  await saveProfile(id, account.profile);
  console.log(`Ready: ${account.email}`);
}
