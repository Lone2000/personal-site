/* Page wiring for the VectraView QA Bot demo. */
(function () {
  "use strict";
  const { NorthwindApp, APP_CSS, esc } = window.Northwind;
  const Q = window.QABot;
  const $ = (s, r) => (r || document).querySelector(s);
  const RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LS = {
    get(k) { try { return localStorage.getItem("vvqa." + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem("vvqa." + k, v); } catch (e) { /* storage unavailable */ } },
  };
  const commit = (line) => window.dispatchEvent(new CustomEvent("demo:commit", { detail: line }));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // app css for the live app and for snapshots
  const st = document.createElement("style");
  st.textContent = APP_CSS + "@media (max-width:819px){.nw-in{font-size:16px}}";
  document.head.appendChild(st);

  /* ----------------------------------------------------------- elements */
  const el = {
    narr: $("#narr"), prd: $("#prd"), parse: $("#parseBtn"), addEmail: $("#addEmail"), prdNote: $("#prdNote"),
    nCases: $("#nCases"), sect: $("#sectTable tbody"), cases: $("#cases"), risks: $("#risks"),
    run: $("#runBtn"), fix: $("#fixT"), build: $("#buildTag"), vp: $("#vp"), mount: $("#appMount"),
    shield: $("#shield"), cursor: $("#cursor"), driver: $("#driver"), reload: $("#reloadBtn"),
    log: $("#log"), trState: $("#trState"), reel: $("#reel"), reelN: $("#reelN"),
    report: $("#report"), repSub: $("#repSub"), sT: $("#sT"), sP: $("#sP"), sF: $("#sF"), sB: $("#sB"),
    dl: $("#dlBtn"), ship: $("#shipBtn"), bugsWrap: $("#bugsWrap"), bugs: $("#bugs"), nBugs: $("#nBugs"),
    verdicts: $("#verdicts"), closed: $("#closed"), speed: $("#speed"), tour: $("#tourBtn"),
    lb: $("#lightbox"), lbCap: $("#lbCap"), lbImg: $("#lbImg"), paneB: $("#paneB"),
  };
  const S = { parsed: null, cases: [], report: null, bugs: [], running: false, cancel: false, dirty: false, tour: false, frames: 0, cur: { x: 40, y: 40 } };

  const app = new NorthwindApp(el.mount);
  const fixedSaved = LS.get("fixed") === "1";
  el.fix.checked = fixedSaved;
  app.setFixed(fixedSaved); app.resetFixture();
  const savedSpeed = LS.get("speed");
  if (savedSpeed && Q.SPEED[savedSpeed]) el.speed.value = savedSpeed;
  else if (RM) el.speed.value = "fast";
  const seed = $("#prdSeed").content.textContent.replace(/^\n/, "");
  el.prd.value = LS.get("prd") || seed;
  setBuildTag();

  /* ---------------------------------------------------------- narration */
  let narrTok = 0;
  function narrate(text) {
    const tok = ++narrTok;
    if (RM) { el.narr.textContent = text; return; }
    let i = 0;
    const tick = () => {
      if (tok !== narrTok) return;
      i = Math.min(text.length, i + 2);
      el.narr.innerHTML = esc(text.slice(0, i)) + (i < text.length ? '<span class="caret">▌</span>' : "");
      if (i < text.length) setTimeout(tick, 22);
    };
    tick();
  }

  /* -------------------------------------------------------------- trail */
  const trailBtns = Array.from(document.querySelectorAll(".trail__btn"));
  function setStep(now) {
    const order = ["parse", "run", "report"];
    const idx = order.indexOf(now);
    trailBtns.forEach((b, i) => {
      b.classList.toggle("is-now", i === idx);
      b.classList.toggle("is-done", idx === -1 ? true : i < idx);
    });
    el.parse.classList.toggle("is-glow", now === "parse");
    el.run.classList.toggle("is-glow", now === "run");
  }
  trailBtns.forEach((b) => b.addEventListener("click", () => {
    const go = b.dataset.go;
    if (go === "parse") { doParse(); scrollTo(el.prd.closest(".pane")); }
    if (go === "run") doRun();
    if (go === "report") scrollTo(el.report);
  }));
  function scrollTo(node) { node.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" }); }

  /* --------------------------------------------------------------- tabs */
  const tabs = Array.from(document.querySelectorAll(".tab"));
  function showTab(name) {
    tabs.forEach((t) => { const on = t.dataset.tab === name; t.classList.toggle("is-on", on); t.setAttribute("aria-selected", on); });
    document.querySelectorAll(".tabp").forEach((p) => { p.hidden = p.dataset.panel !== name; });
  }
  tabs.forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));

  /* -------------------------------------------------------------- parse */
  el.prd.addEventListener("input", () => {
    LS.set("prd", el.prd.value);
    if (S.parsed) { S.dirty = true; el.prdNote.textContent = "The PRD changed. Parse it again to rebuild the test cases."; el.prdNote.classList.add("is-warn"); setStep("parse"); }
  });
  el.parse.addEventListener("click", () => doParse());
  el.addEmail.addEventListener("click", () => {
    if (S.running) return;
    let t = el.prd.value;
    if (/A reminder email is sent/.test(t)) { showTab("prd"); return; }
    const add = "### Email reminders\n- [ ] A reminder email is sent one hour before the due date.\n\n";
    const m = t.match(/^##\s+(?!#)(?!Acceptance)(?!Overview).*$/m);
    t = m ? t.slice(0, m.index) + add + t.slice(m.index) : t.replace(/\s*$/, "\n\n") + add;
    el.prd.value = t; LS.set("prd", t);
    doParse();
  });

  function doParse() {
    if (S.running) return false;
    const parsed = Q.parsePrd(el.prd.value, "northwind_due_dates");
    if (!parsed.sections.length) {
      el.prdNote.textContent = "No acceptance criteria found. The parser needs a “## Acceptance Criteria” heading with “### Section” blocks of “- [ ] …” lines.";
      el.prdNote.classList.add("is-warn");
      showTab("prd");
      return false;
    }
    S.parsed = parsed; S.dirty = false;
    S.cases = Q.buildCases(parsed, app.today);
    el.prdNote.classList.remove("is-warn");
    el.prdNote.innerHTML = `Parsed <b>${parsed.sections.length}</b> sections and <b>${S.cases.length}</b> criteria from “${esc(parsed.title)}”.`;
    renderSections(); renderCases(); renderRisks();
    tabs.forEach((t) => { t.disabled = false; });
    el.nCases.textContent = `(${S.cases.length})`;
    showTab("cases");
    resetReport();
    const lv = { high: 0, medium: 0, low: 0 };
    S.cases.forEach((c) => lv[c.risk.level]++);
    log("agent", `parsed "${parsed.title}" · ${parsed.sections.length} sections · ${S.cases.length} acceptance criteria`);
    commit(`prd_parser: ${parsed.sections.length} sections, ${S.cases.length} acceptance criteria → ${S.cases.length} test cases`);
    commit(`risk: ${lv.high} high · ${lv.medium} medium · ${lv.low} low`);
    const noPlan = S.cases.filter((c) => !c.plan.intent).length;
    narrate(`${S.cases.length} test cases, ${lv.high} rated high risk${noPlan ? `, ${noPlan} the agent has no way to check` : ""}. Now let the agent work the app.`);
    setStep("run");
    return true;
  }

  function renderSections() {
    el.sect.innerHTML = Q.listSections(S.parsed).map((s) => `<tr><td>${s.index}</td><td>${esc(s.name)}</td><td>${s.count}</td></tr>`).join("");
  }
  const riskChip = (r, suffix) => `<span class="chip chip--${r.level}">${r.level}${suffix || ""}</span>`;
  const acHtml = (c) => esc(c.main) + c.subs.map((s) => `<br>– ${esc(s)}`).join("");
  function renderCases() {
    el.cases.innerHTML = S.cases.map((c) => `
<li class="case" data-id="${c.id}">
  <div class="case__hd"><span class="case__id">${c.id}</span>${riskChip(c.risk, " risk")}<span class="case__sec">${esc(c.section)}</span></div>
  <p class="case__ac">${acHtml(c)}</p>
  <details open><summary>Steps &amp; expected result</summary>
    <ol>${c.steps.map((s) => `<li>${esc(s)}</li>`).join("")}${c.plan.intent ? "" : "<li><i>No scripted plan: the agent explores and may not reach a verdict.</i></li>"}</ol>
    <p class="case__exp"><b>Expected</b> ${c.expected.map(esc).join(" ")}</p>
  </details>
  <span class="case__st"></span>
</li>`).join("");
  }
  function renderRisks() {
    const sorted = S.cases.slice().sort((a, b) => b.risk.score - a.risk.score || a.id.localeCompare(b.id));
    el.risks.innerHTML = sorted.map((c) => `
<li class="risk risk--${c.risk.level}">
  <div class="risk__score">${c.risk.score}<small>${c.risk.impact} × ${c.risk.likelihood}</small></div>
  <div class="risk__body"><b>${c.id}</b> ${esc(c.main)}
    <div class="risk__why"><span>impact ${c.risk.impact}: ${esc(c.risk.impactWhy)}</span>${c.risk.signals.map((s) => `<span>+ ${esc(s)}</span>`).join("") || "<span>no extra signals</span>"}</div></div>
  ${riskChip(c.risk)}
</li>`).join("");
  }
  function setCaseStatus(id, status) {
    const li = el.cases.querySelector(`[data-id="${id}"]`);
    if (!li) return;
    li.classList.toggle("is-running", status === "running");
    const slot = li.querySelector(".case__st");
    slot.innerHTML = status === "pending" ? "" : status === "running" ? `<span class="stamp stamp--running">running</span>` : `<span class="stamp stamp--${status} is-hit">${Q.VERDICT_LABEL(status)}</span>`;
  }

  /* --------------------------------------------------------- transcript */
  let logCount = 0;
  function log(kind, text, doCommit, verdict) {
    const empty = el.log.querySelector(".empty"); if (empty) empty.remove();
    const nearBottom = el.log.scrollHeight - el.log.scrollTop - el.log.clientHeight < 40;
    const li = document.createElement("li");
    li.className = `k-${kind}${verdict ? " v-" + verdict : ""}`;
    li.innerHTML = `<span>${esc(kind)}:</span><span>${esc(text)}</span>`;
    el.log.appendChild(li);
    if (++logCount > 500) { el.log.firstElementChild.remove(); logCount--; }
    if (nearBottom || S.running) el.log.scrollTop = el.log.scrollHeight;
    if (doCommit) commit(`${kind}: ${text}`);
  }
  el.log.innerHTML = `<li class="empty">Waiting for a run. You can click around the app too; the recorder logs what you do.</li>`;

  /* ------------------------------------------------------- snapshots ui */
  function snapNode(shot, width, maxH) {
    const sc = width / shot.w;
    const box = document.createElement("div");
    box.className = "snapbox";
    box.style.width = width + "px";
    box.style.height = Math.round(Math.min(shot.h * sc, maxH || Infinity)) + "px";
    const inner = document.createElement("div");
    inner.className = "snapin";
    inner.style.width = shot.w + "px";
    inner.style.transform = `scale(${sc})`;
    inner.innerHTML = shot.html;
    inner.setAttribute("inert", "");
    box.appendChild(inner);
    return box;
  }
  function shotButton(shot, caption, width, maxH, verdict, withCaption) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "shot";
    b.setAttribute("aria-label", "Open snapshot: " + caption);
    b.appendChild(snapNode(shot, width, maxH));
    if (withCaption !== false) { const c = document.createElement("span"); c.className = "shot__cap"; c.textContent = caption; b.appendChild(c); }
    if (verdict) { const s = document.createElement("span"); s.className = `stamp stamp--${verdict}`; s.textContent = Q.VERDICT_LABEL(verdict); b.appendChild(s); }
    b.addEventListener("click", () => openLightbox(shot, caption));
    return b;
  }
  function openLightbox(shot, caption) {
    el.lbCap.textContent = caption;
    el.lbImg.innerHTML = "";
    const w = Math.min(640, window.innerWidth - 64);
    el.lbImg.appendChild(snapNode(shot, w));
    if (el.lb.showModal) el.lb.showModal(); else el.lb.setAttribute("open", "");
  }
  el.lb.addEventListener("click", (e) => { if (e.target === el.lb) el.lb.close(); });

  /* ------------------------------------------------------ cursor driver */
  const mult = () => Q.SPEED[el.speed.value] || 1;
  const dsleep = (ms) => new Promise((res, rej) => setTimeout(() => (S.cancel ? rej(new Error("cancelled")) : res()), ms * mult()));
  function placeCursor(x, y, ms) {
    S.cur = { x, y };
    el.cursor.style.setProperty("--mv", RM ? "0ms" : Math.round(ms * mult()) + "ms");
    el.cursor.style.transform = `translate(${Math.round(x - 4)}px, ${Math.round(y - 2)}px)`;
  }
  function pointOf(node) {
    const r = node.getBoundingClientRect(), v = el.vp.getBoundingClientRect();
    return { x: r.left - v.left + Math.min(r.width / 2, 70), y: r.top - v.top + r.height / 2 };
  }
  const driver = {
    app, frame: el.vp,
    speed: () => el.speed.value,
    cancelled: () => S.cancel,
    log,
    pointOf, cursorPoint: () => S.cur,
    async cursorHome() { el.cursor.classList.add("is-on"); placeCursor(el.vp.clientWidth - 70, 70, 300); await dsleep(120); },
    async moveTo(node, ms) { const p = pointOf(node); placeCursor(p.x, p.y, ms); await dsleep(ms); },
    async click(node) {
      el.cursor.classList.remove("is-click"); void el.cursor.offsetWidth; el.cursor.classList.add("is-click");
      node.classList.add("is-agent-focus");
      await dsleep(90);
      node.click();
      node.classList.remove("is-agent-focus");
    },
    async type(node, text, per) {
      node.classList.add("is-agent-focus");
      node.value = "";
      for (const ch of text) { node.value += ch; node.dispatchEvent(new Event("input", { bubbles: true })); await dsleep(per); }
      node.classList.remove("is-agent-focus");
    },
    async fill(node, val) {
      node.classList.add("is-agent-focus");
      await dsleep(120);
      node.value = val;
      node.dispatchEvent(new Event("input", { bubbles: true }));
      node.dispatchEvent(new Event("change", { bubbles: true }));
      await dsleep(120);
      node.classList.remove("is-agent-focus");
    },
    async reload() {
      el.reload.classList.remove("is-spin"); void el.reload.offsetWidth; el.reload.classList.add("is-spin");
      await app.reload(Math.round(380 * mult()));
    },
    async wiggle() { placeCursor(S.cur.x, S.cur.y + 70, 260); await dsleep(300); placeCursor(S.cur.x, S.cur.y - 70, 260); await dsleep(260); },
    onStart(report) { S.report = report; renderStats(); el.repSub.textContent = subLine(report); },
    onCase(c, status, result) {
      setCaseStatus(c.id, status);
      if (status === "running") { el.trState.textContent = `running ${c.id}`; return; }
      appendVerdict(result, S.report.results.length);
      renderStats();
      S.bugs = Q.bugsOf(S.report, S.cases);
      renderBugs();
    },
    onStep(c, n, aj, shot, verdict) {
      el.trState.textContent = `running ${c.id} · step ${n}`;
      const empty = el.reel.querySelector(".reel__empty"); if (empty) empty.remove();
      const label = aj.action === "verify" ? "verdict" : aj.action === "timeout" ? "timed out" : aj.action;
      const b = shotButton(shot, `${c.id} · step ${n} · ${label}`, 150, 132, verdict);
      b.style.setProperty("--rot", ((S.frames % 5) - 2) * 0.8 + "deg");
      if (!RM) b.classList.add("is-new");
      el.reel.appendChild(b);
      S.frames++;
      el.reelN.textContent = `${S.frames} frame${S.frames === 1 ? "" : "s"}`;
      el.reel.scrollLeft = el.reel.scrollWidth;
    },
  };

  /* ---------------------------------------------------------- the report */
  const fmtTime = (iso) => { const d = new Date(iso); return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }); };
  const subLine = (r) => `${r.section} · build ${r.build} · ${fmtTime(r.run_at)} · model ${r.model}`;
  function resetReport() {
    S.report = null; S.bugs = [];
    el.repSub.textContent = "No verdicts yet. Run the agent to fill this in.";
    [el.sT, el.sP, el.sF, el.sB].forEach((n) => { n.textContent = "–"; });
    el.verdicts.innerHTML = `<li class="verdicts__empty">Each acceptance criterion gets a stamp, the agent's reasoning, and every step it took.</li>`;
    el.bugsWrap.hidden = true; el.bugs.innerHTML = "";
    el.dl.disabled = true; el.ship.hidden = true;
    el.closed.classList.remove("is-on");
    el.reel.innerHTML = `<p class="reel__empty">Every step gets a picture of what the agent saw. They land here.</p>`;
    S.frames = 0; el.reelN.textContent = "0 frames";
  }
  function renderStats() {
    const r = S.report;
    el.sT.textContent = r.total; el.sP.textContent = r.passed; el.sF.textContent = r.failed; el.sB.textContent = r.inconclusive;
  }
  function actionLine(aj, res) {
    const p = [aj.action];
    if (aj.ref != null) p.push(`ref=${aj.ref}`);
    if (aj.text) p.push(`text='${aj.text}'`);
    if (aj.verdict) p.push(`verdict=${aj.verdict}`);
    return p.join("  ") + "  → " + res;
  }
  function appendVerdict(r, idx) {
    const empty = el.verdicts.querySelector(".verdicts__empty"); if (empty) empty.remove();
    const c = S.cases.find((x) => x.id === r.id);
    const li = document.createElement("li");
    li.className = "vd";
    li.innerHTML = `<button type="button" class="vd__hd" aria-expanded="false"><span class="vd__q"><b>${r.id}</b>${c ? acHtml(c) : esc(r.ac)}<span class="vd__more">reasoning &amp; ${r.steps.length} step${r.steps.length === 1 ? "" : "s"}</span></span><span class="stamp stamp--${r.verdict} is-hit">${Q.VERDICT_LABEL(r.verdict)}</span></button>
<div class="vd__body" hidden><p class="vd__why"><b>Verdict reasoning</b>${esc(r.reasoning)}</p><ol class="vd__steps"></ol>${r.skeleton ? `<details class="skel"><summary>+ DOM skeleton sent to the model at the verdict</summary><pre>${esc(r.skeleton)}</pre></details>` : ""}</div>`;
    const ol = li.querySelector(".vd__steps");
    r.steps.forEach((s, i) => {
      const row = document.createElement("li");
      row.className = "vstep";
      row.innerHTML = `<span class="vstep__n">${i + 1}</span><span class="vstep__t">${esc(s.action_json.thought || "")}<code class="vstep__a">${esc(actionLine(s.action_json, s.result))}</code></span>`;
      row.appendChild(shotButton(s.shot, `${r.id} · step ${i + 1}`, 112, 96, null, false));
      ol.appendChild(row);
    });
    const hd = li.querySelector(".vd__hd"), body = li.querySelector(".vd__body");
    hd.addEventListener("click", () => { body.hidden = !body.hidden; hd.setAttribute("aria-expanded", String(!body.hidden)); });
    el.verdicts.appendChild(li);
  }
  function renderBugs() {
    el.bugsWrap.hidden = !S.bugs.length;
    el.nBugs.textContent = S.bugs.length ? `(${S.bugs.length})` : "";
    el.bugs.innerHTML = "";
    S.bugs.forEach((b) => {
      const card = document.createElement("article");
      card.className = "bug";
      card.innerHTML = `<div class="bug__meta"><span class="bug__id">${b.id}</span><span class="chip chip--${b.level}">${b.severity} severity</span><span>found by ${b.caseId}</span></div>
<h4>${esc(b.title)}</h4>
<div class="bug__lbl">Steps to reproduce</div><ol>${b.repro.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
<div class="bug__ea"><b>Expected</b><span>${esc(b.expected)}</span><b>Actual</b><span>${esc(b.actual)}</span></div>
<div class="bug__ev"></div>`;
      if (b.evidence) {
        const ev = card.querySelector(".bug__ev");
        ev.appendChild(shotButton(b.evidence, `${b.caseId} · evidence`, 132, 120, "fail"));
        const p = document.createElement("p"); p.textContent = "Evidence: the page the agent was looking at when it ruled. Click to enlarge."; ev.appendChild(p);
      }
      el.bugs.appendChild(card);
    });
  }

  el.dl.addEventListener("click", () => {
    if (!S.report || !S.report.finished) return;
    const html = Q.buildReportHtml(S.report, S.bugs, APP_CSS);
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "report.html";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    const kb = Math.max(1, Math.round(blob.size / 1024));
    log("report", `saved report.html · ${kb} KB · ${S.report.total} criteria`, true);
  });

  /* ------------------------------------------------------------ the fix */
  function setBuildTag() { el.build.textContent = app.fixed ? "build v1.4.1 · bugs fixed" : "build v1.4.0 · as shipped"; }
  function applyFix(v) {
    app.setFixed(v); app.resetFixture(); setBuildTag(); LS.set("fixed", v ? "1" : "0");
    el.fix.checked = v;
    const line = v ? "northwind-tasks v1.4.1 (past-date validation, remind flag saved)" : "northwind-tasks v1.4.0 (as shipped)";
    log("deploy", line, true);
    if (S.report && S.report.finished) { narrate(v ? "Hotfix deployed. Run the agent again to see if the bugs are gone." : "Rolled back to the shipped build. The bugs are back."); setStep("run"); }
  }
  el.fix.addEventListener("change", () => { if (S.running) { el.fix.checked = app.fixed; return; } applyFix(el.fix.checked); });
  el.ship.addEventListener("click", async () => { if (S.running) return; applyFix(true); await doRun(); });

  /* ---------------------------------------------------------------- run */
  el.run.addEventListener("click", () => doRun());
  el.speed.addEventListener("change", () => LS.set("speed", el.speed.value));
  function lockUi(on) {
    S.running = on;
    el.run.disabled = on; el.parse.disabled = on; el.fix.disabled = on; el.prd.readOnly = on; el.ship.disabled = on;
    el.shield.hidden = !on;
    el.driver.textContent = on ? "agent driving" : "you";
    el.driver.classList.toggle("is-agent", on);
    el.trState.classList.toggle("is-live", on);
    el.run.textContent = on ? "Running…" : "Run agent";
    if (!on) el.cursor.classList.remove("is-on");
  }
  async function doRun() {
    if (S.running) return null;
    if (!S.parsed || S.dirty) { if (!doParse()) return null; }
    resetReport();
    S.cases.forEach((c) => setCaseStatus(c.id, "pending"));
    lockUi(true); S.cancel = false;
    setStep("run");
    narrate(`The agent is working Northwind Tasks ${app.version}: read the DOM, ask the model, act, take a picture. One criterion at a time.`);
    const b = el.paneB.getBoundingClientRect();
    if (b.top < -40 || b.top > window.innerHeight * 0.45) scrollTo(window.innerWidth < 820 ? el.paneB.querySelector(".bbar") : el.paneB);
    log("agent", `run started · ${S.cases.length} criteria · build ${app.version} · speed ${el.speed.value}`);
    let report = null;
    try {
      report = await Q.runSection(S.cases, Object.assign(driver, { title: S.parsed.title }));
    } catch (e) {
      if (e.message !== "cancelled") throw e;
      log("agent", "run cancelled");
    }
    lockUi(false);
    app.resetFixture();
    if (!report) { el.trState.textContent = "cancelled"; return null; }
    el.trState.textContent = `done · ${report.passed} pass · ${report.failed} fail · ${report.inconclusive} blocked`;
    const ts = Math.floor(Date.now() / 1000);
    log("report", `wrote reports/auto_due_dates_${ts}/report.json + report.html`, true);
    el.dl.disabled = false;
    el.ship.hidden = !(report.failed > 0 && !app.fixed);
    const clean = report.failed === 0 && report.inconclusive === 0;
    if (clean) el.closed.classList.add("is-on");
    narrate(clean ? `All ${report.total} criteria pass on ${app.version}. Case closed.`
      : report.failed ? `${report.failed} bug${report.failed > 1 ? "s" : ""} found${report.inconclusive ? `, ${report.inconclusive} blocked` : ""}. Read the report, or fix the bugs and re-run.`
      : `No failures. ${report.inconclusive} criterion could not be checked from the browser.`);
    setStep("report");
    return report;
  }

  /* --------------------------------------------- visitor = recorder.py */
  function elementInfo(t) {
    const r = t.getBoundingClientRect(), v = el.vp.getBoundingClientRect();
    const sel = t.getAttribute("data-test") ? `[data-test=${t.getAttribute("data-test")}]` : t.tagName;
    const text = (t.innerText || t.getAttribute("aria-label") || t.getAttribute("placeholder") || "").trim().slice(0, 40);
    return { sel, tag: t.tagName, text, x: Math.round(r.left - v.left + r.width / 2), y: Math.round(r.top - v.top + r.height / 2) };
  }
  el.vp.addEventListener("click", (e) => {
    if (S.running) return;
    const t = e.target.closest("button, input, label, [data-test]");
    if (!t || t.tagName === "LABEL" || (t.tagName === "INPUT" && t.type !== "checkbox")) return;
    const i = elementInfo(t);
    log("recorder", `click ${i.tag} ${i.sel}${i.text ? ` "${i.text}"` : ""} (${i.x},${i.y})`);
  }, true);
  el.vp.addEventListener("focusout", (e) => {
    if (S.running) return;
    const t = e.target;
    if ((t.tagName === "INPUT" && t.type !== "checkbox") && t.value.trim()) log("recorder", `input ${elementInfo(t).sel} = "${t.value.trim().slice(0, 40)}"`);
  }, true);
  el.reload.addEventListener("click", async () => {
    if (S.running) return;
    el.reload.classList.remove("is-spin"); void el.reload.offsetWidth; el.reload.classList.add("is-spin");
    log("recorder", "navigation · page reloaded (saved data is kept)");
    await app.reload(RM ? 0 : 350);
  });

  /* --------------------------------------------------------------- tour */
  let tourTok = 0;
  const tsleep = async (ms, tok) => { await wait(ms); if (tok !== tourTok) throw new Error("tour stopped"); };
  el.tour.addEventListener("click", async () => {
    if (S.tour) { tourTok++; S.tour = false; S.cancel = true; el.tour.textContent = "Autoplay the case"; return; }
    if (S.running) return;
    const tok = ++tourTok; S.tour = true; el.tour.textContent = "Stop autoplay";
    const prevSpeed = el.speed.value;
    try {
      if (app.fixed) applyFix(false);
      el.speed.value = RM ? "fast" : "normal";
      if (S.dirty || !S.parsed) el.prd.value = el.prd.value || seed;
      scrollTo(el.prd.closest(".pane"));
      doParse(); await tsleep(2200, tok);
      showTab("risk"); narrate("The risk register: impact times likelihood. The two high-risk criteria are where bugs tend to hide."); await tsleep(3200, tok);
      showTab("cases");
      const r1 = await doRun(); if (tok !== tourTok || !r1) return;
      scrollTo(el.report); await tsleep(900, tok);
      const firstBug = el.bugs.querySelector(".bug"); if (firstBug) firstBug.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "center" });
      await tsleep(3200, tok);
      if (r1.failed) {
        narrate("Autoplay: shipping the hotfix build and re-running the same criteria at fast speed.");
        await tsleep(1600, tok);
        el.speed.value = "fast";
        applyFix(true);
        const r2 = await doRun(); if (tok !== tourTok || !r2) return;
        scrollTo(el.report);
      }
    } catch (e) {
      if (!/tour stopped|cancelled/.test(e.message)) throw e;
    } finally {
      if (tok === tourTok) { S.tour = false; el.tour.textContent = "Autoplay the case"; }
      el.speed.value = prevSpeed;
    }
  });

  /* ------------------------------------------------------------- start */
  narrate("Exhibit A is the spec for a fictional to-do app. Parse it, and the bot turns every acceptance criterion into a test case.");
  setStep("parse");
  window.__vvqa = { S, app, doParse, doRun, applyFix };
})();
