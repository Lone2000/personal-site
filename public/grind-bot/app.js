/* Grind Bot — interactive demo.
   The rules below are ported from bot.py (github.com/Lone2000/grind-bot):
   karma gate, sheet batch read / guarded write, first-come claim pool, cooldown role + sweeper,
   ping-window loop and the bot's exact message wording. Discord, Reddit and Google Sheets are simulated. */
(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LS = "grindbot:";

/* ======================= config (bot.py defaults) ======================= */
const VERIFIED_ROLE_NAME = "✅・Verified";
const COOLDOWN_ROLE_NAME = "🔴・Task Holder";
const CLAIM_EMOJI = "✅";
const USERNAME_RE = /^[A-Za-z0-9_-]{3,20}$/;
const POOL_REFRESH_INTERVAL_SEC = 15;
const REDDIT_CACHE_TTL = 300;
const CFG = {
  TOTAL_KARMA_THRESHOLD: 800,
  COMMENT_KARMA_THRESHOLD: 500,
  reaction_time_sec: 60,          // /config_settings reaction_time_min:1
  cooldown_seconds: 2 * 60 * 60,  // default 2h
  sheet_url: "https://docs.google.com/spreadsheets/d/1nW-northwind-task-board/edit",
};

/* ======================= tiny helpers ======================= */
const EMO = { "✅": "2705", "📋": "1f4cb", "⏱": "23f1", "⏸": "23f8", "🔴": "1f534", "🔄": "1f504", "🛑": "1f6d1", "⚠": "26a0", "▶": "25b6", "⏩": "23e9" };
const EMO_RE = /(✅|📋|⏱|⏸|🔴|🔄|🛑|⚠|▶|⏩)️?/g;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const emo = (h) => h.replace(EMO_RE, (m, k) => `<img class="emo" src="./emoji/${EMO[k]}.svg" alt="${k}">`);
function md(s) { // just enough Discord markdown for the bot's own messages
  let h = esc(s);
  h = h.replace(/`([^`]+)`/g, "<code>$1</code>");
  h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/@@([\w-]+)/g, '<span class="mention">@$1</span>');
  h = h.replace(/(https:\/\/[^\s<]+)/g, '<a href="#sheet" data-sheet>$1</a>');
  return emo(h).replace(/\n/g, "<br>");
}
function fnv(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
const snowflake = (id) => "10" + String(fnv("sf" + id)).padStart(10, "7").slice(0, 10) + String(fnv(id + "x")).slice(0, 6);
const commit = (line) => window.dispatchEvent(new CustomEvent("demo:commit", { detail: line }));
const store = { get(k) { try { return localStorage.getItem(LS + k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(LS + k, v); } catch (e) {} } };

/* ======================= virtual server clock ======================= */
const T0 = performance.now();
let ff = 0; // fast-forward offset (s)
const vnow = () => 14 * 3600 + (performance.now() - T0) / 1000 + ff;
const two = (n) => String(Math.floor(n)).padStart(2, "0");
const hhmm = (t) => `${two((t / 3600) % 24)}:${two((t % 3600) / 60)}`;
const clock12 = (t) => { const h = Math.floor(t / 3600) % 24, m = Math.floor((t % 3600) / 60); return `${((h + 11) % 12) + 1}:${two(m)} ${h < 12 ? "AM" : "PM"}`; };
const dur = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 3600)}:${two((s % 3600) / 60)}:${two(s % 60)}`; };
function cooldownStr(sec) { // run_task_batch() formatting
  if (sec >= 3600) { const h = Math.floor(sec / 3600); return `${h} hour${h !== 1 ? "s" : ""}`; }
  if (sec >= 60) { const m = Math.floor(sec / 60); return `${m} minute${m !== 1 ? "s" : ""}`; }
  return `${sec} second${sec !== 1 ? "s" : ""}`;
}
const shortDur = (sec) => sec % 3600 === 0 ? `${sec / 3600}h` : sec >= 3600 ? `${(sec / 3600).toFixed(1)}h` : `${Math.round(sec / 60)}m`;

/* ======================= pixel sprites (same heroes as the launch video) ======================= */
const PAL = { k: "#000", w: "#F4F1FF", s: "#F2B48C", h: "#3A2A6B", H: "#8B5A2B", b: "#5865F2", y: "#FFE53E", m: "#FF3EA5", c: "#3EF3FF", g: "#3EFF8B", r: "#FF4757", o: "#FF9F43", p: "#A66CFF", d: "#2A2350", G: "#1F9C55", t: "#2BD1A0" };
function spriteSVG(rows, w, h) {
  let r = "";
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (PAL[ch]) r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${PAL[ch]}"/>`; }));
  return `<svg viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
function hero(shirt, hair = "h") {
  const S = shirt;
  return spriteSVG([
    "...kkkkkk...", `..k${hair.repeat(6)}k..`, `..k${hair}ssss${hair}k..`, "..kssksksk..", "..kssssssk..", "...kssssk...",
    `..k${S.repeat(6)}k..`, `.k${S.repeat(8)}k.`, `.ks${S.repeat(6)}sk.`, "...kddkddk..", "...kddkddk..", "...kk..kk..."], 12, 12);
}
const BOT_SVG = spriteSVG([
  "....kkkkkkkkkkkkkk....", "..kkggggggggggggggkk..", ".kggggggggggggggwggggk", "kgggggggggggggggwwgggk", "kgggggggggggggggwwgggk",
  "kggggwgggggggggwwggggk", "kgggggwwgggggggwwggggk", "kggggggwwggggwwgggggk.", "kgggggggwwggwwggggggk.", "kggggggggwwwwgggggggk.",
  ".kgggggggggwgggggggk..", "..kkggggggggggggggk...", "..kGGGGGGGGGGGGGGGk...", "...kkkkkkkkkkkkkkk....", "......................"], 22, 15);

/* ======================= members ======================= */
const V = VERIFIED_ROLE_NAME, H = COOLDOWN_ROLE_NAME, ADMIN = "Admin";
const mk = (id, name, shirt, hair, bg, roles, extra = {}) => ({ id, name, shirt, hair, bg, roles: new Set(roles), snow: snowflake(id), ...extra });
const MEMBERS = [
  mk("you", "GrindMaster2000", "b", "h", "#2A2350", [], { you: true }),
  mk("mara", "mara", "y", "H", "#3B2F10", [ADMIN, V], { admin: true }),
  mk("ava", "ava", "m", "h", "#3A1430", [V]),
  mk("bruno", "bruno", "r", "H", "#3A1418", [V, H]),
  mk("chen", "chen", "c", "k", "#10323A", [V]),
  mk("dara", "dara", "g", "H", "#123A22", [V]),
  mk("eli", "eli", "o", "h", "#3A2810", [V]),
  mk("faye", "faye", "p", "k", "#2A1A44", [V]),
  mk("gus", "gus", "t", "H", "#0F3530", [V]),
  mk("pip", "pip", "w", "h", "#2C2C3A", []),
  mk("quinn", "quinn", "y", "k", "#34320F", []),
];
const BOT = { id: "bot", name: "Grind Bot", bot: true, roles: new Set(), snow: snowflake("bot") };
const byId = (id) => id === "bot" ? BOT : MEMBERS.find((m) => m.id === id);
const YOU = byId("you"), MARA = byId("mara");
function avatar(m, cls = "") {
  if (m.bot) return `<span class="av bot ${cls}" style="background:#0A0820">${BOT_SVG}</span>`;
  return `<span class="av ${cls}" style="background:${m.bg}">${hero(m.shirt, m.hair)}</span>`;
}
const nameColor = (m) => m.bot ? "#F2F3F5" : m.roles.has(ADMIN) ? "#FFE53E" : m.roles.has(H) ? "#FF7A85" : m.roles.has(V) ? "#7FE0A4" : "#DBDEE1";
const pill = (role, extra = "") => `<span class="pill ${role === V ? "v" : role === H ? "h" : "a"} ${extra}">${emo(esc(role))}</span>`;

/* ======================= server state ======================= */
const state = {
  // bot.py load_state(): {"cooldowns": {user_id: expiry_ts}} — bruno claimed task 6 forty minutes before the demo starts
  cooldowns: { bruno: 14 * 3600 + 40 * 60 },
  cdTotal: { bruno: 7200 },
  channel: "verify",
  msgs: { verify: [], tasks: [], logs: [], dm: [] },
  unread: { verify: 0, tasks: 0, logs: 0, dm: 0 },
  redditCache: {},
  steps: { 1: false, 2: false, 3: false, 4: false },
  claimedOnce: false,
  ui: { user: "GrindMaster2000", n: "5" },
  busy: false,
  dirty: false,
};
let run = null;       // active create_task job
let lastSweep = vnow();
let msgSeq = 0;

/* ---------- the Google Sheet (col A task no., col E assignee) ---------- */
const TITLES = ["Proofread the FAQ page", "Tag 40 support tickets", "Write alt text for 25 images", "QA checkout on mobile", "Transcribe a 10-min interview",
  "Sort survey feedback", "Test sign-up form on Safari", "Check 30 links for 404s", "Draft release notes v2.3", "Caption 6 tutorial clips",
  "Clean up the product list", "Translate welcome email (ES)", "Rename 60 asset files", "Review 12 bug reports", "Fill in missing SKUs", "Summarise 5 user calls",
  "Resize 20 banner images", "Update pricing page copy"];
const EST = ["20m", "45m", "30m", "40m", "35m", "25m", "15m", "30m", "50m", "40m", "25m", "30m", "20m", "45m", "30m", "60m", "25m", "20m"];
const PRE = { 1: "ava", 2: "chen", 3: "faye", 4: "gus", 5: "dara", 6: "bruno", 10: "kai" };
const sheet = [];
for (let n = 1; n <= 12; n++) sheet.push({ row: n + 1, A: String(n), B: TITLES[n - 1], C: EST[n - 1], E: PRE[n] || "", manual: n === 10 });
let lastWrite = null;

class RowAlreadyAssignedError extends Error {}
// _google_get_tasks_batch(): rows with col A set and col E blank, top-down, up to n
function getTasksBatch(n) {
  const out = [];
  for (const r of sheet) { if (r.A.trim() && !r.E.trim()) { out.push([r.row, r.A]); if (out.length >= n) break; } }
  return out;
}
// _google_assign(): re-check col E is blank before writing — never overwrite a name
function assignTask(rowIndex, name) {
  const r = sheet.find((x) => x.row === rowIndex);
  if (name && r.E.trim()) throw new RowAlreadyAssignedError(`row ${rowIndex} already assigned to '${r.E}'`);
  r.E = name; r.manual = false;
  lastWrite = { row: rowIndex, at: performance.now() };
}
const openCount = () => sheet.filter((r) => r.A && !r.E).length;

/* ======================= simulated Reddit ======================= */
// sample responses for the suggested names; any other name gets deterministic numbers from a hash of it
const FIXTURES = { grindmaster2000: { post: 550, comment: 690 }, pixel_pilot: { post: 1835, comment: 2214 }, late_lurker: { post: 762, comment: 141 } };
function redditAbout(u) {
  const k = u.toLowerCase();
  if (FIXTURES[k]) return { status: 200, ...FIXTURES[k] };
  const h = fnv("reddit:" + k);
  if (h % 13 === 0) return { status: 404 };
  const r1 = (h & 0xffff) / 0xffff, r2 = ((h >>> 16) & 0xffff) / 0xffff;
  return { status: 200, post: Math.round(12 + Math.pow(r1, 1.7) * 2600), comment: Math.round(8 + Math.pow(r2, 1.5) * 3100) };
}
// fetch_reddit_karma(): 5-minute in-memory cache, then about.json
async function fetchRedditKarma(username) {
  const u = username.trim(), now = vnow();
  const c = state.redditCache[u.toLowerCase()];
  if (c && now < c.exp) { commit(`reddit: cache hit for u/${u} (5-min TTL), no request sent`); return c; }
  await sleep(650);
  const res = redditAbout(u);
  if (res.status === 404) { commit(`reddit: GET /user/${u}/about.json → 404`); throw new Error("reddit user not found"); }
  const total = res.post + res.comment;
  commit(`reddit: GET /user/${u}/about.json → 200 {link_karma:${res.post}, comment_karma:${res.comment}}`);
  const out = { post: res.post, comment: res.comment, total, exp: now + REDDIT_CACHE_TTL };
  state.redditCache[u.toLowerCase()] = out;
  return out;
}

/* ======================= Discord message plumbing ======================= */
function addMsg(ch, m) {
  m.id = ++msgSeq; m.ts = vnow(); m.ch = ch; m.fresh = true;
  state.msgs[ch].push(m);
  if (ch !== state.channel) { state.unread[ch]++; renderChannels(); }
  else renderMsgs(true);
  return m;
}
function updMsg(m) { m.fresh = false; if (m.ch === state.channel) renderMsgs(true); }
function sendLogs(text) { addMsg("logs", { author: "bot", text }); commit(`discord: POST #logs message: ${text.split("\n")[0].replace(/\*\*/g, "")}`); }
function deleteMsg(m) {
  const el = document.querySelector(`.msg[data-id="${m.id}"]`);
  const drop = () => { state.msgs[m.ch] = state.msgs[m.ch].filter((x) => x !== m); if (m.ch === state.channel) renderMsgs(); };
  if (el && !RM) { el.classList.add("gone"); setTimeout(drop, 450); } else drop();
}

/* ======================= /reddit_verify_yourself ======================= */
async function verify(raw) {
  if (state.busy) return;
  state.busy = true; state.dirty = true; renderCompose();
  const username = raw.trim();
  const reply = addMsg("verify", { author: "bot", eph: true, used: { by: YOU, cmd: "reddit_verify_yourself" }, thinking: true });
  commit("discord: interaction /reddit_verify_yourself → defer(ephemeral=True)");
  await sleep(300);
  try {
    if (!USERNAME_RE.test(username)) { finish("invalid reddit username format."); gate.error(username || "(empty)", "invalid username format"); return; }
    gate.start(username);
    let k;
    try { k = await fetchRedditKarma(username); }
    catch (e) { finish(`could not verify: ${e.message}`); gate.error(username, e.message); return; }
    await gate.fill(k);
    const T = CFG.TOTAL_KARMA_THRESHOLD, C = CFG.COMMENT_KARMA_THRESHOLD;
    if (!(k.total > T && k.comment > C)) {
      finish(`not eligible. u/${username} has ${k.total} total (${k.post} post / ${k.comment} comment). need > ${T} total and > ${C} comment karma.`);
      gate.refused(k); return;
    }
    if (YOU.roles.has(V)) { finish("already verified."); gate.passed(k, true); return; }
    YOU.roles.add(V); YOU.justGot = V;
    commit(`discord: PUT /guilds/…/members/${YOU.snow}/roles/${V} (reason: reddit karma gate: u/${username} total=${k.total}, comment=${k.comment})`);
    sendLogs(`✅ **verified granted**\n- discord: @@${YOU.name} (\`${YOU.snow}\`)\n- reddit: u/${username}\n- karma: total=${k.total}, comment=${k.comment}, post=${k.post}\n- rule: total > ${T} and comment > ${C}`);
    finish("✅ verified role granted.");
    gate.passed(k, false);
    state.steps[1] = true;
    renderAll();
  } finally { state.busy = false; renderCompose(); }
  function finish(text) { reply.thinking = false; reply.text = text; updMsg(reply); }
}

/* ======================= /create_task ======================= */
async function createTask(nRaw) {
  const n = Number(nRaw);
  if (!Number.isInteger(n) || n < 1 || n > 500) { hint("number_of_tasks must be a whole number from 1 to 500.", true); return false; }
  state.dirty = true;
  const used = { by: MARA, cmd: "create_task" };
  if (run) { addMsg("tasks", { author: "bot", eph: true, used, text: "a create_task run is already active. use /cancel_task_run first." }); return false; }
  addMsg("tasks", { author: "bot", eph: true, used, text: `✅ starting task delegation for ${n} tasks.` });
  commit(`discord: interaction /create_task number_of_tasks:${n} by mara (Manage Server) → background job started`);
  state.steps[2] = true; renderSteps();
  runTaskBatch(n);
  return true;
}
function cancelTaskRun() {
  state.dirty = true;
  addMsg("tasks", { author: "bot", eph: true, used: { by: MARA, cmd: "cancel_task_run" }, text: "🛑 task run cancelled." });
  if (run) { run.cancelled = true; commit("bot: job.cancel() → CancelledError inside the claim window (ping is left in place)"); }
  run = null;
  sendLogs("🛑 task run cancelled.");
  renderAll();
}

// run_task_batch(): keep opening ping windows until N tasks are handed out or the sheet runs dry
async function runTaskBatch(N) {
  const job = { N, assigned: 0, cancelled: false, win: null };
  run = job; renderAll();
  while (job.assigned < N) {
    const remaining = N - job.assigned;
    await sleep(350);
    if (job.cancelled) return;
    const pool = getTasksBatch(remaining);
    commit(`sheets: values.get Tasks!A:E → ${pool.length} unassigned row(s) (wanted ${remaining})`);
    if (!pool.length) { sendLogs("🛑 no more unassigned tasks found in sheet."); break; }
    const text = pingText(pool.length);
    const msg = addMsg("tasks", { author: "bot", kind: "ping", text, reactions: new Set(["bot"]), feed: [] });
    commit(`discord: POST #tasks message (${pool.length} task${pool.length !== 1 ? "s" : ""} available) + PUT reaction ${CLAIM_EMOJI}`);
    renderAll();
    const got = await runMultiAssignWindow(job, msg, pool);
    if (job.cancelled || got === null) return;
    job.assigned += got;
    renderAll();
    await sleep(RM ? 600 : 1400); // (demo only) let the final state show before the bot deletes the ping
    commit(`discord: DELETE #tasks ping message (window closed, ${got} assigned)`);
    deleteMsg(msg);
    if (msg.feed.length) addMsg("tasks", { kind: "note", feed: msg.feed.slice(), got });
    if (job.assigned < N) sendLogs(`🔄 ${N - job.assigned} task(s) remaining — opening new ping window.`);
  }
  sendLogs("✅ all tasks assigned.");
  if (run === job) run = null;
  renderAll();
}
function pingText(count) { // the bot's exact ping (no ping role configured)
  const minutes = Math.floor(CFG.reaction_time_sec / 60);
  return `**React to claim a task** ${CLAIM_EMOJI}\n\n📋 **${count} task${count !== 1 ? "s" : ""} available**\n⏱️ **Next Task Ping in:** ${minutes} minute${minutes !== 1 ? "s" : ""}\n⏸️ **Cooldown after claim:** ${cooldownStr(CFG.cooldown_seconds)}\n\nTasks are first come, first serve. After reacting, you'll get a DM with the sheet link and your assigned task number. Look for your Discord username in column E.\n\n**EVERYONE SHOULD REACT here to claim a task.**`;
}

// run_multi_assign_window(): listen for ✅ for reaction_time_sec; each reaction is processed concurrently,
// tasks are popped top-down from a shared pool so a row can only ever go to one person
function runMultiAssignWindow(job, msg, pool) {
  return new Promise((resolve) => {
    const win = { job, msg, pool, initial: pool.map((p) => p[1]), remaining: CFG.reaction_time_sec, lastRefresh: performance.now(), pending: [], assigned: 0, live: true };
    msg.win = win; job.win = win;
    let last = performance.now();
    const finish = async (val) => {
      win.live = false; renderDeck();
      await Promise.allSettled(win.pending);
      resolve(val === null ? null : win.assigned);
    };
    const tick = () => {
      if (job.cancelled) { win.live = false; resolve(null); return; }
      const now = performance.now();
      if ((now - win.lastRefresh) / 1000 >= POOL_REFRESH_INTERVAL_SEC) refreshPool(win, false);
      if (!win.pool.length) { refreshPool(win, true); if (!win.pool.length) { finish(); return; } }
      win.remaining -= (now - last) / 1000; last = now;
      updateWindowUI(win);
      if (win.remaining <= 0) { finish(); return; }
      setTimeout(tick, 250);
    };
    tick();
  });
}
function refreshPool(win, becauseEmpty) {
  const fresh = getTasksBatch(1000);
  const existing = new Set(win.pool.map((p) => p[0]));
  let added = 0;
  for (const [ri, t] of fresh) if (!existing.has(ri)) { win.pool.push([ri, t]); added++; }
  win.lastRefresh = performance.now();
  if (becauseEmpty) commit(`sheets: pool empty → re-read sheet: +${added} row(s)${added ? "" : ", closing the window early"}`);
  if (added > 0) { sendLogs(`🔄 mid-window refresh: +${added} task(s) picked up from sheet`); updMsg(win.msg); renderSheet(); }
}

// is_member_on_cooldown(): blocked only if they HOLD the cooldown role AND the stored expiry is in the future
function isMemberOnCooldown(m) {
  if (!m.roles.has(H)) { delete state.cooldowns[m.id]; return false; }
  const exp = state.cooldowns[m.id] || 0;
  if (exp <= vnow()) {
    m.roles.delete(H); delete state.cooldowns[m.id];
    commit(`discord: DELETE role ${H} from ${m.name} (cooldown expired, auto-clean)`);
    return false;
  }
  return true;
}

// one ✅ reaction → process_one()
async function processOne(win, m) {
  const msg = win.msg;
  await sleep(240); // guild.fetch_member()
  if (isMemberOnCooldown(m)) {
    msg.reactions.delete(m.id);
    commit(`discord: DELETE ${CLAIM_EMOJI} reaction by ${m.name}: holds ${H} until ${hhmm(state.cooldowns[m.id])}`);
    feed(win, m, `${m.name} → on cooldown, reaction removed`, "no");
    if (m.you) toast("sys", "Reaction removed", `You still hold ${H} (${dur(state.cooldowns.you - vnow())} left), so the bot took your ✅ back.`);
    renderAll(); return;
  }
  let task = null, row = null;
  for (;;) {
    if (!win.pool.length) {
      commit(`bot: ${m.name} reacted after the pool emptied → no task, no reply`);
      feed(win, m, `${m.name} → pool empty, nothing left`, "meh");
      if (m.you) toast("sys", "Too late", "Every task in this ping was already claimed. The bot stays silent.");
      return;
    }
    [row, task] = win.pool.shift();
    try { assignTask(row, m.name); break; }
    catch (e) {
      if (e instanceof RowAlreadyAssignedError) { sendLogs(`⚠️ task #${task} (row ${row}) already had a name in Col E — skipping (not overwritten)`); continue; }
      throw e;
    }
  }
  commit(`sheets: E${row} re-checked blank → update_cell(E${row}, "${m.name}")`);
  feed(win, m, `${m.name} → task #${task}`, "ok");
  renderSheet(true); renderHud(); updateWindowUI(win);
  await sleep(220);
  // cooldown role + stored expiry
  const expiry = vnow() + CFG.cooldown_seconds;
  m.roles.add(H); state.cooldowns[m.id] = expiry; state.cdTotal[m.id] = CFG.cooldown_seconds; m.justGot = H;
  commit(`discord: PUT role ${H} → ${m.name} (task claimed cooldown, expires ${hhmm(expiry)})`);
  renderMembers(); renderDeck();
  await sleep(200);
  addMsg(m.you ? "dm" : "_void", { author: "bot", text: `you got task no. ${task}\n${CFG.sheet_url}` });
  commit(`discord: DM ${m.name}: "you got task no. ${task}" + sheet link`);
  if (m.you) { state.steps[3] = true; state.claimedOnce = true; toast("dm", "Grind Bot", `you got task no. ${task}`); }
  sendLogs(`✅ **task assigned**\n- task: #${task} (row ${row})\n- discord: @@${m.name} (\`${m.snow}\`)\n- wrote col E: ${m.name}\n- dm: sent\n- cooldown role applied: yes\n- cooldown: ${CFG.cooldown_seconds}s`);
  win.assigned++;
  renderAll();
}
state.msgs._void = []; state.unread._void = 0;

// a member clicks ✅ on the ping
function react(msg, m) {
  if (!msg.reactions) return;
  if (msg.reactions.has(m.id)) { msg.reactions.delete(m.id); updMsg(msg); return; } // reaction_remove: the bot ignores it
  msg.reactions.add(m.id); updMsg(msg);
  const win = msg.win;
  if (!win || !win.live) return; // nobody is listening (window closed, or the run was cancelled)
  const p = processOne(win, m); win.pending.push(p);
}
function feed(win, m, text, cls) { win.msg.feed.push({ text, cls }); updMsg(win.msg); }

/* ---------- simulated rush ---------- */
const RUSH = [["chen", 0], ["bruno", 140], ["pip", 260], ["ava", 330], ["dara", 470], ["eli", 560], ["faye", 700], ["gus", 820]];
async function rush() {
  const win = run && run.win;
  if (!win || !win.live) return;
  state.dirty = true; $("#btnRush").disabled = true;
  let t = 0;
  for (const [id, at] of RUSH) {
    await sleep(at - t); t = at;
    if (!win.live) break;
    const m = byId(id);
    if (win.msg.reactions.has(id)) continue;
    if (!m.roles.has(V)) { // Discord itself refuses: #tasks is only visible to ✅・Verified
      commit(`discord: PUT reaction by ${m.name} → 403 Missing Access (#tasks needs ${V})`);
      feed(win, m, `${m.name} → not verified, can't see #tasks`, "no");
      continue;
    }
    react(win.msg, m);
  }
  await Promise.allSettled(win.pending);
  state.rushed = true; renderDeck();
}

/* ---------- cooldown sweeper (every 30 s of server time) ---------- */
function sweep() {
  lastSweep = vnow();
  for (const [uid, exp] of Object.entries(state.cooldowns)) {
    if (exp <= vnow()) {
      const m = byId(uid);
      if (m && m.roles.has(H)) { m.roles.delete(H); commit(`discord: DELETE role ${H} from ${m.name} (cooldown expired, sweeper)`); }
      delete state.cooldowns[uid];
      if (m && m.you) { if (state.claimedOnce) state.steps[4] = true; toast("sys", "Cooldown over", `The sweeper removed ${H}. You can claim again on the next ping.`); }
    }
  }
  renderAll();
}
let ffBusy = false;
async function fastForward() {
  if (ffBusy) return;
  ffBusy = true; state.dirty = true;
  const total = CFG.cooldown_seconds, start = ff, t0 = performance.now(), D = RM ? 0 : 1300;
  commit(`clock: +${shortDur(total)} of server time passes`);
  while (performance.now() - t0 < D) { ff = start + total * ((performance.now() - t0) / D); renderTimers(); await sleep(30); }
  ff = start + total; renderTimers();
  sweep();
  ffBusy = false;
}

/* ======================= karma gate panel ======================= */
const gate = {
  start(u) { $("#gateWho").textContent = "u/" + u; this.set(0, 0); this.verdict("", "&nbsp;"); },
  set(total, comment) {
    const tm = CFG.TOTAL_KARMA_THRESHOLD * 1.875 || 1, cm = CFG.COMMENT_KARMA_THRESHOLD * 2 || 1;
    $("#mfTotal").style.width = Math.min(100, (total / tm) * 100) + "%";
    $("#mfComment").style.width = Math.min(100, (comment / cm) * 100) + "%";
  },
  async fill(k) {
    this.set(k.total, k.comment);
    const D = RM ? 0 : 900, t0 = performance.now();
    while (performance.now() - t0 < D) {
      const p = 1 - Math.pow(1 - (performance.now() - t0) / D, 3);
      $("#mvTotal").textContent = Math.round(k.total * p); $("#mvComment").textContent = Math.round(k.comment * p);
      await sleep(30);
    }
    $("#mvTotal").textContent = k.total; $("#mvComment").textContent = k.comment;
  },
  verdict(cls, html) { const v = $("#verdict"); v.className = "verdict " + cls; v.innerHTML = html; if (cls && !RM) { void v.offsetWidth; v.classList.add("pop"); } },
  passed(k, already) { this.verdict("ok", `${already ? "ALREADY VERIFIED" : "LEVEL CLEAR!"}<small>${emo(esc(V))} ${already ? "role already on you" : "role granted"}</small>`); },
  refused(k) {
    const why = [];
    if (!(k.total > CFG.TOTAL_KARMA_THRESHOLD)) why.push(`total ${k.total} ≤ ${CFG.TOTAL_KARMA_THRESHOLD}`);
    if (!(k.comment > CFG.COMMENT_KARMA_THRESHOLD)) why.push(`comment ${k.comment} ≤ ${CFG.COMMENT_KARMA_THRESHOLD}`);
    this.verdict("no", `REFUSED<small>${why.join(" · ")}, no role</small>`);
  },
  error(u, e) { $("#gateWho").textContent = "u/" + u; this.set(0, 0); $("#mvTotal").textContent = "–"; $("#mvComment").textContent = "–"; this.verdict("no", `NO SIGNAL<small>${esc(e)}</small>`); },
  thresholds() {
    $("#mtTotal").textContent = CFG.TOTAL_KARMA_THRESHOLD; $("#mtComment").textContent = CFG.COMMENT_KARMA_THRESHOLD;
    $("#mgTotal").style.left = (1 / 1.875) * 100 + "%"; $("#mgComment").style.left = "50%";
  },
};

/* ======================= rendering ======================= */
const ICON_HASH = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M10.99 3.16A1 1 0 1 0 9 2.84L8.15 8H4a1 1 0 0 0 0 2h3.82l-.67 4H3a1 1 0 1 0 0 2h3.82l-.8 4.84a1 1 0 0 0 1.97.32L8.85 16h4.97l-.8 4.84a1 1 0 0 0 1.97.32l.86-5.16H20a1 1 0 1 0 0-2h-3.82l.67-4H21a1 1 0 1 0 0-2h-3.82l.8-4.84a1 1 0 1 0-1.97-.32L15.15 8h-4.97l.8-4.84ZM14.15 14l.67-4H9.85l-.67 4h4.97Z"/></svg>';
const ICON_LOCKHASH = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M16 4h.5v-.5a2.5 2.5 0 0 1 5 0V4h.5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm4-.5V4h-2v-.5a1 1 0 1 1 2 0Z"/><path fill="currentColor" d="M12.5 8c.28 0 .5.22.5.5V9c0 .1 0 .2.02.31.03.34-.21.69-.56.69H9.85l-.67 4h4.97l.28-1.68c.06-.34.44-.5.74-.34.27.15.56.27.86.34.12.03.21.14.19.26l-.2 1.22H20a1 1 0 1 1 0 2h-3.82l-.8 4.84a1 1 0 0 1-1.97-.32l.75-4.52H9.18l-.8 4.84a1 1 0 0 1-1.97-.32L7.15 16H3a1 1 0 1 1 0-2h4.82l.67-4H4a1 1 0 1 1 0-2h4.82l.84-5.16a1 1 0 0 1 1.98.32L10.85 8h1.65Z"/></svg>';
const CHANNELS = [
  { cat: "Start here" },
  { id: "verify", name: "verify", topic: "Run /reddit_verify_yourself to get ✅・Verified" },
  { cat: "Grind" },
  { id: "tasks", name: "tasks", topic: "Task pings · react ✅ to claim · verified members only" },
  { id: "logs", name: "logs", topic: "Everything the bot does, logged" },
  { cat: "Direct messages" },
  { id: "dm", name: "Grind Bot", dm: true, topic: "Your DMs with Grind Bot" },
];
function chanButton(c) {
  const locked = c.id === "tasks" && !YOU.roles.has(V);
  const icon = c.dm ? avatar(BOT) : locked ? ICON_LOCKHASH : ICON_HASH;
  const n = state.unread[c.id];
  return `<button type="button" class="ch ${state.channel === c.id ? "on" : ""} ${n ? "unread" : ""}" data-ch="${c.id}" aria-current="${state.channel === c.id}">${icon}<span class="nm">${esc(c.name)}</span>${n ? `<span class="badge">${n}</span>` : ""}</button>`;
}
function renderChannels() {
  $("#chans").innerHTML = CHANNELS.map((c) => c.cat ? `<div class="dc-cat">${esc(c.cat)}</div>` : chanButton(c)).join("");
  const tabs = $("#dcTabs"); if (tabs) tabs.innerHTML = CHANNELS.filter((c) => !c.cat).map(chanButton).join("");
  const c = CHANNELS.find((x) => x.id === state.channel);
  $("#chTitle").innerHTML = (c.dm ? avatar(BOT) : ICON_HASH) + `<span>${esc(c.name)}</span>`;
  $("#chTopic").innerHTML = emo(esc(c.topic));
}
function msgHTML(m) {
  if (m.kind === "note") return `<div class="note" data-id="${m.id}"><span class="k">DEMO NOTE</span>The bot deleted its ping when the window closed. Claim order it processed:<ol class="feed">${m.feed.map((f) => `<li class="${f.cls}">${esc(f.text)}</li>`).join("")}</ol></div>`;
  const a = m.author === "bot" ? BOT : byId(m.author);
  const used = m.used ? `<div class="used"><b>@${esc(m.used.by.name)}</b> used <span class="cmd">/${esc(m.used.cmd)}</span></div>` : "";
  const head = `<div class="mh"><span class="an" style="color:${nameColor(a)}">${esc(a.name)}</span>${a.bot ? '<span class="app">✓ APP</span>' : ""}<time>Today at ${clock12(m.ts)}</time></div>`;
  const body = m.thinking ? `<div class="mt think">Grind Bot is thinking<i></i><i></i><i></i></div>` : `<div class="mt">${md(m.text)}</div>`;
  let extra = "";
  if (m.kind === "ping") {
    const mine = m.reactions.has("you");
    const hot = YOU.roles.has(V) && !mine && !state.steps[3] && m.win && m.win.live;
    extra += `<div class="reacts"><button type="button" class="react ${hot ? "hot" : ""}" data-react="${m.id}" aria-pressed="${mine}" aria-label="React with ✅ to claim a task, ${m.reactions.size} reactions"><img class="emo" src="./emoji/2705.svg" alt="">${m.reactions.size}</button></div>`;
    const w = m.win;
    if (w) {
      const taken = new Set(w.initial.filter((t) => !w.pool.some((p) => p[1] === t)));
      const extraPool = w.pool.filter((p) => !w.initial.includes(p[1])).map((p) => p[1]);
      const chips = [...w.initial, ...extraPool].map((t) => `<span class="chip ${taken.has(t) ? "taken" : ""}">#${esc(t)}</span>`).join(" ");
      const state_ = !w.live ? "closed" : `closes in <b data-left>${Math.max(0, Math.ceil(w.remaining))}s</b>`;
      extra += `<div class="botstate" aria-label="Bot state for this ping"><div class="row"><span class="k">BOT STATE</span><span>window ${state_}</span><span class="bar"><i data-bar style="width:${Math.max(0, (w.remaining / CFG.reaction_time_sec) * 100)}%"></i></span></div>
        <div class="row" style="margin-top:4px"><span>pool (top-down):</span> ${chips}</div>
        ${m.feed.length ? `<ol class="feed">${m.feed.map((f) => `<li class="${f.cls}">${esc(f.text)}</li>`).join("")}</ol>` : ""}</div>`;
    }
  }
  const eph = m.eph ? `<div class="eph"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5C5.65 5 2 12 2 12s3.65 7 10 7 10-7 10-7-3.65-7-10-7Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></svg>Only you can see this · <a>Dismiss message</a></div>` : "";
  return `<div class="msg ${m.eph ? "ephemeral" : ""} ${m.used ? "has-used" : ""} ${m.fresh && !RM ? "in" : ""}" data-id="${m.id}">${used}${avatar(a)}<div class="mb">${head}${body}${extra}${eph}</div></div>`;
}
const INTRO = {
  verify: `<div class="empty"><h3>Welcome to #verify</h3><p>Only members with real Reddit history get in. Run the command below: the bot checks the account's karma and grants ${pill(V)} if it clears both gates.</p></div>`,
  tasks: `<div class="empty"><h3>Welcome to #tasks</h3><p>No ping yet. Use mara's admin seat below to run <code>/create_task</code>: the bot reads open rows from the sheet and posts a claim message here.</p></div>`,
  logs: `<div class="empty"><h3>#logs</h3><p>The bot's own <code>send_logs()</code> messages land here, word for word.</p></div>`,
  dm: `<div class="empty"><h3>Grind Bot</h3><p>This is the beginning of your direct message history with Grind Bot. Claim a task and your assignment arrives here.</p></div>`,
};
function renderMsgs(stick) {
  const box = $("#msgs");
  const near = stick || box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  const list = state.msgs[state.channel];
  box.innerHTML = INTRO[state.channel] + list.map(msgHTML).join("");
  list.forEach((m) => (m.fresh = false));
  const locked = state.channel === "tasks" && !YOU.roles.has(V);
  $("#lock").hidden = !locked;
  if (near) box.scrollTop = box.scrollHeight;
}
function updateWindowUI(win) {
  const el = document.querySelector(`.msg[data-id="${win.msg.id}"]`);
  if (!el) return;
  const l = el.querySelector("[data-left]"), b = el.querySelector("[data-bar]");
  if (l) l.textContent = Math.max(0, Math.ceil(win.remaining)) + "s";
  if (b) b.style.width = Math.max(0, (win.remaining / CFG.reaction_time_sec) * 100) + "%";
}
function ring(m, size) {
  const exp = state.cooldowns[m.id];
  if (!m.roles.has(H) || !exp) return "";
  const total = state.cdTotal[m.id] || CFG.cooldown_seconds;
  const f = Math.max(0, Math.min(1, (exp - vnow()) / total));
  const r = 46, c = 2 * Math.PI * r;
  return `<svg class="r" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="${r}" fill="none" stroke="rgba(255,71,87,.2)" stroke-width="7"/><circle cx="50" cy="50" r="${r}" fill="none" stroke="#FF4757" stroke-width="7" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}"/></svg>`;
}
function memRow(m) {
  const exp = state.cooldowns[m.id];
  const sub = m.roles.has(H) && exp ? `<span class="sub">${dur(exp - vnow())}</span>` : "";
  return `<div class="mem"><span class="avw">${avatar(m)}${ring(m)}</span><span class="nm" style="color:${nameColor(m)}">${esc(m.name)}${sub}</span>${m.you ? '<span class="tagyou">YOU</span>' : ""}</div>`;
}
function renderMembers() {
  const groups = [
    ["Admin", MEMBERS.filter((m) => m.roles.has(ADMIN))],
    [H, MEMBERS.filter((m) => !m.roles.has(ADMIN) && m.roles.has(H))],
    [V, MEMBERS.filter((m) => !m.roles.has(ADMIN) && !m.roles.has(H) && m.roles.has(V))],
    ["Online", MEMBERS.filter((m) => !m.roles.has(ADMIN) && !m.roles.has(H) && !m.roles.has(V))],
    ["Apps", [BOT]],
  ];
  $("#members").innerHTML = groups.filter((g) => g[1].length).map(([g, list]) => `<div class="mg">${emo(esc(g))} — ${list.length}</div>` + list.map((m) => m.bot ? `<div class="mem"><span class="avw">${avatar(m)}</span><span class="nm">Grind Bot <span class="app">✓ APP</span></span></div>` : memRow(m)).join("")).join("");
}
function rolePills(m) {
  const out = [];
  for (const r of [V, H]) if (m.roles.has(r)) out.push(pill(r, m.justGot === r && !RM ? "pop" : ""));
  m.justGot = null;
  return out.join("") || `<span class="pill" style="color:#949BA4">no roles yet</span>`;
}
function renderMe() {
  $("#me").innerHTML = `<span class="avw">${avatar(YOU)}${ring(YOU)}</span><div style="min-width:0"><div class="nm">${esc(YOU.name)}</div><div class="st">${YOU.roles.has(H) ? `<span style="color:#FF7A85">${dur(state.cooldowns.you - vnow())} cooldown</span>` : YOU.roles.has(V) ? "verified" : "unverified"}</div></div>`;
}
function renderDeck() {
  let chip = $("#youChip");
  if (!chip) { chip = document.createElement("div"); chip.id = "youChip"; chip.className = "you"; $(".deck-actions").prepend(chip); }
  const cd = YOU.roles.has(H) && state.cooldowns.you ? `<span class="cd" data-cd>${dur(state.cooldowns.you - vnow())}</span>` : "";
  chip.innerHTML = `<span class="ring"><span class="avw">${avatar(YOU, "lg")}${ring(YOU)}</span></span><div><div class="nm">${esc(YOU.name)} ${cd}</div><div class="rl">${rolePills(YOU)}</div></div>`;
  const live = !!(run && run.win && run.win.live);
  const rb = $("#btnRush");
  rb.disabled = !live;
  rb.title = live ? "Eight members hit ✅ within a second" : "Needs a live ping: run /create_task first";
  rb.classList.toggle("hot", live && state.steps[3] && !state.rushed);
  $("#btnFF").classList.toggle("hot", YOU.roles.has(H) && state.steps[3] && !state.steps[4]);
  $("#ffLabel").textContent = shortDur(CFG.cooldown_seconds);
  const s4 = document.querySelector('#steps li[data-step="4"] i'); if (s4) s4.textContent = "fast-forward " + shortDur(CFG.cooldown_seconds);
}
function renderTimers() { renderMembers(); renderMe(); renderHud(); const c = $("#youChip [data-cd]"); if (c && state.cooldowns.you) c.textContent = dur(state.cooldowns.you - vnow()); else renderDeck(); const r = $("#youChip .avw"); if (r) r.innerHTML = avatar(YOU, "lg") + ring(YOU); }
function renderHud() { $("#hudOpen").textContent = openCount(); $("#hudClock").textContent = hhmm(vnow()); }
function renderSheet(scrollToWrite) {
  const pooled = new Set(run && run.win && run.win.live ? run.win.pool.map((p) => p[0]) : []);
  const narrow = $("#sheetWrap").clientWidth < 440;
  $("#sheet").classList.toggle("narrow", narrow);
  const cC = (x) => narrow ? "" : x;
  let h = `<colgroup><col style="width:30px"><col style="width:${narrow ? 36 : 46}px"><col>${cC('<col style="width:42px">')}<col style="width:64px"><col style="width:${narrow ? 118 : 124}px"></colgroup>`;
  h += `<thead><tr><th></th><th>A</th><th>B</th>${cC("<th>C</th>")}<th>D</th><th>E</th></tr></thead><tbody>`;
  h += `<tr class="hdr"><th>1</th><td>No.</td><td>Task</td>${cC("<td>Est.</td>")}<td>Status</td><td>Assigned (Discord)</td></tr>`;
  for (const r of sheet) {
    const st = r.E ? "taken" : pooled.has(r.row) ? "pool" : "open";
    const label = r.E ? "taken" : pooled.has(r.row) ? "in ping" : "open";
    const w = lastWrite && lastWrite.row === r.row;
    const flash = w && performance.now() - lastWrite.at < 400 && !RM ? " flash" : "";
    h += `<tr class="${st === "pool" ? "pool" : ""}" data-row="${r.row}"><th>${r.row}</th><td class="a">${esc(r.A)}</td><td title="${esc(r.B)}">${esc(r.B)}</td>${cC(`<td>${esc(r.C)}</td>`)}<td class="st"><span class="${st}">${label}</span></td><td class="e${r.manual && r.E ? " manual" : ""}${w ? " w" + flash : ""}" ${r.manual && r.E ? 'title="typed in by hand, the bot will never overwrite it"' : ""}>${esc(r.E)}</td></tr>`;
  }
  $("#sheet").innerHTML = h + "</tbody>";
  const wrap = $("#sheetWrap");
  let tag = $("#gsTag");
  if (lastWrite) {
    const cell = wrap.querySelector(`tr[data-row="${lastWrite.row}"] td.e`);
    const r = sheet.find((x) => x.row === lastWrite.row);
    $("#fxRef").textContent = "E" + lastWrite.row; $("#fxVal").textContent = r.E;
    if (cell) {
      if (!tag) { tag = document.createElement("div"); tag.id = "gsTag"; tag.className = "gs-tag"; tag.textContent = "Grind Bot"; wrap.appendChild(tag); }
      tag.style.top = cell.offsetTop + "px"; tag.style.left = cell.offsetLeft + "px";
      if (scrollToWrite) wrap.scrollTo({ top: Math.max(0, cell.offsetTop - wrap.clientHeight / 2), behavior: RM ? "auto" : "smooth" });
    }
  } else { $("#fxRef").textContent = "E8"; $("#fxVal").textContent = ""; }
}
function renderSteps() {
  const now = [1, 2, 3, 4].find((s) => !state.steps[s]);
  document.querySelectorAll("#steps li").forEach((li) => {
    const s = +li.dataset.step;
    li.classList.toggle("done", !!state.steps[s]);
    li.classList.toggle("now", s === now);
  });
}
function hint(text, err) { const h = $("#hint"); if (h) { h.textContent = text || ""; h.classList.toggle("err", !!err); } }
function renderCompose() {
  const c = $("#compose");
  const ch = state.channel;
  const step = [1, 2, 3, 4].find((s) => !state.steps[s]);
  if (ch === "verify") {
    const samples = ["GrindMaster2000", "pixel_pilot", "late_lurker"];
    c.innerHTML = `<div class="samples"><span>Try:</span>${samples.map((s) => `<button type="button" class="sample" data-sample="${s}" aria-pressed="${state.ui.user === s}">${s}</button>`).join("")}<span>· two pass, one doesn't (or type any name)</span></div>
      <form class="slash" id="fVerify" autocomplete="off"><span class="cmdname">/reddit_verify_yourself</span>
      <label class="opt"><span>username</span><input id="inUser" value="${esc(state.ui.user)}" maxlength="24" spellcheck="false" aria-label="Reddit username (without /u/)"></label>
      <button class="send ${step === 1 ? "hot" : ""}" id="sendVerify" ${state.busy ? "disabled" : ""}>Send</button></form><div class="hint" id="hint"></div>`;
  } else if (ch === "tasks") {
    c.innerHTML = `<div class="seat">${avatar(MARA)}<span>Admin commands run from <b style="color:#FFE53E">mara</b>'s seat (Manage Server).</span><button type="button" class="ghost" id="btnCancel">/cancel_task_run</button></div>
      <form class="slash" id="fCreate" autocomplete="off"><span class="cmdname">/create_task</span>
      <label class="opt" id="optN"><span>number_of_tasks</span><input id="inN" type="number" min="1" max="500" step="1" value="${esc(state.ui.n)}" inputmode="numeric" aria-label="How many tasks to assign"></label>
      <button class="send ${step === 2 && YOU.roles.has(V) ? "hot" : ""}" id="sendCreate">Send</button></form><div class="hint" id="hint"></div>`;
  } else if (ch === "logs") {
    c.innerHTML = `<div class="ro">You do not have permission to send messages in this channel.</div>`;
  } else {
    c.innerHTML = `<div class="ro">Grind Bot only sends DMs. Your assigned row is in column E of the sheet.</div>`;
  }
}
function renderAll() { renderChannels(); renderMsgs(); renderMembers(); renderMe(); renderDeck(); renderSheet(); renderSteps(); renderHud(); }

let toastTimer = 0;
function toast(kind, title, text) {
  const t = $("#toast");
  t.className = "dc-toast" + (kind === "sys" ? " sys" : "");
  t.innerHTML = (kind === "dm" ? avatar(BOT) : `<img class="emo" src="./emoji/${kind === "sys" ? "26a0" : "2705"}.svg" alt="" style="width:22px;height:22px">`) + `<div><b>${emo(esc(title))}${kind === "dm" ? ' <span style="color:#949BA4;font-weight:500">· direct message</span>' : ""}</b><span>${emo(esc(text))}</span></div>`;
  t.dataset.kind = kind; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 5200);
}

function goChannel(ch) {
  state.channel = ch; state.unread[ch] = 0;
  $(".dc").classList.remove("show-members"); $("#btnMembers").setAttribute("aria-expanded", "false");
  renderChannels(); renderMsgs(true); renderCompose();
}

/* ======================= events ======================= */
function wire() {
  // narrow-screen channel tabs live in the header
  const tabs = document.createElement("nav"); tabs.className = "dc-tabs"; tabs.id = "dcTabs"; tabs.setAttribute("aria-label", "Channels");
  $(".dc-head").appendChild(tabs);

  document.addEventListener("click", (e) => {
    const t = e.target;
    const ch = t.closest("[data-ch]"); if (ch) { goChannel(ch.dataset.ch); return; }
    const gc = t.closest("[data-goch]"); if (gc) { goChannel(gc.dataset.goch); return; }
    const s = t.closest("[data-sample]"); if (s) { state.ui.user = s.dataset.sample; const i = $("#inUser"); i.value = state.ui.user; document.querySelectorAll(".sample").forEach((b) => b.setAttribute("aria-pressed", b === s)); i.focus(); return; }
    const r = t.closest("[data-react]");
    if (r) { const m = state.msgs.tasks.find((x) => x.id === +r.dataset.react); if (m) { state.dirty = true; react(m, YOU); } return; }
    if (t.closest("[data-sheet]")) { e.preventDefault(); $(".gs").scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "center" }); return; }
    if (t.closest("#btnCancel")) { cancelTaskRun(); return; }
    if (t.closest("#toast")) { const k = $("#toast").dataset.kind; $("#toast").hidden = true; if (k === "dm") goChannel("dm"); return; }
    if (t.closest("#btnMembers")) { const on = $(".dc").classList.toggle("show-members"); $("#btnMembers").setAttribute("aria-expanded", on); return; }
  });
  document.addEventListener("submit", (e) => {
    e.preventDefault();
    if (e.target.id === "fVerify") verify($("#inUser").value);
    if (e.target.id === "fCreate") createTask($("#inN").value);
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "inUser") { state.ui.user = e.target.value; document.querySelectorAll(".sample").forEach((b) => b.setAttribute("aria-pressed", b.dataset.sample === e.target.value)); }
    if (e.target.id === "inN") { state.ui.n = e.target.value; hint(""); }
  });
  $("#btnRush").addEventListener("click", () => { goChannel("tasks"); rush(); });
  $("#btnFF").addEventListener("click", fastForward);
  $("#btnAddRow").addEventListener("click", addRow);
  $("#btnTour").addEventListener("click", toggleTour);
  $("#steps").addEventListener("click", (e) => {
    const b = e.target.closest("[data-go]"); if (!b) return;
    const s = +b.dataset.go;
    if (s === 1) { goChannel("verify"); $("#sendVerify") && $("#sendVerify").focus(); }
    if (s === 2) { goChannel("tasks"); $("#sendCreate").focus(); }
    if (s === 3) { goChannel(YOU.roles.has(V) ? "tasks" : "verify"); const r = document.querySelector(".react"); if (r) r.focus(); }
    if (s === 4) fastForward();
  });
  const env = (id, key, min, max, mul = 1) => $(id).addEventListener("change", (e) => {
    let v = Number(e.target.value); if (!isFinite(v)) v = CFG[key] / mul;
    v = Math.min(max, Math.max(min, v)); e.target.value = v;
    CFG[key] = Math.round(v * mul); state.dirty = true;
    commit(`config: ${id === "#envCd" ? `cooldown_seconds = ${CFG[key]} (/config_settings cooldown_hours:${v})` : `${key}=${CFG[key]} (.env, restart)`}`);
    gate.thresholds(); renderDeck();
  });
  env("#envTotal", "TOTAL_KARMA_THRESHOLD", 0, 100000);
  env("#envComment", "COMMENT_KARMA_THRESHOLD", 0, 100000);
  env("#envCd", "cooldown_seconds", 0.5, 168, 3600);
  window.addEventListener("resize", () => renderSheet());
}
let extraRow = 12;
function addRow() {
  if (extraRow >= TITLES.length) { $("#btnAddRow").disabled = true; return; }
  extraRow++; state.dirty = true;
  sheet.push({ row: extraRow + 1, A: String(extraRow), B: TITLES[extraRow - 1], C: EST[extraRow - 1], E: "" });
  commit(`sheets: admin typed task ${extraRow} into row ${extraRow + 1} (bot picks it up on its next read)`);
  renderSheet(); renderHud();
  const w = $("#sheetWrap"); w.scrollTo({ top: w.scrollHeight, behavior: RM ? "auto" : "smooth" });
  if (extraRow >= TITLES.length) $("#btnAddRow").disabled = true;
}

/* ======================= autoplay tour ======================= */
let tour = null;
function caption(i, n, text) { const c = $("#tourCap"); c.hidden = false; c.innerHTML = `<b>TOUR ${i}/${n}</b>${emo(esc(text))}`; }
async function typeInto(sel, text) { const i = $(sel); if (!i) return; i.value = ""; for (const ch of text) { if (!tour) return; i.value += ch; i.dispatchEvent(new Event("input", { bubbles: true })); await sleep(RM ? 0 : 55); } }
async function waitFor(fn, ms = 9000) { const t0 = performance.now(); while (tour && !fn() && performance.now() - t0 < ms) await sleep(100); }
function toggleTour() {
  if (tour) { tour = null; endTour(); return; }
  if (state.dirty) { try { sessionStorage.setItem("grindbot:tour", "1"); location.reload(); return; } catch (e) { /* storage off: tour on current state */ } }
  startTour();
}
function endTour() { $("#btnTour").classList.remove("on"); $("#btnTour").lastChild.textContent = "Autoplay tour"; setTimeout(() => { if (!tour) $("#tourCap").hidden = true; }, 2500); }
async function startTour() {
  const me = tour = {};
  $("#btnTour").classList.add("on"); $("#btnTour").lastChild.textContent = "Stop tour";
  const N = 7, alive = () => tour === me;
  try {
    caption(1, N, "A member with thin Reddit history tries to verify…");
    goChannel("verify"); await sleep(700); await typeInto("#inUser", "late_lurker"); await sleep(300);
    if (!alive()) return; await verify("late_lurker"); await sleep(2200);
    caption(2, N, "…refused: 903 total clears 800, but 141 comment karma doesn't clear 500. Now a real grinder.");
    await typeInto("#inUser", "GrindMaster2000"); await sleep(300);
    if (!alive()) return; await verify("GrindMaster2000"); await sleep(2200);
    if (!alive()) return;
    caption(3, N, "Admin seat: /create_task number_of_tasks:5. The bot reads the sheet and posts the ping.");
    goChannel("tasks"); await sleep(700); await typeInto("#inN", "5"); await sleep(400);
    if (!alive()) return; createTask("5");
    await waitFor(() => run && run.win && run.win.live); await sleep(1800);
    if (!alive()) return;
    caption(4, N, "React ✅ first: DM with the task number, your name lands in column E, 🔴・Task Holder applied.");
    const ping = state.msgs.tasks.find((m) => m.kind === "ping" && m.win && m.win.live);
    if (ping && !ping.reactions.has("you")) react(ping, YOU);
    await waitFor(() => state.steps[3], 4000); await sleep(2600);
    if (!alive()) return;
    caption(5, N, "Rush: eight members hit ✅ in under a second. Rows go out top-down; nobody gets two.");
    await rush(); await sleep(2600);
    if (!alive()) return;
    caption(6, N, "Two hours later the sweeper drops 🔴・Task Holder on its own.");
    await sleep(1200); await fastForward(); await sleep(2400);
    if (!alive()) return;
    caption(7, N, "Check #logs for the bot's audit trail, or open the API-call log in the DEMO strip.");
    goChannel("logs"); await sleep(3000);
  } finally { if (tour === me) { tour = null; endTour(); } }
}

/* ======================= boot ======================= */
function init() {
  document.querySelectorAll(".steps i, .dc-lock .pill").forEach((el) => (el.innerHTML = emo(el.innerHTML)));
  gate.thresholds();
  wire();
  renderAll(); renderCompose();
  setInterval(() => { renderTimers(); if (vnow() - lastSweep >= 30) sweep(); }, 1000);
  let auto = false; try { auto = sessionStorage.getItem("grindbot:tour") === "1"; sessionStorage.removeItem("grindbot:tour"); } catch (e) {}
  if (auto) setTimeout(startTour, 600);
  store.set("seen", "1");
}
init();
})();
