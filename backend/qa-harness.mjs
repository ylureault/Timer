// QA / load harness — simulates ~200 users, 10 iterations of ~350 assertions.
// Logs every failure with context. Prints per-iteration + aggregated summary.
import { WebSocket } from 'ws';

const B = 'http://localhost:3000';
const WS = 'ws://localhost:3001';
const ITERATIONS = 10;

const failures = [];           // {iter, cat, test, detail}
let totalAssert = 0, totalPass = 0;
const latencies = [];

function log(iter, cat, test, detail) {
  failures.push({ iter, cat, test, detail });
}
function assert(cond, iter, cat, test, detail = '') {
  totalAssert++;
  if (cond) { totalPass++; return true; }
  log(iter, cat, test, detail);
  return false;
}

async function jget(path) {
  const t = Date.now();
  const r = await fetch(`${B}${path}`);
  latencies.push(Date.now() - t);
  let body = null; try { body = await r.json(); } catch {}
  return { status: r.status, body };
}
async function jpost(path, data) {
  const t = Date.now();
  const r = await fetch(`${B}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  latencies.push(Date.now() - t);
  let body = null; try { body = await r.json(); } catch {}
  return { status: r.status, body };
}
async function jput(path, data) {
  const t = Date.now();
  const r = await fetch(`${B}${path}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  latencies.push(Date.now() - t);
  let body = null; try { body = await r.json(); } catch {}
  return { status: r.status, body };
}

const mkSessions = (n) =>
  Array.from({ length: n }, (_, i) => ({
    nom_session: `S${i + 1}`,
    duree_secondes: 60 + i * 30,
    couleur: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'][i % 5],
    type: i % 3 === 2 ? 'pause' : 'session',
  }));

async function wsOnce(code, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${WS}/?code=${code}`);
    const msgs = [];
    // Listener attached synchronously (before 'open') — mirrors the real client
    // which assigns onmessage immediately, so the initial state push is captured.
    ws.on('message', (d) => { try { msgs.push(JSON.parse(d.toString())); } catch {} });
    const to = setTimeout(() => { resolve({ ok: ws.readyState === 1 || msgs.length > 0, msgs, ws }); }, timeoutMs);
    ws.on('open', () => { clearTimeout(to); resolve({ ok: true, msgs, ws }); });
    ws.on('error', () => { clearTimeout(to); resolve({ ok: false, msgs, ws: null }); });
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runIteration(iter) {
  const before = failures.length;
  const startAssert = totalAssert;

  // ---- Phase A: concurrent creation (simulate a burst of users) ----
  const N = 50;
  const created = await Promise.all(
    Array.from({ length: N }, (_, i) =>
      jpost('/api/timer/create', { name: `T${iter}-${i}`, sessions: mkSessions(3 + (i % 4)) })
    )
  );
  const codes = [], tokens = [];
  for (let i = 0; i < created.length; i++) {
    const { status, body } = created[i];
    assert(status === 200 && body?.success, iter, 'create', 'create returns 200/success', `status=${status} body=${JSON.stringify(body)}`);
    const code = body?.code, tok = body?.edit_token;
    assert(/^\d{3}-\d{3}$/.test(code || ''), iter, 'create', 'code format XXX-XXX', `got ${code}`);
    assert((tok || '').length === 12, iter, 'create', 'edit_token length 12', `got ${tok}`);
    if (code) codes.push(code);
    if (tok) tokens.push(tok);
  }
  assert(new Set(codes).size === codes.length, iter, 'create', 'codes unique within burst', `${codes.length - new Set(codes).size} dup`);
  assert(new Set(tokens).size === tokens.length, iter, 'create', 'tokens unique within burst', `dups`);

  // ---- Phase B: control flow on a sample ----
  const sample = codes.slice(0, 20);
  for (const code of sample) {
    const s0 = await jget(`/api/timer/${code}/state`);
    assert(s0.body?.mode === 'pause', iter, 'flow', 'initial mode pause', `got ${s0.body?.mode}`);
    const dur0 = s0.body?.current_session?.duree_secondes;
    assert(s0.body?.temps_restant === dur0, iter, 'flow', 'initial temps_restant = first session dur', `tr=${s0.body?.temps_restant} dur=${dur0}`);

    await jpost(`/api/timer/${code}/start`);
    const s1 = await jget(`/api/timer/${code}/state`);
    assert(s1.body?.mode === 'play', iter, 'flow', 'mode play after start', `got ${s1.body?.mode}`);

    await jpost(`/api/timer/${code}/addtime`, { seconds: 60 });
    const s2 = await jget(`/api/timer/${code}/state`);
    assert(s2.body?.temps_restant >= dur0, iter, 'flow', 'addtime increases remaining', `tr=${s2.body?.temps_restant} dur0=${dur0}`);

    await jpost(`/api/timer/${code}/pause`);
    const s3 = await jget(`/api/timer/${code}/state`);
    assert(s3.body?.mode === 'pause', iter, 'flow', 'mode pause after pause', `got ${s3.body?.mode}`);

    await jpost(`/api/timer/${code}/next`);
    const s4 = await jget(`/api/timer/${code}/state`);
    assert(s4.body?.session_en_cours === 1, iter, 'flow', 'next -> session 1', `got ${s4.body?.session_en_cours}`);

    await jpost(`/api/timer/${code}/previous`);
    const s5 = await jget(`/api/timer/${code}/state`);
    assert(s5.body?.session_en_cours === 0, iter, 'flow', 'previous -> session 0', `got ${s5.body?.session_en_cours}`);

    await jpost(`/api/timer/${code}/reset`);
    const s6 = await jget(`/api/timer/${code}/state`);
    assert(s6.body?.mode === 'pause' && s6.body?.session_en_cours === 0, iter, 'flow', 'reset -> pause/session0', JSON.stringify(s6.body?.mode));
  }

  // ---- Phase C: boundaries & validation ----
  const c = codes[0];
  // empty sessions
  let r = await jpost('/api/timer/create', { name: 'x', sessions: [] });
  assert(r.status === 400, iter, 'validation', 'empty sessions -> 400', `status ${r.status}`);
  // missing name
  r = await jpost('/api/timer/create', { sessions: mkSessions(1) });
  assert(r.status === 400, iter, 'validation', 'missing name -> 400', `status ${r.status}`);
  // missing sessions field
  r = await jpost('/api/timer/create', { name: 'x' });
  assert(r.status === 400, iter, 'validation', 'missing sessions field -> 400', `status ${r.status}`);
  // invalid theme
  r = await jpost(`/api/timer/${c}/theme`, { theme: 'neon' });
  assert(r.status === 400, iter, 'validation', 'invalid theme -> 400', `status ${r.status}`);
  // valid themes
  for (const th of ['luxe', 'aplat', 'aurora']) {
    r = await jpost(`/api/timer/${c}/theme`, { theme: th });
    const st = await jget(`/api/timer/${c}/state`);
    assert(r.status === 200 && st.body?.theme === th, iter, 'validation', `theme ${th} applied`, `got ${st.body?.theme}`);
  }
  // goto out of range
  r = await jpost(`/api/timer/${c}/goto`, { sessionIndex: 999 });
  assert(r.status === 400, iter, 'validation', 'goto OOB -> 400', `status ${r.status}`);
  r = await jpost(`/api/timer/${c}/goto`, { sessionIndex: -1 });
  assert(r.status === 400, iter, 'validation', 'goto negative -> 400', `status ${r.status}`);
  // unknown code / token
  r = await jget('/api/timer/000-000');
  assert(r.status === 404, iter, 'validation', 'unknown code -> 404', `status ${r.status}`);
  r = await jget('/api/timer/edit/zzzzzzzzzzzz');
  assert(r.status === 404, iter, 'validation', 'unknown token -> 404', `status ${r.status}`);
  // addtime clamp >= 0
  await jpost(`/api/timer/${c}/reset`);
  await jpost(`/api/timer/${c}/addtime`, { seconds: -100000 });
  let st = await jget(`/api/timer/${c}/state`);
  assert((st.body?.temps_restant ?? -1) >= 0, iter, 'edge', 'addtime cannot go negative', `tr=${st.body?.temps_restant}`);
  // message set/clear + unicode/emoji + long
  const longMsg = 'É'.repeat(500) + ' 🎉 café';
  await jpost(`/api/timer/${c}/message`, { message: longMsg });
  st = await jget(`/api/timer/${c}/state`);
  assert(st.body?.message_actuel === longMsg, iter, 'edge', 'unicode/long message preserved', `len=${st.body?.message_actuel?.length}`);
  await jpost(`/api/timer/${c}/message`, { message: null });
  st = await jget(`/api/timer/${c}/state`);
  assert(st.body?.message_actuel === null, iter, 'edge', 'message cleared (null)', `got ${st.body?.message_actuel}`);
  // next at last -> termine
  const term = (await jpost('/api/timer/create', { name: 'term', sessions: mkSessions(2) })).body;
  await jpost(`/api/timer/${term.code}/next`);
  await jpost(`/api/timer/${term.code}/next`);
  st = await jget(`/api/timer/${term.code}/state`);
  assert(st.body?.mode === 'termine', iter, 'edge', 'next past last -> termine', `got ${st.body?.mode}`);
  // previous at first stays 0
  await jpost(`/api/timer/${term.code}/reset`);
  r = await jpost(`/api/timer/${term.code}/previous`);
  st = await jget(`/api/timer/${term.code}/state`);
  assert(st.body?.session_en_cours === 0, iter, 'edge', 'previous at first stays 0', `got ${st.body?.session_en_cours}`);
  // no edit_token leak on public GET
  const pub = await jget(`/api/timer/${c}`);
  assert(!('edit_token' in (pub.body?.timer || {})), iter, 'security', 'edit_token not exposed publicly', JSON.stringify(Object.keys(pub.body?.timer || {})));
  // legacy redirect (manual no-follow)
  const rr = await fetch(`${B}/api/salon/${c}/state`, { redirect: 'manual' });
  assert(rr.status === 307 || rr.status === 0 || rr.status === 200, iter, 'compat', 'legacy /api/salon redirect', `status ${rr.status}`);
  // health
  const h = await jget('/api/health');
  assert(h.body?.status === 'ok', iter, 'infra', 'health ok', JSON.stringify(h.body));
  // emoji/special name create
  const em = await jpost('/api/timer/create', { name: '🚀 Réunion <script>', sessions: [{ nom_session: 'Café ☕', duree_secondes: 120, couleur: '#10B981', type: 'pause' }] });
  assert(em.status === 200, iter, 'edge', 'emoji/special chars name create', `status ${em.status}`);
  const emGet = await jget(`/api/timer/${em.body?.code}`);
  assert(emGet.body?.timer?.name === '🚀 Réunion <script>', iter, 'edge', 'special chars preserved (no mangling)', `got ${emGet.body?.timer?.name}`);

  // ---- Phase D: WebSocket connections + broadcast ----
  const wsSample = codes.slice(20, 32); // 12 codes
  const conns = [];
  for (const code of wsSample) {
    const { ok, ws, msgs } = await wsOnce(code);
    assert(ok, iter, 'ws', 'ws connects', `code ${code}`);
    if (ws) conns.push({ code, ws, msgs });   // reuse the live msgs array
  }
  await sleep(300);
  for (const cn of conns) {
    assert(cn.msgs.length >= 1, iter, 'ws', 'initial state pushed on connect', `code ${cn.code} got ${cn.msgs.length}`);
    assert(cn.msgs[0]?.type === 'state', iter, 'ws', 'ws message type=state', `code ${cn.code}`);
  }
  // trigger broadcast
  for (const cn of conns) { cn.msgs.length = 0; await jpost(`/api/timer/${cn.code}/start`); }
  await sleep(400);
  for (const cn of conns) {
    assert(cn.msgs.some((m) => m.mode === 'play'), iter, 'ws', 'broadcast on control action', `code ${cn.code} msgs=${cn.msgs.length}`);
  }
  for (const cn of conns) { try { cn.ws.close(); } catch {} }

  // ---- Phase E: edit via token ----
  for (let i = 0; i < 6; i++) {
    const code = codes[i], tok = tokens[i];
    const ed = await jget(`/api/timer/edit/${tok}`);
    assert(ed.body?.timer?.edit_token === tok, iter, 'edit', 'edit GET returns token', `code ${code}`);
    const newName = `Edited-${iter}-${i}`;
    const up = await jput(`/api/timer/edit/${tok}`, { name: newName, sessions: mkSessions(2) });
    assert(up.status === 200, iter, 'edit', 'edit PUT 200', `status ${up.status}`);
    const after = await jget(`/api/timer/${code}`);
    assert(after.body?.timer?.name === newName, iter, 'edit', 'edit updates name', `got ${after.body?.timer?.name}`);
    assert(after.body?.sessions?.length === 2, iter, 'edit', 'edit replaces sessions', `got ${after.body?.sessions?.length}`);
    // wrong token
    const wrong = await jput(`/api/timer/edit/wrongtoken123`, { name: 'x' });
    assert(wrong.status === 404, iter, 'edit', 'edit wrong token -> 404', `status ${wrong.status}`);
  }

  const iterFails = failures.length - before;
  const iterAsserts = totalAssert - startAssert;
  console.log(`  Iteration ${iter}: ${iterAsserts} assertions, ${iterFails} failed`);
}

(async () => {
  console.log(`Running ${ITERATIONS} iterations...\n`);
  for (let i = 1; i <= ITERATIONS; i++) {
    await runIteration(i);
  }
  // perf
  latencies.sort((a, b) => a - b);
  const p = (q) => latencies[Math.floor((latencies.length - 1) * q)];
  const slow = latencies.filter((x) => x > 1000).length;

  console.log(`\n================ SUMMARY ================`);
  console.log(`Total assertions: ${totalAssert}  |  passed: ${totalPass}  |  failed: ${failures.length}`);
  console.log(`HTTP latency ms — p50:${p(0.5)} p95:${p(0.95)} p99:${p(0.99)} max:${latencies[latencies.length - 1]}  (requests>${1000}ms: ${slow})`);

  // aggregate unique failures by cat+test
  const agg = {};
  for (const f of failures) {
    const k = `${f.cat} :: ${f.test}`;
    (agg[k] ||= { count: 0, sample: f.detail });
    agg[k].count++;
  }
  if (failures.length) {
    console.log(`\n--- UNIQUE FAILURE TYPES ---`);
    for (const [k, v] of Object.entries(agg).sort((a, b) => b[1].count - a[1].count)) {
      console.log(`  [x${v.count}] ${k}  | e.g. ${v.sample}`);
    }
  } else {
    console.log(`\nAll assertions passed across all iterations. ✅`);
  }
  process.exit(0);
})();
