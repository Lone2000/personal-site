/* BrandVoice demo console. All decisions go through the ported guardrails in guardrails.js;
 * this file only renders state and logs what the CLI and the Reddit API calls would look like. */
(() => {
  "use strict";
  const { CONFIG, SUBS, THREADS, FILTERED, FOLLOW_UP, START, H } = window.BV_DATA;
  const KEY = "brandvoice-demo:v1", HINT_KEY = "brandvoice-demo:hint";
  const UNDECLARED = "acme_social_test";
  const DECLARED = CONFIG.brand.account;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const commit = (detail) => window.dispatchEvent(new CustomEvent("demo:commit", { detail }));
  const brand = new BV.Brand(CONFIG.brand);
  const FOOTER = BV.disclosure.footer(brand);

  let S = null;      // UI + clock state
  let store = null;  // BV.Store: clearance, threads, drafts, published, audit
  let renderedLog = 0;

  // ------------------------------------------------------------------ time
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const p2 = (n) => String(n).padStart(2, "0");
  const hhmm = (ms) => { const d = new Date(ms); return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`; };
  const fmtClock = (ms) => { const d = new Date(ms); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} · ${hhmm(ms)} UTC`; };
  const fmtWhen = (ms) => { const sameDay = new Date(ms).getUTCDate() === new Date(S.clock).getUTCDate(); return sameDay ? `${hhmm(ms)} UTC` : fmtClock(ms); };
  const ago = (sec) => { const h = Math.round(sec / 3600); return h < 1 ? "just now" : `${h}h ago`; };

  // ---------------------------------------------------------------- config
  const env = () => ({ REDDIT_USERNAME: S.undeclared ? UNDECLARED : DECLARED });
  const loadCfg = () => BV.loadConfig(CONFIG, env());
  const declaredCfg = () => BV.loadConfig(CONFIG, {});
  const configError = () => { try { loadCfg(); return null; } catch (e) { return e.message; } };
  const sim = () => new BV.SimReddit({ meName: S.undeclared ? UNDECLARED : DECLARED, threads: store.threads, onCall: logHttp });

  // ------------------------------------------------------------------ seed
  function seed() {
    S = { v: 1, clock: START - 2 * H * 1000, undeclared: false, selected: null, log: [], done: {}, outcomes: {},
      work: {}, taped: {}, editing: false, skipping: false, lastCmd: null, scan: null, tab: "log" };
    store = new BV.Store(() => S.clock);
    const cfg = declaredCfg();

    for (const s of CONFIG.subreddits) {
      const [verdict, notes] = BV.rules.scanText(BV.rules.ruleText(SUBS[s.name]));
      store.recordRuleScan(s.name, verdict, notes);
    }
    for (const [name, sub] of Object.entries(SUBS)) {
      if (sub.permission) store.grantPermission(name, sub.permission.evidence, sub.permission.note);
    }

    const nowSec = START / 1000;
    const kept = [], filtered = [];
    for (const t of THREADS) {
      const post = { id: t.reddit_id, title: t.title, selftext: t.body, num_comments: t.num_comments, created_utc: nowSec - t.age * H };
      const f = BV.discovery.filter(post, cfg.thread_filter, cfg.topicsFor(t.subreddit), nowSec);
      if (!f.keep) { console.warn("sample thread would be filtered:", t.title, f.reason); continue; }
      kept.push(t.reddit_id);
      store.saveThread({ reddit_id: t.reddit_id, subreddit: t.subreddit, title: t.title, body: t.body,
        permalink: `https://www.reddit.com/r/${t.subreddit}/comments/${t.reddit_id}/`, author: t.author,
        num_comments: t.num_comments, created_utc: post.created_utc, matched_topic: f.topic });
    }
    for (const p of FILTERED) {
      const post = { id: p.id, title: p.title, selftext: p.selftext, link_flair_text: p.flair, num_comments: p.num_comments, created_utc: nowSec - p.age * H };
      const f = BV.discovery.filter(post, cfg.thread_filter, cfg.topicsFor(p.sub), nowSec);
      filtered.push({ sub: p.sub, title: p.title, reason: f.keep ? "kept" : f.reason });
    }
    store.log("scan", "", `${kept.length} new threads`);
    S.scan = { kept: kept.length, filtered };

    for (const t of THREADS) {
      if (!store.threads[t.reddit_id]) continue;
      if (t.declined) {
        store.setThreadState(t.reddit_id, "skipped");
        store.log("skip_thread", t.reddit_id, "drafter declined");
        continue;
      }
      store.saveDraft(t.reddit_id, BV.disclosure.attach(t.draft, brand), FOOTER, t.recommends_own_product, "pre-written sample");
    }
    S.clock = START;
    S.selected = "d:1";

    const L = (k, t) => S.log.push({ k, t });
    L("cmd", "python main.py status");
    L("out", `${brand.name} — posting as u/${brand.account}`);
    L("ftr", FOOTER);
    L("cmd", "python main.py check-rules");
    for (const s of CONFIG.subreddits) {
      const row = store.clearance(s.name); const [ok, why] = store.isCleared(s.name);
      const short = ok ? "yes" : row.rule_scan === "blocked" ? "no, rules forbid it" : "no mod permission yet";
      L(row.rule_scan === "blocked" ? "err" : ok ? "ok" : "warn", `  r/${s.name.padEnd(19)} ${row.rule_scan.padEnd(8)} ${short}`);
    }
    L("dim", "  A passing scan is not permission. Ask the mods, then record their answer.");
    L("cmd", "python main.py scan");
    L("out", `  ${kept.length} new threads · ${filtered.length} left out by thread_filter`);
    L("cmd", "python main.py draft");
    L("out", `  ${store.drafts.length} draft(s) ready · 1 declined by the drafter`);
    L("dim", "# demo note: the real scan and drafter skip communities that aren't cleared. Drafts from those communities are included here so you can watch the publisher's own re-check refuse them.");
  }

  // --------------------------------------------------------------- persist
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ S, store: store.toJSON() })); } catch (e) { /* storage unavailable */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY); if (!raw) return false;
      const d = JSON.parse(raw); if (!d || !d.S || d.S.v !== 1) return false;
      S = d.S; S.editing = false; S.skipping = false;
      store = new BV.Store(() => S.clock, d.store);
      return true;
    } catch (e) { return false; }
  }

  // ------------------------------------------------------------------- log
  function log(k, t) { S.log.push({ k, t }); if (S.log.length > 400) S.log.splice(0, S.log.length - 400); }
  function cmd(c) { log("cmd", c); S.lastCmd = c; }
  function reviewCmd() { if (S.lastCmd !== "python main.py review") cmd("python main.py review"); }
  function logHttp(call) {
    if (call.path === "/api/v1/me") {
      log("http", "GET  https://oauth.reddit.com/api/v1/me");
      log("dim", `     User-Agent: ${BV.userAgent(call.res.name === DECLARED ? DECLARED : call.res.name, brand)}`);
      log("dim", `  ← 200 {"name": "${call.res.name}"}`);
    } else if (call.path === "/api/comment") {
      log("http", "POST https://oauth.reddit.com/api/comment");
      log("dim", "     Authorization: bearer •••••••• (the brand's one script app)");
      log("body", `api_type=json\nthing_id=${call.form.thing_id}\ntext=`);
      const lines = call.form.text.split("\n");
      lines.forEach((ln) => log(ln === FOOTER ? "ftr" : "body", ln || " "));
      log("dim", `  ← 200 {"id": "${call.res.id}", "permalink": "${call.res.permalink}"}`);
    }
  }

  // ---------------------------------------------------------------- helpers
  const curKey = () => S.selected || "d:1";
  const curDraft = () => { const k = curKey(); return k.startsWith("d:") ? store.draft(Number(k.slice(2))) : null; };
  const currentBody = (d) => (S.editing && S.selected === `d:${d.id}` && $("#editor")) ? $("#editor").value
    : (d.state === "approved" || d.state === "published") ? (d.edited_body || d.body) : (S.work[d.id] ?? d.body);
  function toast(msg, ms = 2600) {
    const t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms);
  }
  function outcome(id, o) { S.outcomes[id] = Object.assign({ fresh: true }, o); }

  /** Every command first loads config.yaml + .env, exactly like main.py does. */
  function withConfig(command, fn) {
    if (!(command === "review" && S.lastCmd === "python main.py review")) cmd(`python main.py ${command}`);
    let cfg;
    try { cfg = loadCfg(); } catch (e) {
      log("err", `Config error: ${e.message}`);
      commit(`refused: ${command.split(" ")[0]} — REDDIT_USERNAME is not the declared brand.account`);
      const d = curDraft();
      if (d) outcome(d.id, { kind: "bad", head: "Refused: undeclared account", stamp: "REFUSED",
        msg: `Config error: ${e.message}`, fix: [{ act: "declare", label: "switch back to u/" + DECLARED }] });
      toast("Refused: BrandVoice won't run under an undeclared account.");
      return null;
    }
    return fn(cfg);
  }

  // --------------------------------------------------------------- actions
  function approve() {
    const d = curDraft(); if (!d) return;
    if (d.state !== "pending") { toast(d.state === "skipped" ? "Skipped drafts are out of review." : "Already approved. Post it with p."); return; }
    withConfig("review", (cfg) => {
      S.lastCmd = "python main.py review";
      const body = currentBody(d);
      log("dim", `  Draft ${d.id} — r/${store.threads[d.thread_id].subreddit}`);
      log("out", "  > a");
      const r = BV.review.approve(cfg, store, d, body);
      if (!r.ok) {
        log("err", `  ${r.reason}`);
        log("dim", "  Edit the draft to restore it, or skip.");
        outcome(d.id, { kind: "bad", head: "Can't approve", stamp: "REFUSED", msg: r.reason,
          fix: [{ act: "save", label: "save the edit (e): footer goes back on" }] });
        commit(`review: draft ${d.id} approve refused — disclosure footer missing`);
        return;
      }
      S.editing = false; delete S.work[d.id];
      log("ok", `  approved${r.action === "approved_with_edit" ? " (with your edit)" : ""}`);
      outcome(d.id, { kind: "ok", head: "Approved", stamp: "APPROVED",
        msg: "Recorded in the audit trail as " + r.action + ". Nothing is posted yet: publish re-checks every gate.",
        fix: [{ act: "post", label: "post it (p)" }] });
      commit(`review: draft ${d.id} ${r.action}`);
    });
  }

  function startEdit() {
    const d = curDraft(); if (!d) return;
    if (d.state !== "pending") { toast("Only drafts still in review can be edited."); return; }
    if (configError()) { withConfig("review", () => {}); render(); return; }
    S.editing = true; S.skipping = false;
    render();
    const ed = $("#editor"); if (ed) { ed.focus(); ed.setSelectionRange(ed.value.length, ed.value.length); }
  }

  function saveEdit() {
    const d = curDraft(); if (!d || !S.editing) return;
    const text = $("#editor").value;
    withConfig("review", (cfg) => {
      S.lastCmd = "python main.py review";
      log("out", "  > e   ($EDITOR closed)");
      const before = S.work[d.id] ?? d.body;
      const r = BV.review.edit(cfg, before, text);
      S.work[d.id] = r.body; S.editing = false;
      if (r.reattached) {
        S.taped[d.id] = true; S.flash = d.id; S.done.footer = true;
        log("warn", "  disclosure footer was missing after the edit: re-attached by disclosure.attach()");
        log("ftr", "  " + FOOTER);
        outcome(d.id, { kind: "warn", head: "Footer re-attached", msg: "Your edit dropped the disclosure line. review.py puts it back on every save, so the reviewer can't remove it by accident.",
          fix: [{ act: "approve", label: "approve (a)" }] });
        commit(`review: footer re-attached to draft ${d.id} after edit`);
      } else {
        log("ok", "  edit saved · footer intact");
        outcome(d.id, { kind: "ok", head: "Edit saved", msg: "Footer still intact.", fix: [{ act: "approve", label: "approve (a)" }] });
      }
    });
    render();
  }

  function cancelEdit() { S.editing = false; render(); }

  function startSkip() {
    const d = curDraft(); if (!d) return;
    if (d.state !== "pending") { toast("Only drafts still in review can be skipped."); return; }
    if (configError()) { withConfig("review", () => {}); render(); return; }
    S.skipping = true; S.editing = false; render();
    const i = $("#skipReason"); if (i) i.focus();
  }
  function confirmSkip() {
    const d = curDraft(); if (!d) return;
    const reason = ($("#skipReason") || {}).value || "";
    withConfig("review", (cfg) => {
      S.lastCmd = "python main.py review";
      log("out", "  > s");
      BV.review.skip(store, d, reason);
      log("warn", `  reason (optional): ${reason || ""}`);
      log("warn", "  skipped");
      outcome(d.id, { kind: "warn", head: "Skipped", stamp: "SKIPPED", msg: `Kept in the audit trail with the reason: “${d.skip_reason}”.` });
      commit(`review: draft ${d.id} skipped — ${d.skip_reason}`);
    });
    S.skipping = false; render();
  }

  function post() {
    const d = curDraft(); if (!d) return;
    if (S.editing) { toast("Save or cancel the edit first."); return; }
    if (d.state === "published") { toast("Already posted. Add a follow-up draft to test the once-per-thread rule."); return; }
    withConfig("publish", (cfg) => {
      let reddit;
      try { reddit = BV.connect(cfg, sim()); } catch (e) {
        log("err", e.message);
        outcome(d.id, { kind: "bad", head: "Refused", stamp: "REFUSED", msg: e.message });
        commit("refused: authenticated account is not the declared one"); return;
      }
      if (d.state !== "approved") {
        log("dim", "Nothing approved and waiting.");
        outcome(d.id, { kind: "warn", head: "Not approved", msg: d.state === "skipped" ? "This draft was skipped in review, so publish never sees it." : "publish only sends drafts a human approved in review. There is no other way in.",
          fix: d.state === "pending" ? [{ act: "approve", label: "approve (a)" }] : [] });
        return;
      }
      const res = BV.publishOne(cfg, reddit, store, d.id);
      if (res.published.length) {
        const link = res.published[0].permalink;
        log("ok", `posted ${link}`);
        outcome(d.id, { kind: "ok", head: "Posted", stamp: "POSTED", msg: `As u/${brand.account} at ${fmtWhen(S.clock)}, with the disclosure footer. Pace in effect: ${cfg.rate_limits.asRecord()}.` });
        commit(`reddit: POST /api/comment thing_id=t3_${d.thread_id} as u/${brand.account}`);
        S.done.post = true;
      } else if (res.stopped) {
        const next = BV.nextAllowed(cfg, store);
        log("warn", `stopped: ${res.stopped}`);
        if (next) log("dim", `# next reply allowed at ${fmtWhen(next)}`);
        outcome(d.id, { kind: "bad", head: "Refused: pace limit", stamp: "REFUSED",
          msg: `stopped: ${res.stopped}. Next reply allowed at ${next ? fmtWhen(next) : "—"}${next ? ` (in ${Math.ceil((next - S.clock) / 60000)} min)` : ""}.`,
          fix: [{ act: "ff", label: "fast-forward 1h" }] });
        commit(`publish stopped: ${res.stopped}`);
        S.done.paceSeen = true;
      } else if (res.blocked.length) {
        const why = res.blocked[0].reason;
        log("err", `blocked draft ${d.id}: ${why}`);
        const sub = store.threads[d.thread_id].subreddit; const row = store.clearance(sub);
        const fix = [];
        if (/not cleared/.test(why) && row && row.rule_scan !== "blocked" && row.permission !== "granted") fix.push({ act: "perm", sub, label: `record mod permission for r/${sub}` });
        if (/disclosure/.test(why)) fix.push({ act: "edit", label: "edit (e)" });
        outcome(d.id, { kind: "bad", head: why === "already replied in this thread" ? "Refused: once per thread" : "Refused", stamp: "REFUSED",
          msg: `blocked draft ${d.id}: ${why}`, note: row && row.rule_scan === "blocked" && /not cleared/.test(why) ? "A posted rule outranks a recorded permission: this community stays closed until its mods change the rule." : "", fix });
        commit(`publish blocked: draft ${d.id} — ${why}`);
      }
    });
  }

  function recordPermission(sub) {
    const info = SUBS[sub].modmail || SUBS[sub].permission;
    withConfig(`grant-permission ${sub} --evidence ${info.evidence} --note "${info.note}"`, () => {
      const r = BV.grantPermissionCmd(store, sub, info.evidence, info.note);
      r.lines.forEach((l, i) => log(r.ok ? (i ? "dim" : "ok") : (i ? "dim" : "err"), l));
      if (r.ok) {
        commit(`grant-permission r/${sub} · evidence ${info.evidence.split("/").pop()} (modmail)`);
        toast(`Permission recorded for r/${sub}. Evidence: modmail ${info.evidence.split("/").pop()}`);
        if (sub === "HomeImprovementQs") S.done.perm = true;
      } else {
        commit(`grant-permission refused: r/${sub} is blocked by its own rules`);
        toast(`Refused: r/${sub}'s posted rules forbid promotion. Permission can't override them.`, 3600);
        const d = curDraft();
        if (d && store.threads[d.thread_id].subreddit === sub) {
          outcome(d.id, { kind: "bad", head: "Permission refused", stamp: "REFUSED", msg: r.lines.join(" ") });
        }
      }
    });
  }
  function revokePermission(sub) {
    withConfig(`revoke-permission ${sub} --reason "mods asked us to pause"`, () => {
      store.revokePermission(sub, "mods asked us to pause");
      log("warn", `Permission revoked for r/${sub}`);
      commit(`revoke-permission r/${sub}`);
    });
  }
  function checkRules() {
    withConfig("check-rules", (cfg) => {
      try { BV.connect(cfg, sim()); } catch (e) { log("err", e.message); return; }
      log("out", "                 Subreddit rule scan");
      for (const s of CONFIG.subreddits) {
        const text = BV.rules.ruleText(SUBS[s.name]);
        log("http", `GET  https://oauth.reddit.com/r/${s.name}/about/rules  ← 200 (${SUBS[s.name].rules.length} rules)`);
        const [verdict, notes] = BV.rules.scanText(text);
        store.recordRuleScan(s.name, verdict, notes);
        const [ok, why] = store.isCleared(s.name);
        log(verdict === "blocked" ? "err" : ok ? "ok" : "warn", `  r/${s.name.padEnd(19)} ${verdict.padEnd(8)} ${ok ? "yes" : "no — " + why}`);
      }
      log("dim", "A passing scan is not permission. Ask the mods, then record their answer with:\n  python main.py grant-permission <sub> --evidence <modmail url>");
      commit(`check-rules: ${CONFIG.subreddits.length} subreddits scanned`);
    });
  }
  function fastForward() {
    S.clock += 3600e3;
    log("dim", `# demo clock → ${fmtClock(S.clock)}`);
    if (S.done.paceSeen) S.done.pace = true;
  }
  function addFollowUp() {
    const d = curDraft(); if (!d) return;
    withConfig("draft", () => {
      log("dim", "# drafter.draft_pending() skips threads already replied to. This follow-up is added by hand so you can watch publish refuse it too.");
      const id = store.saveDraft(d.thread_id, BV.disclosure.attach(FOLLOW_UP, brand), FOOTER, false, "hand-written follow-up");
      log("ok", "1 draft(s) ready.");
      S.selected = `d:${id}`;
      outcome(id, { kind: "warn", head: "Follow-up drafted", msg: "Same thread as a reply we already posted. Approve it and try to post." , fix: [{ act: "approve", label: "approve (a)" }] });
    });
  }
  function approveAll() {
    cmd("python main.py review --approve-all");
    log("err", "usage: brandvoice [-h] [--config CONFIG] [-v] {init-db,check-rules,grant-permission,revoke-permission,scan,draft,review,publish,status,export-audit} ...");
    log("err", "brandvoice: error: unrecognized arguments: --approve-all");
    log("dim", "# review.py has no bulk path and no --yes. Without an interactive terminal it refuses to run at all.");
    toast("There is no approve-all. One draft, one human decision.");
    commit("refused: review --approve-all (no such flag)");
  }
  function setUndeclared(on) {
    S.undeclared = on;
    if (on) {
      log("dim", `# .env now logs in as REDDIT_USERNAME=${UNDECLARED}`);
      cmd("python main.py status");
      log("err", `Config error: ${configError()}`);
      commit("refused: config — REDDIT_USERNAME does not match brand.account");
    } else {
      log("dim", `# .env restored: REDDIT_USERNAME=${DECLARED}`);
      cmd("python main.py status");
      log("out", `${brand.name} — posting as u/${brand.account}`);
    }
  }

  const ACTIONS = {
    approve, post, edit: startEdit, save: saveEdit, cancel: cancelEdit, skip: startSkip, skipok: confirmSkip,
    skipcancel: () => { S.skipping = false; }, ff: fastForward, followup: addFollowUp, approveall: approveAll,
    declare: () => { $("#undeclared").checked = false; setUndeclared(false); },
  };
  function run(act, el) {
    if (act === "perm") recordPermission(el.dataset.sub);
    else if (act === "revoke") revokePermission(el.dataset.sub);
    else if (ACTIONS[act]) ACTIONS[act]();
    if (act !== "edit" && act !== "save" && act !== "cancel" && act !== "skip") render();
    save();
  }

  // ---------------------------------------------------------------- render
  function scanChip(row) {
    if (!row) return `<span class="g bad">rules ?</span>`;
    return row.rule_scan === "pass" ? `<span class="g ok">rules ✓</span>`
      : row.rule_scan === "blocked" ? `<span class="g bad">rules ✗</span>` : `<span class="g warn">rules ?</span>`;
  }
  const modChip = (row) => row && row.permission === "granted" ? `<span class="g ok">mod ✓</span>` : `<span class="g bad">mod ✗</span>`;

  function renderQueue() {
    const items = [];
    const seenThread = {};
    store.drafts.forEach((d) => {
      const t = store.threads[d.thread_id]; const row = store.clearance(t.subreddit);
      const follow = seenThread[d.thread_id]; seenThread[d.thread_id] = true;
      const key = `d:${d.id}`;
      items.push(`<li><button type="button" class="qitem ${S.selected === key ? "active" : ""} ${d.state === "skipped" ? "dimmed" : ""}" data-key="${key}" aria-current="${S.selected === key}">
        <span class="qsub">r/${esc(t.subreddit)}${follow ? " · follow-up" : ""}</span>
        <span class="qstate ${d.state}">${d.state}</span>
        <span class="qtitle">${esc(t.title)}</span>
        <span class="qgates">${scanChip(row)}${modChip(row)}${store.hasRepliedTo(d.thread_id) && d.state !== "published" ? `<span class="g bad">replied</span>` : ""}</span>
      </button></li>`);
    });
    Object.values(store.threads).filter((t) => t.state === "skipped").forEach((t) => {
      const key = `t:${t.reddit_id}`;
      items.push(`<li><button type="button" class="qitem dimmed ${S.selected === key ? "active" : ""}" data-key="${key}">
        <span class="qsub">r/${esc(t.subreddit)}</span><span class="qstate declined">declined</span>
        <span class="qtitle">${esc(t.title)}</span><span class="qgates"><span class="g warn">drafter declined</span></span></button></li>`);
    });
    $("#queue").innerHTML = items.join("");
    const c = store.counts();
    $("#queueSub").textContent = `${c.pending_review} pending · ${c.approved} approved · ${c.published} posted · ${c.skipped} skipped`;
    const f = $("#filtered");
    f.querySelector("summary").textContent = `scan kept ${S.scan.kept} · left out ${S.scan.filtered.length} (why)`;
    f.querySelector("ul").innerHTML = S.scan.filtered.map((p) => `<li><span>${esc(p.title)}</span>r/${esc(p.sub)} · ${esc(p.reason)}</li>`).join("");
  }

  function highlightRules(text) {
    const spans = BV.rules.spans(text); let out = "", i = 0;
    for (const s of spans) {
      if (s.start < i) continue;
      out += esc(text.slice(i, s.start)) + `<mark class="${s.kind}" title="${esc(s.p)}">${esc(text.slice(s.start, s.end))}</mark>`;
      i = s.end;
    }
    return out + esc(text.slice(i));
  }

  function renderSubs() {
    $("#subs").innerHTML = CONFIG.subreddits.map(({ name }) => {
      const row = store.clearance(name); const [ok, why] = store.isCleared(name);
      const scan = row ? row.rule_scan : "none";
      const scanG = scan === "pass" ? `<span class="g ok">rule scan ✓ pass</span>` : scan === "blocked" ? `<span class="g bad">rule scan ✗ blocked</span>` : `<span class="g warn">rule scan ? unclear</span>`;
      const permG = row && row.permission === "granted" ? `<span class="g ok">mod permission ✓</span>` : `<span class="g bad">mod permission ✗</span>`;
      const ev = row && row.permission === "granted" && row.evidence_url ? `<p class="evidence">evidence: ${esc(row.evidence_url)}</p>` : "";
      const act = row && row.permission === "granted"
        ? `<button class="btn small ghost" type="button" data-act="revoke" data-sub="${name}">revoke</button>`
        : `<button class="btn small" type="button" data-act="perm" data-sub="${name}">record permission</button>`;
      return `<div class="subcard" data-sub="${name}">
        <div class="subhead"><b>r/${name}</b><span class="cleared ${ok ? "yes" : "no"}">${ok ? "cleared" : "not cleared"}</span></div>
        <div class="gaterow">${scanG}${permG}</div>
        <p class="subnote">${ok ? "both gates pass · re-checked at publish" : esc(why)}</p>${ev}
        <div class="subacts">${act}
          <details class="rules"><summary>posted rules</summary><div class="rules-text">${highlightRules(BV.rules.ruleText(SUBS[name]))}</div><p class="subnote">${esc(row ? row.rule_notes : "")}</p></details>
        </div></div>`;
    }).join("");
  }

  function replyHtml(d, body) {
    const trimmed = body.replace(/\s+$/u, "");
    const paras = (s) => s.split(/\n{2,}/).filter((x) => x.trim()).map((x) => `<p>${esc(x).replace(/\n/g, "<br>")}</p>`).join("");
    if (trimmed.endsWith(FOOTER)) {
      const main = trimmed.slice(0, -FOOTER.length);
      const taped = S.taped[d.id], fresh = S.flash === d.id;
      return paras(main) + `<div class="footer-wrap ${taped ? "taped" : ""} ${fresh && !reduced ? "retaped" : ""}"><span class="tape l"></span><span class="footer-line">${esc(FOOTER)}</span><span class="tape r"></span></div>` +
        (taped ? `<span class="scrawl">edit deleted the footer? it went right back on.</span>` : "");
    }
    return paras(trimmed) + `<span class="missing-footer">✗ no disclosure footer at the end of this text</span>`;
  }

  function gatesHtml(d, body) {
    const cfgErr = configError();
    const cfg = declaredCfg();
    const t = store.threads[d.thread_id];
    const rows = [];
    rows.push({ label: "declared account", ok: !cfgErr,
      detail: cfgErr ? `${cfgErr} (connect() would refuse too: “Authenticated as u/${UNDECLARED} but config.yaml declares u/${DECLARED}.”)` : `logged in as u/${DECLARED}, the brand.account in config.yaml` });
    rows.push({ label: "approved by a human", ok: d.state === "approved", wait: d.state === "pending",
      detail: d.state === "approved" ? `${d.reviewer_action} at ${fmtWhen(d.reviewed_at)}` : d.state === "pending" ? "waiting for your a · review has no approve-all" : `skipped: ${d.skip_reason}` });
    const [pOk, pWhy] = BV.checkPace(cfg, store);
    const next = pOk ? null : BV.nextAllowed(cfg, store);
    rows.push({ label: "pace · 1/hour · 4/day · 30 min gap", ok: pOk,
      detail: pOk ? `within limits · this hour ${store.publishedSince(1)}/1 · today ${store.publishedSince(24)}/4` : `${pWhy} · next allowed ${next ? fmtWhen(next) : "—"}`,
      btn: pOk ? "" : `<button class="btn small" type="button" data-act="ff">fast-forward 1h</button>` });
    const [vOk, vWhy] = BV.disclosure.verify(body, brand);
    rows.push({ label: "disclosure footer", ok: vOk, detail: vOk ? "footer present and names Acme Water" : vWhy });
    const row = store.clearance(t.subreddit); const [cOk, cWhy] = store.isCleared(t.subreddit);
    rows.push({ label: `r/${t.subreddit} cleared`, ok: cOk,
      detail: `rule scan: ${row ? row.rule_scan : "none"} · mod permission: ${row ? row.permission : "none"}${cOk ? "" : " · " + cWhy}`,
      btn: !cOk && row && row.rule_scan !== "blocked" && row.permission !== "granted" ? `<button class="btn small" type="button" data-act="perm" data-sub="${t.subreddit}">record mod permission</button>` : "" });
    const replied = store.hasRepliedTo(d.thread_id);
    rows.push({ label: "once per thread", ok: !replied, detail: replied ? "already replied in this thread" : "no reply from us in this thread yet" });
    rows.push({ label: "thread still open", ok: !t.locked && !t.archived, detail: "not locked or archived" });
    // publisher order: account (connect) → approved → pace → disclosure → cleared → thread → open
    const first = rows.findIndex((r) => !r.ok);
    return `<div class="gates"><h3>publish gates · all re-checked at publish time</h3><ol>${rows.map((r, i) =>
      `<li class="${r.ok ? "ok" : r.wait ? "wait" : "bad"} ${i === first ? "first" : ""}"><span class="mk">${r.ok ? "✓" : r.wait ? "…" : "✗"}</span>
        <span class="gl">${esc(r.label)}${i === first ? ` <span style="color:var(--red);font-weight:400">← publish stops here</span>` : ""}</span>
        <span class="gd">${esc(r.detail)}${r.btn ? "<br>" + r.btn : ""}</span></li>`).join("")}</ol></div>`;
  }

  function outcomeHtml(id) {
    const o = S.outcomes[id]; if (!o) return "";
    const fix = (o.fix || []).map((f) => `<button class="btn small ${f.act === "post" || f.act === "approve" ? "green" : ""}" type="button" data-act="${f.act}" ${f.sub ? `data-sub="${f.sub}"` : ""}>${esc(f.label)}</button>`).join("");
    return `<div class="outcome ${o.kind}" role="status"><span class="head">${esc(o.head)}</span><code>${esc(o.msg)}</code>${o.note ? `<span>${esc(o.note)}</span>` : ""}${fix ? `<div class="fix">${fix}</div>` : ""}</div>`;
  }

  function renderReview() {
    const el = $("#review");
    const key = curKey();
    if (key.startsWith("t:")) {
      const t = store.threads[key.slice(2)]; const src = THREADS.find((x) => x.reddit_id === t.reddit_id);
      el.innerHTML = `<div class="rrule"><span>Declined — r/${esc(t.subreddit)}</span></div>
        <div class="rpanel cyan"><span class="pt">thread</span><h3 class="thread-title">${esc(t.title)}</h3><p class="thread-meta">u/${esc(t.author)} · ${ago(S.clock / 1000 - t.created_utc)} · ${t.num_comments} comments</p></div>
        <div class="rpanel dim"><span class="pt">what they asked</span><p class="asked">${esc(t.body)}</p></div>
        <div class="rpanel red"><span class="pt">drafter declined</span><p class="asked">${esc(src ? src.declined : "")}</p></div>
        <p class="flags"><span class="dim">“A skipped thread costs nothing; a wrong or empty answer from a company account costs trust.” — drafter.py</span></p>`;
      return;
    }
    const d = curDraft(); if (!d) { el.innerHTML = ""; return; }
    const t = store.threads[d.thread_id];
    const idx = store.drafts.findIndex((x) => x.id === d.id) + 1;
    const body = currentBody(d);
    const o = S.outcomes[d.id];
    const stampTxt = o && o.stamp === "REFUSED" ? "REFUSED" : d.state === "published" ? "POSTED" : d.state === "approved" ? "APPROVED" : d.state === "skipped" ? "SKIPPED" : "";
    const stampCls = stampTxt === "REFUSED" ? "red" : stampTxt === "SKIPPED" ? "grey" : "green";
    const fresh = o && o.fresh;
    const words = body.split(/\s+/).filter(Boolean).length;
    const [vOk] = BV.disclosure.verify(body, brand);
    const pending = d.state === "pending";
    const pulse = pending && !S.done.post && d.id === 1 && !S.editing;

    let reply;
    if (S.editing) {
      reply = `<textarea class="editor" id="editor" aria-label="edit the draft" spellcheck="false">${esc(body)}</textarea>
        <p class="edit-tip">This is what $EDITOR would open. Try deleting the footer line, then save.</p>`;
    } else reply = `<div class="reply">${replyHtml(d, body)}</div>`;

    const dis = (on) => (on ? "" : ` aria-disabled="true"`);
    let actions;
    if (S.editing) {
      actions = `<button class="btn green" type="button" data-act="save"><kbd>e</kbd> save edit</button>
        <button class="btn" type="button" data-act="cancel">cancel</button>
        <button class="btn" type="button" data-act="approve"><kbd>a</kbd> approve as shown</button>`;
    } else if (d.state === "published") {
      actions = `<button class="btn" type="button" data-act="followup">add a follow-up draft in this thread</button>`;
    } else {
      actions = `<button class="btn ${pending ? "green" : ""} ${pulse ? "pulse" : ""}" type="button" data-act="approve"${dis(pending)}><kbd>a</kbd> approve</button>
        <button class="btn" type="button" data-act="edit"${dis(pending)}><kbd>e</kbd> edit</button>
        <button class="btn" type="button" data-act="skip"${dis(pending)}><kbd>s</kbd> skip</button>
        <button class="btn ${d.state === "approved" ? "primary" : ""}" type="button" data-act="post"${dis(d.state !== "skipped")}><kbd>p</kbd> post<span class="long">&nbsp;to Reddit</span></button>
        <span class="spacer"></span>
        <button class="btn small ghost" type="button" data-act="approveall" title="Try it">approve all?</button>`;
    }
    const skipbox = S.skipping ? `<div class="skipbox"><input id="skipReason" placeholder="reason (optional)" aria-label="skip reason"><button class="btn small" type="button" data-act="skipok">skip draft</button><button class="btn small ghost" type="button" data-act="skipcancel">cancel</button></div>` : "";

    let tail;
    if (d.state === "published") {
      const p = store.published.find((x) => x.draft_id === d.id);
      tail = `<div class="posted-rec rpanel green"><span class="pt">published</span>
        <span>at ${fmtWhen(p.published_at)} as u/${esc(p.as_account)} · comment ${esc(p.comment_id)}</span>
        <a href="#" data-noop>${esc(p.permalink)}</a>
        <span class="dim" style="color:var(--muted)">rate limits recorded: ${esc(p.rate_limits)}</span></div>`;
    } else tail = gatesHtml(d, body);

    el.innerHTML = `<div class="rrule"><span>Draft ${idx}/${store.drafts.length} — r/${esc(t.subreddit)}</span></div>
      <div class="rpanel cyan"><span class="pt">thread</span>
        <h3 class="thread-title">${esc(t.title)}</h3>
        <p class="thread-meta">u/${esc(t.author)} · ${ago(S.clock / 1000 - t.created_utc)} · ${t.num_comments} comments · matched topic “${esc(t.matched_topic || "")}”</p>
        <span class="ps">reddit.com/r/${esc(t.subreddit)}/comments/${esc(t.reddit_id)}</span></div>
      <div class="rpanel dim"><span class="pt">what they asked</span><p class="asked">${esc(t.body)}</p></div>
      <div class="rpanel green" style="margin-top:18px"><span class="pt">${S.editing ? "editing · $EDITOR" : "proposed reply"}</span>
        ${stampTxt && !S.editing ? `<span class="stamp ${stampCls} ${fresh && !reduced ? "thump" : ""}">${stampTxt}</span>` : ""}
        ${reply}</div>
      <div class="flags">
        ${d.recommends_own_product ? `<span class="warn">recommends our own product — is that genuinely the answer to what they asked?</span>` : ""}
        <span class="dim">${words} words · ${esc(d.model)} draft (no model is called in this demo)</span>
        <details><summary>what the drafter is told (drafter.py)</summary><pre>${esc(BV.SYSTEM)}</pre></details>
      </div>
      <div class="lockfoot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
        <div><small>disclosure footer · config.yaml · locked</small><div class="ftext">${esc(FOOTER)}</div></div>
        <span class="chip ${vOk ? "ok" : "bad"}">${vOk ? "verified ✓" : "missing ✗"}</span></div>
      <div class="dock"><div class="actions">${actions}</div>${skipbox}
      ${outcomeHtml(d.id)}</div>
      ${tail}`;
    if (o) o.fresh = false;
    S.flash = null;
  }

  function renderTerm() {
    const body = $("#termBody");
    $$(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === S.tab)));
    if (S.tab === "audit") {
      $("#termNote").textContent = "db/brandvoice.db audit trail, as export-audit would write it.";
      const rows = store.exportAudit();
      body.innerHTML = `<table class="audit-table"><thead><tr><th>time (UTC)</th><th>event</th><th>subject</th><th>detail</th></tr></thead><tbody>${rows.map((r) =>
        `<tr><td>${esc(r[0].slice(5, 16).replace("T", " "))}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3].length > 160 ? r[3].slice(0, 160) + "…" : r[3])}</td></tr>`).join("")}</tbody></table>`;
      body.scrollTop = body.scrollHeight; renderedLog = 0; return;
    }
    $("#termNote").textContent = "What BrandVoice would send to the Reddit API. Nothing leaves this page.";
    const start = renderedLog;
    body.innerHTML = S.log.map((l, i) => `<p class="tl ${l.k} ${i >= start && start > 0 ? "fresh" : ""}">${esc(l.t)}</p>`).join("");
    renderedLog = S.log.length;
    body.scrollTop = body.scrollHeight;
  }

  function renderTop() {
    const err = configError();
    $("#whoPill").classList.toggle("bad", !!err);
    $("#whoAcc").textContent = `u/${DECLARED}`;
    $("#undeclared").checked = S.undeclared;
    $("#configError").hidden = !err;
    if (err) $("#configErrorText").textContent = `Config error: ${err} Every command refuses until .env logs in as u/${DECLARED}.`;
    $("#clock").textContent = fmtClock(S.clock);
    const cfg = declaredCfg();
    const h = store.publishedSince(1), d = store.publishedSince(24);
    const next = BV.nextAllowed(cfg, store);
    const meter = (n, max) => `<span class="meter" aria-hidden="true">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</span>`;
    $("#pacePill").innerHTML = `hour ${meter(h, 1)} ${h}/1 · day ${meter(d, 4)} ${d}/4 · next reply: <b>${next === S.clock ? "now" : next ? hhmm(next) : "—"}</b>`;
    $$("#hint li").forEach((li) => li.classList.toggle("done", !!S.done[li.dataset.step]));
  }

  function render() { renderTop(); renderQueue(); renderSubs(); renderReview(); renderTerm(); }

  // ---------------------------------------------------------------- events
  document.addEventListener("click", (e) => {
    const q = e.target.closest(".qitem");
    if (q) {
      S.selected = q.dataset.key; S.editing = false; S.skipping = false;
      render(); save();
      if (window.innerWidth < 760 && !tourOn) $("#review").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      return;
    }
    const a = e.target.closest("[data-act]");
    if (a) { e.preventDefault(); run(a.dataset.act, a); return; }
    if (e.target.closest("[data-noop]")) e.preventDefault();
    const tab = e.target.closest(".tabs button");
    if (tab) { S.tab = tab.dataset.tab; renderedLog = 0; renderTerm(); }
  });
  $("#ffBtn").addEventListener("click", () => { fastForward(); render(); save(); });
  $("#checkRulesBtn").addEventListener("click", () => { checkRules(); render(); save(); });
  $("#undeclared").addEventListener("change", (e) => { setUndeclared(e.target.checked); render(); save(); });
  $("#hintClose").addEventListener("click", () => { $("#hintWrap").hidden = true; try { localStorage.setItem(HINT_KEY, "closed"); } catch (er) { /* ignore */ } });

  document.addEventListener("keydown", (e) => {
    if ($("#testsDlg").open) return;
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "textarea") {
      if (e.key === "Escape") { cancelEdit(); }
      else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveEdit(); save(); }
      return;
    }
    if (tag === "input") {
      if (e.target.id === "skipReason" && e.key === "Enter") { e.preventDefault(); run("skipok"); }
      if (e.target.id === "skipReason" && e.key === "Escape") { S.skipping = false; render(); }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const map = { a: "approve", e: S.editing ? "save" : "edit", s: "skip", p: "post" };
    if (map[k]) { e.preventDefault(); run(map[k]); return; }
    if (k === "j" || k === "k") {
      const keys = $$(".qitem").map((b) => b.dataset.key); const i = keys.indexOf(S.selected);
      const n = keys[Math.min(keys.length - 1, Math.max(0, i + (k === "j" ? 1 : -1)))];
      if (n) { S.selected = n; S.editing = false; S.skipping = false; render(); save(); }
    }
  });

  // ----------------------------------------------------------------- tests
  let testRun = 0;
  function openTests() {
    const dlg = $("#testsDlg");
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
    runTests();
  }
  async function runTests() {
    const my = ++testRun;
    const out = $("#testsBody");
    const t0 = performance.now(); const main = BVTests.run("main"); const ms = performance.now() - t0;
    const t1 = performance.now(); const extra = BVTests.run("extra"); const ms2 = performance.now() - t1;
    out.innerHTML = `<p class="dim">$ python -m pytest test_guardrails.py -v</p>
      <p class="dim">JavaScript port of the suite, running against the ported guardrails in this page.</p>
      <p class="dim">collected ${main.length} items · 2 more tests inspect the Python source files and requirements.txt on disk, so they aren't ported</p><div id="tr1"></div>`;
    const step = reduced ? 0 : 28;
    const line = (r, i, n) => `<div class="tr ${r.ok ? "pass" : "fail"}"><span class="m">${r.ok ? "✓" : "✗"}</span><span class="t"><i>${esc(r.file)}::</i>${esc(r.name)}</span><span class="r">${r.ok ? "PASSED" : "FAILED"} [${String(Math.round(((i + 1) / n) * 100)).padStart(3)}%]</span></div>${r.ok ? "" : `<p class="err">${esc(r.error)}</p>`}`;
    const wait = (ms_) => new Promise((res) => setTimeout(res, ms_));
    const box = $("#tr1");
    for (let i = 0; i < main.length; i++) { if (my !== testRun) return; box.insertAdjacentHTML("beforeend", line(main[i], i, main.length)); if (step) { box.lastElementChild.scrollIntoView({ block: "nearest" }); await wait(step); } }
    const nf = main.filter((r) => !r.ok).length;
    out.insertAdjacentHTML("beforeend", `<p class="sum ${nf ? "fail" : "pass"}" id="testsSummary">${nf ? `${nf} failed, ` : ""}${main.length - nf} passed in ${ms.toFixed(1)}ms</p>
      <h3>extra checks written for this port (publisher, pacing, declared account) · not in the original suite</h3><div id="tr2"></div>`);
    const box2 = $("#tr2");
    for (let i = 0; i < extra.length; i++) { if (my !== testRun) return; box2.insertAdjacentHTML("beforeend", line(extra[i], i, extra.length)); if (step) { box2.lastElementChild.scrollIntoView({ block: "nearest" }); await wait(step); } }
    const nf2 = extra.filter((r) => !r.ok).length;
    out.insertAdjacentHTML("beforeend", `<p class="sum ${nf2 ? "fail" : "pass"}">${nf2 ? `${nf2} failed, ` : ""}${extra.length - nf2} passed in ${ms2.toFixed(1)}ms</p>`);
    out.lastElementChild.scrollIntoView({ block: "nearest" });
  }
  $("#testsBtn").addEventListener("click", openTests);
  $("#testsRerun").addEventListener("click", runTests);
  $("#testsClose").addEventListener("click", () => { testRun++; $("#testsDlg").close(); });

  // ------------------------------------------------------------------ tour
  let tourOn = false, tourId = 0;
  async function tour() {
    const my = ++tourId; tourOn = true;
    const cap = $("#tourCap");
    const wait = (ms) => new Promise((res, rej) => setTimeout(() => (my === tourId ? res() : rej(new Error("stopped"))), reduced ? Math.min(ms, 700) : ms));
    const say = (n, text) => { cap.hidden = false; $("#tourN").textContent = n ? `tour ${n}/9` : "tour"; $("#tourText").textContent = text; };
    const press = async (sel) => {
      await wait(80);
      const el = typeof sel === "string" ? $(sel) : sel;
      if (!el) throw new Error("tour: missing " + sel);
      el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      el.classList.add("tour-focus"); await wait(700); el.classList.remove("tour-focus");
      el.click(); await wait(350);
    };
    try {
      if ($("#testsDlg").open) $("#testsDlg").close();
      seed(); renderedLog = 0; render(); save();
      say(1, "An honest answer with the footer attached. Approve it, then post.");
      await press('.qitem[data-key="d:1"]'); await wait(900);
      await press('#review [data-act="approve"]'); await wait(900);
      await press('#review [data-act="post"]'); await wait(2200);

      say(2, "Same community, straight away. The pace limit says no.");
      await press('.qitem[data-key="d:2"]');
      await press('#review [data-act="approve"]'); await wait(500);
      await press('#review [data-act="post"]'); await wait(2400);
      say(2, "Fast-forward an hour and it goes out.");
      await press("#ffBtn"); await wait(400);
      await press('#review .actions [data-act="post"]'); await wait(2000);

      say(3, "Edit deletes the footer? It goes right back on.");
      await press('.qitem[data-key="d:3"]');
      await press('#review [data-act="edit"]'); await wait(500);
      const ed = $("#editor"); ed.classList.add("tour-focus");
      const target = ed.value.replace(/\s*— I work for Acme Water\.[^\n]*$/u, "");
      const steps = 14;
      for (let i = 1; i <= steps; i++) {
        const len = Math.round(ed.value.length - (ed.value.length - target.length) / (steps - i + 1));
        ed.value = ed.value.slice(0, len); ed.scrollTop = ed.scrollHeight; await wait(70);
      }
      ed.value = target; ed.classList.remove("tour-focus"); await wait(700);
      await press('#review [data-act="save"]'); await wait(2600);

      say(4, "Approve, wait out the hour, post. This community hasn't said yes yet.");
      await press('#review .actions [data-act="approve"]'); await wait(500);
      await press("#ffBtn");
      await press('#review .actions [data-act="post"]'); await wait(2400);
      say(4, "Record the mod's yes (a modmail link as evidence) and try again.");
      await press('#review .outcome [data-act="perm"]'); await wait(800);
      await press('#review .actions [data-act="post"]'); await wait(2200);

      say(5, "A community whose rules forbid promotion stays closed.");
      await press('.qitem[data-key="d:5"]');
      await press('#review [data-act="approve"]'); await wait(400);
      await press("#ffBtn");
      await press('#review .actions [data-act="post"]'); await wait(2200);
      say(5, "Even with a mod's yes on file: a posted rule outranks it.");
      await press('.subcard[data-sub="BuyItForLifeish"] [data-act="perm"]'); await wait(2400);

      say(6, "Never twice in the same thread.");
      await press('.qitem[data-key="d:1"]');
      await press('#review [data-act="followup"]'); await wait(700);
      await press('#review .actions [data-act="approve"]'); await wait(400);
      await press('#review .actions [data-act="post"]'); await wait(2400);

      say(7, "There is no approve-all. One draft, one decision.");
      await press('.qitem[data-key="d:4"]');
      await press('#review [data-act="approveall"]'); await wait(2200);

      say(8, "Log in as an account config.yaml doesn't declare: everything refuses.");
      await press("#undeclared"); await wait(900);
      await press('#review .actions [data-act="approve"]'); await wait(2400);
      await press("#undeclared"); await wait(600);

      say(9, "And the guardrail tests, ported to JavaScript, run right here.");
      await press("#testsBtn"); await wait(reduced ? 900 : 3600);
      testRun++; $("#testsDlg").close();
      say(0, "That's the tour. Everything is still live: try it yourself.");
      $("#review").scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
      await wait(3500);
    } catch (e) {
      if (e.message !== "stopped") console.error(e);
    } finally {
      if (my === tourId) { cap.hidden = true; tourOn = false; }
      $$(".tour-focus").forEach((x) => x.classList.remove("tour-focus"));
    }
  }
  $("#tourBtn").addEventListener("click", () => tour());
  $("#tourStop").addEventListener("click", () => { tourId++; tourOn = false; $("#tourCap").hidden = true; $$(".tour-focus").forEach((x) => x.classList.remove("tour-focus")); });

  // ------------------------------------------------------------------ boot
  if (!load()) seed();
  try { if (localStorage.getItem(HINT_KEY) === "closed") $("#hintWrap").hidden = true; } catch (e) { /* ignore */ }
  render(); save();
  window.bvDemo = { get state() { return S; }, get store() { return store; }, tour, reset() { seed(); renderedLog = 0; render(); save(); } };
})();
