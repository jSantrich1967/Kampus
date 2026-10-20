// Isolated regression for billing authority, quotas, and duel access.
// Uses a temporary PGlite database. It does not connect to production.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const repo = resolve(import.meta.dirname, "..");
const pglitePkg = resolve(repo, "../security-proof/package.json");
const require = createRequire(pglitePkg);
const { PGlite } = require("@electric-sql/pglite");

const uid = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const admin = "33333333-3333-4333-8333-333333333333";
const sql = (name) => readFileSync(resolve(repo, "supabase/migrations", name), "utf8");

const db = new PGlite();
const failures = [];

function check(name, ok, detail) {
  if (!ok) {
    failures.push({ name, detail });
    console.log("DETAIL", JSON.stringify(detail));
  }
  console.log(`${ok ? "ok" : "FAIL"} ${name}`);
}

await db.exec(`
  CREATE ROLE authenticated;
  CREATE ROLE anon;
  CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users(id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  GRANT USAGE ON SCHEMA public, auth TO authenticated;
  GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
`);
await db.exec(sql("20260423120000_profiles.sql"));
await db.exec(sql("20260505170000_api_usage_quotas.sql"));
await db.exec(sql("20261016184500_quota_dedup.sql"));
await db.exec(sql("20260928160000_duels.sql"));
await db.exec(sql("20261008120000_pro_subscriptions.sql"));
await db.exec(`
  CREATE TABLE IF NOT EXISTS public.app_admins (
    user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE
  );
`);
await db.exec(sql("20261020120000_billing_quota_duel_authority.sql"));
await db.exec(sql("20261013180000_spaced_repetition.sql"));
await db.exec(sql("20261020190000_reaudit_residues.sql"));

await db.exec(`
  INSERT INTO auth.users VALUES ('${uid}'), ('${other}'), ('${admin}');
  INSERT INTO public.app_admins (user_id) VALUES ('${admin}');
  UPDATE public.profiles SET body = '{"plan":"free","displayName":"Synthetic"}';
`);

await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${uid}', false);`);
await db.query(`UPDATE public.profiles SET body = jsonb_set(body, '{plan}', '"premium"') WHERE id = $1`, [uid]);
const own = await db.query(`SELECT body->>'plan' AS plan FROM public.profiles WHERE id = $1`, [uid]);
check("authenticated user cannot keep a self-assigned premium plan", own.rows[0].plan !== "premium", own.rows);

let foreignDenied = false;
try {
  await db.query(
    `INSERT INTO public.profiles (id, body) VALUES ($1, '{"plan":"premium"}') ON CONFLICT (id) DO UPDATE SET body = '{"plan":"premium"}'`,
    [other],
  );
} catch {
  foreignDenied = true;
}
check("authenticated user cannot rewrite another profile", foreignDenied, null);

const first = await db.query(`SELECT * FROM public.consume_api_quota('audit_quota', 1)`);
const second = await db.query(`SELECT * FROM public.consume_api_quota('audit_quota', 1)`);
const used = await db.query(`SELECT used_count FROM public.api_usage_quotas WHERE quota_key = 'audit_quota'`);
check(
  "second call at the limit is a single denial and does not increment",
  first.rows.length === 1 &&
    first.rows[0].allowed === true &&
    second.rows.length === 1 &&
    second.rows[0].allowed === false &&
    used.rows[0].used_count === 1,
  { first: first.rows, second: second.rows, used: used.rows },
);

const once = await db.query(`SELECT * FROM public.consume_api_quota('idem_quota', 1, 'req-a')`);
const same = await db.query(`SELECT * FROM public.consume_api_quota('idem_quota', 1, 'req-a')`);
const otherRequest = await db.query(`SELECT * FROM public.consume_api_quota('idem_quota', 1, 'req-b')`);
const idemUsed = await db.query(`SELECT used_count FROM public.api_usage_quotas WHERE quota_key = 'idem_quota'`);
check(
  "the same request id does not consume a second unit",
  once.rows.length === 1 &&
    once.rows[0].allowed === true &&
    same.rows.length === 1 &&
    same.rows[0].allowed === true &&
    otherRequest.rows.length === 1 &&
    otherRequest.rows[0].allowed === false &&
    idemUsed.rows[0].used_count === 1,
  { once: once.rows, same: same.rows, otherRequest: otherRequest.rows, idemUsed: idemUsed.rows },
);

await db.exec("RESET ROLE");
await db.exec(`
  INSERT INTO public.duels (code, subject, questions, creator_id, creator_name)
  VALUES (
    'SYNTHETIC',
    'Audit',
    '[{"question":"2+2?","options":["1","2","3","4"],"answerIndex":3}]'::jsonb,
    '${other}',
    'Other'
  );
  GRANT SELECT, UPDATE ON public.duels TO authenticated;
  SET ROLE authenticated;
  SELECT set_config('request.jwt.claim.sub', '${uid}', false);
`);
const duelRead = await db.query(`SELECT questions FROM public.duels`);
let duelWriteBlocked = false;
try {
  const overwritten = await db.query(
    `UPDATE public.duels SET creator_score = 999, questions = '[]'::jsonb WHERE code = 'SYNTHETIC' RETURNING code`,
  );
  duelWriteBlocked = overwritten.rows.length === 0;
} catch {
  duelWriteBlocked = true;
}
const keysVisible = await db.query(
  `SELECT COUNT(*)::int AS n FROM information_schema.role_table_grants
   WHERE table_name = 'duel_answer_keys' AND grantee = 'authenticated' AND privilege_type = 'SELECT'`,
);
check(
  "a stranger cannot list duel rows or read answer-key grants",
  duelRead.rows.length === 0 && duelWriteBlocked && keysVisible.rows[0].n === 0,
  { duelRead: duelRead.rows, duelWriteBlocked, keysVisible: keysVisible.rows },
);

await db.exec("RESET ROLE");
const pending = await db.query(
  `INSERT INTO public.pro_subscriptions (user_id, months, amount_usd, method, reference, status)
   VALUES ($1, 1, 5, 'zelle', 'REF-1', 'pending')
   RETURNING id`,
  [uid],
);
const paymentId = pending.rows[0].id;
let rejected = false;
try {
  await db.query(`SELECT public.review_pro_payment($1, 'reject', $2)`, [paymentId, uid]);
} catch (error) {
  rejected = String(error.message).includes("forbidden");
}
check("a non-admin cannot reject a payment", rejected, null);

const activated = await db.query(`SELECT public.review_pro_payment($1, 'activate', $2) AS result`, [
  paymentId,
  admin,
]);
const entitlement = await db.query(`SELECT plan, expires_at FROM public.billing_entitlements WHERE user_id = $1`, [
  uid,
]);
check(
  "admin activation writes one premium entitlement",
  activated.rows[0].result.ok === true && entitlement.rows[0].plan === "premium",
  { activated: activated.rows, entitlement: entitlement.rows },
);

let secondActivationFailed = false;
try {
  await db.query(`SELECT public.review_pro_payment($1, 'activate', $2)`, [paymentId, admin]);
} catch (error) {
  secondActivationFailed = String(error.message).includes("already_processed");
}
check("a second activation does not extend the period again", secondActivationFailed, null);

await db.query(
  `UPDATE public.pro_subscriptions SET expires_at = now() - interval '1 day' WHERE id = $1`,
  [paymentId],
);
await db.query(
  `UPDATE public.billing_entitlements SET expires_at = now() - interval '1 day' WHERE user_id = $1`,
  [uid],
);
const expiredCount = await db.query(`SELECT public.expire_pro_entitlements() AS n`);
const afterExpire = await db.query(`SELECT plan FROM public.billing_entitlements WHERE user_id = $1`, [uid]);
check(
  "expiration clears premium without a notification provider",
  Number(expiredCount.rows[0].n) >= 1 && afterExpire.rows[0].plan === "free",
  { expiredCount: expiredCount.rows, afterExpire: afterExpire.rows },
);

const seqA = await db.query(`SELECT * FROM public.consume_api_quota('seq_quota', 5, 'A')`);
const seqB = await db.query(`SELECT * FROM public.consume_api_quota('seq_quota', 5, 'B')`);
const seqA2 = await db.query(`SELECT * FROM public.consume_api_quota('seq_quota', 5, 'A')`);
const seqUsed = await db.query(`SELECT used_count FROM public.api_usage_quotas WHERE quota_key = 'seq_quota'`);
check(
  "replaying an older request id does not consume a third unit",
  seqA.rows[0].allowed === true &&
    seqB.rows[0].allowed === true &&
    seqA2.rows[0].allowed === true &&
    seqUsed.rows[0].used_count === 2,
  { seqA: seqA.rows, seqB: seqB.rows, seqA2: seqA2.rows, seqUsed: seqUsed.rows },
);

const zero = await db.query(`SELECT * FROM public.consume_api_quota('zero_quota', 0, 'z')`);
const zeroRows = await db.query(`SELECT used_count FROM public.api_usage_quotas WHERE quota_key = 'zero_quota'`);
check(
  "a limit of zero denies without inserting a usage row",
  zero.rows.length === 1 && zero.rows[0].allowed === false && zeroRows.rows.length === 0,
  { zero: zero.rows, zeroRows: zeroRows.rows },
);

await db.exec("RESET ROLE");
await db.exec(`SELECT set_config('request.jwt.claim.sub', '', false);`);
await db.query(
  `UPDATE public.duels SET challenger_id = $1, challenger_name = 'Challenger' WHERE code = 'SYNTHETIC'`,
  [uid],
);
await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${uid}', false);`);
let participantRewriteBlocked = false;
try {
  await db.query(
    `UPDATE public.duels SET creator_score = 999, questions = '[{"question":"tampered","answerIndex":0}]'::jsonb WHERE code = 'SYNTHETIC'`,
  );
} catch (error) {
  participantRewriteBlocked = String(error.message).includes("duel_write_forbidden");
}
await db.exec("RESET ROLE");
const scoreAfter = await db.query(`SELECT creator_score FROM public.duels WHERE code = 'SYNTHETIC'`);
check(
  "a participant cannot rewrite the opponent score or the questions",
  participantRewriteBlocked && scoreAfter.rows[0].creator_score === null,
  { participantRewriteBlocked, scoreAfter: scoreAfter.rows },
);

await db.query(
  `INSERT INTO public.billing_entitlements (user_id, plan, expires_at)
   VALUES ($1, 'premium', now() + interval '3 days')
   ON CONFLICT (user_id) DO UPDATE SET plan = 'premium', expires_at = now() + interval '3 days'`,
  [other],
);
await db.query(`SELECT public.expire_pro_entitlements()`);
const prizeKept = await db.query(`SELECT plan FROM public.billing_entitlements WHERE user_id = $1`, [other]);
check(
  "a future entitlement without a subscription survives expiration",
  prizeKept.rows[0].plan === "premium",
  prizeKept.rows,
);

const dueCard = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const laterCard = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
await db.query(
  `INSERT INTO public.review_items (id, user_id, subject, topic, front, back, content_hash, next_due)
   VALUES
     ($1, $3, 'Bio', 'Celula', 'frente', 'dorso', 'due-hash', now() - interval '1 hour'),
     ($2, $3, 'Bio', 'Celula', 'luego', 'dorso', 'later-hash', now() + interval '2 days')`,
  [dueCard, laterCard, uid],
);
await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${uid}', false);`);
const firstSession = await db.query(`SELECT * FROM public.start_review_session(1)`);
const secondSession = await db.query(`SELECT * FROM public.start_review_session(1)`);
const reviewQuota = await db.query(
  `SELECT used_count FROM public.api_usage_quotas WHERE user_id = $1 AND quota_key = 'review_session'`,
  [uid],
);
let reviewInsertBlocked = false;
try {
  await db.query(
    `INSERT INTO public.review_sessions (user_id, item_ids) VALUES ($1, $2::uuid[])`,
    [uid, `{${dueCard}}`],
  );
} catch (error) {
  reviewInsertBlocked = /permission denied|42501/i.test(String(error.message));
}
const proSession = await db.query(`SELECT * FROM public.start_review_session(NULL)`);
check(
  "a free review session freezes today's due cards and a repeat does not spend another unit",
  firstSession.rows.length === 1 &&
    firstSession.rows[0].created === true &&
    Array.isArray(firstSession.rows[0].item_ids) &&
    firstSession.rows[0].item_ids.length === 1 &&
    firstSession.rows[0].item_ids[0] === dueCard &&
    secondSession.rows[0].created === false &&
    secondSession.rows[0].session_id === firstSession.rows[0].session_id &&
    reviewQuota.rows[0]?.used_count === 1 &&
    reviewInsertBlocked &&
    proSession.rows[0].created === true &&
    proSession.rows[0].session_id !== firstSession.rows[0].session_id,
  {
    firstSession: firstSession.rows,
    secondSession: secondSession.rows,
    reviewQuota: reviewQuota.rows,
    reviewInsertBlocked,
    proSession: proSession.rows,
  },
);

await db.close();
if (failures.length > 0) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
