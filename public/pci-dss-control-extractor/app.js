/* PCI DSS Control Extractor: interactive demo.
   Section A is a line-for-line port of scripts/extract_pci_full.py (parse_response, the
   merge loop in main(), sort_key, write_csv, progress.json checkpointing).
   Only the Claude Haiku call is simulated: its replies are rebuilt from the real rows in
   output/PCI_DSS_v4_Controls.csv, so what the parser produces can be checked against the file. */
(() => {
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const commit = (d) => window.dispatchEvent(new CustomEvent("demo:commit", { detail: d }));
const store = {
  get(k) { try { const v = localStorage.getItem("pcix." + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem("pcix." + k, JSON.stringify(v)); } catch (e) { /* storage unavailable: memory only */ } },
  del(k) { try { localStorage.removeItem("pcix." + k); } catch (e) {} },
};
const fmtK = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n));
const pad3 = (n) => String(n).padStart(3, "0");

/* ════════════════ A. PIPELINE LOGIC (ported from extract_pci_full.py) ════════════════ */

const TOTAL_PAGES = 296;
const FRAMEWORK_FK = 7;
const CSV_HEADER = ["Control ID", "Control", "Control Description", "Criticality", "Domain", "Framework (FK)",
  "Identifier", "Implementation Guidance", "Is Active", "Mapped Controls", "Type", "Weight"];

// " ".join(s.split())  — collapse all whitespace
const pyCollapse = (s) => s.split(/\s+/).filter(Boolean).join(" ");
// str.split(sep, maxsplit)
function pySplit(s, sep, maxsplit) {
  const out = []; let rest = s;
  while (out.length < maxsplit) {
    const i = rest.indexOf(sep);
    if (i < 0) break;
    out.push(rest.slice(0, i)); rest = rest.slice(i + sep.length);
  }
  out.push(rest);
  return out;
}

/** parse_response(text, fallback_domain): CONTROL| lines → control dicts. */
function parseResponse(text, fallbackDomain) {
  const controls = [];
  for (let line of text.split(/\r\n|\r|\n/)) {
    line = line.trim();
    if (!line.startsWith("CONTROL|")) continue;
    const parts = pySplit(line, "|", 4);
    if (parts.length !== 5) continue;
    let [, ident, domain, desc, guidance] = parts;
    ident = ident.trim();
    domain = domain.trim() || fallbackDomain;
    desc = pyCollapse(desc);
    guidance = pyCollapse(guidance);
    if (ident) controls.push({ identifier: ident, domain, description: desc, guidance });
  }
  return controls;
}

/** One iteration of the page loop in main(): SKIP check, domain tracker, merge-or-insert. */
function processPage(state, pageNum, responseText) {
  let domain = state.domain;
  const controls = state.controls;
  const events = [];
  let skip = false, found = [];
  if (responseText.trim().toUpperCase() === "SKIP") {
    skip = true;
  } else {
    found = parseResponse(responseText, domain);
    for (const c of found) {
      const ident = c.identifier;
      if (c.domain) { domain = c.domain; c.domain = domain; }   // update domain tracker
      if (Object.prototype.hasOwnProperty.call(controls, ident)) {
        // merge continuation: append any new text not already present
        const existing = controls[ident];
        const ev = { kind: "merge", ident, before: { d: existing.description.length, g: existing.guidance.length } };
        if (c.description && !existing.description.includes(c.description)) {
          existing.description = (existing.description + " " + c.description).trim(); ev.descAppended = c.description.length;
        } else if (c.description) ev.descDup = true;
        if (c.guidance && !existing.guidance.includes(c.guidance)) {
          existing.guidance = (existing.guidance + " " + c.guidance).trim(); ev.guidAppended = c.guidance.length;
        } else if (c.guidance) ev.guidDup = true;
        events.push(ev);
      } else {
        controls[ident] = c;
        events.push({ kind: "new", ident });
      }
    }
  }
  // save checkpoint fields
  state.last_page = pageNum;
  state.domain = domain;
  state.controls = controls;
  return { skip, found, events };
}

/** sort_key: "1.2.3" numerically; lettered parts (A1) sort after plain numbers. */
function sortKey(identifier) {
  return identifier.trim().split(/[.\s]+/).map((p) => {
    const m = /^([A-Za-z]*)(\d+)/.exec(p);
    return m ? [m[1] ? 1 : 0, parseInt(m[2], 10)] : [0, 0];
  });
}
function cmpKeys(a, b) {             // Python list-of-tuples comparison
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i][0] !== b[i][0]) return a[i][0] - b[i][0];
    if (a[i][1] !== b[i][1]) return a[i][1] - b[i][1];
  }
  return a.length - b.length;
}

// csv.writer defaults: QUOTE_MINIMAL, doublequote, lineterminator "\r\n"
const csvField = (v) => { const s = String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csvText = (rows) => rows.map((r) => r.map(csvField).join(",")).join("\r\n") + "\r\n";
const csvRow = (i, c) => [i, "", c.description, "", c.domain, FRAMEWORK_FK, c.identifier, c.guidance, "Yes", "", "", ""];

/** write_csv(controls_map): sort, number from 1, emit the 12-column shape. */
function writeCsvRows(controlsMap) {
  const rows = Object.values(controlsMap).slice().sort((a, b) => cmpKeys(sortKey(a.identifier), sortKey(b.identifier)));
  return rows.map((c, i) => csvRow(i + 1, c));
}

function download(name, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

let toastT;
function toast(msg) {
  let t = $(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600);
}

/* ════════════════ B. DATA ════════════════ */

let DATA = null, ROWS = [];

fetch("./data.json").then((r) => r.json()).then((d) => {
  DATA = d;
  ROWS = buildRows(d.rows);
  initReplay();
  initExplorer();
}).catch((e) => {
  $("#term").innerHTML = '<p class="term__hint">Could not load data.json (' + esc(e.message) + ").</p>";
  throw e;
});

/* ════════════════ C. PIPELINE REPLAY ════════════════ */

const START = { last_page: 35, domain: "", controls: {} };   // pages 0–35: cover, contents, intro → SKIP
const SEC11 = "1.1 Processes and mechanisms for installing and maintaining network security controls are defined and understood.";
const SEC12 = "1.2 Network security controls (NSCs) are configured and maintained.";
let REPLAY = [];
let state, meter, run = null;

function splitAtSentence(text) {        // cut the guidance where a page break would fall
  const mid = text.length * 0.5; let best = -1;
  const re = /\. (?=[A-Z])/g; let m;
  while ((m = re.exec(text))) if (best < 0 || Math.abs(m.index - mid) < Math.abs(best - mid)) best = m.index;
  return [text.slice(0, best + 1), text.slice(best + 2)];
}

function buildReplay() {
  const R = (id) => { const r = ROWS.find((x) => x.id === id); return { n: r.n, id, domain: r.domain, desc: r.desc, guid: r.guid }; };
  const L = (id, dom, desc, guid) => `CONTROL|${id}|${dom}|${desc}|${guid}`;
  const a = ["1.1.1", "1.1.2", "1.2.1", "1.2.2", "1.2.3", "1.2.4", "1.2.5", "1.2.6", "1.2.7"].map(R);
  const [g1, g2] = splitAtSentence(a[5].guid);
  const split = { id: "1.2.4", p1: g1, p2: g2, pageA: 39, pageB: 40 };
  const pages = [
    { page: 36, kind: "overview", lines: ["SKIP"] },
    { page: 37, sections: [a[0].domain, SEC11], left: [a[0], a[1]], right: [a[0], a[1]],
      lines: [L("1.1.1", a[0].domain, a[0].desc, a[0].guid), L("1.1.2", a[1].domain, a[1].desc, a[1].guid)] },
    { page: 38, sections: [SEC12], left: [a[2], a[3]], right: [a[2], a[3]],
      // the model left the domain field empty here → parse_response falls back to the tracked domain
      lines: [L("1.2.1", a[2].domain, a[2].desc, a[2].guid), L("1.2.2", "", a[3].desc, a[3].guid)] },
    { page: 39, sections: [], left: [a[4], a[5]], right: [a[4], { id: "1.2.4", guid: g1 }],
      lines: [L("1.2.3", a[4].domain, a[4].desc, a[4].guid), L("1.2.4", a[5].domain, a[5].desc, g1)] },
    { page: 40, sections: [], left: [{ id: "1.2.4", cont: true }, a[6]], right: [{ id: "1.2.4", guid: g2, cont: true }, a[6]],
      lines: [L("1.2.4", a[5].domain, a[5].desc, g2), L("1.2.5", a[6].domain, a[6].desc, a[6].guid)] },
    { page: 41, sections: [], left: [a[7], a[8]], right: [a[7], a[8]],
      lines: [L("1.2.6", a[7].domain, a[7].desc, a[7].guid), "(Testing procedures 1.2.7.a and 1.2.7.b omitted as instructed.)", L("1.2.7", a[8].domain, a[8].desc, a[8].guid)] },
  ];
  pages.forEach((p) => { p.response = p.lines.join("\n"); p.tokens = 1180 + ((p.page * 37) % 90) + Math.ceil(p.response.length / 3.6); });
  return { pages, split, expect: a };
}

let SPLIT, EXPECT;

function pageHTML(p) {
  const foot = `<div class="pf"><span>PCI DSS v4.0.1 · Requirements and Testing Procedures</span><span>Page ${p.page}</span></div>`;
  const grain = '<svg class="grain" aria-hidden="true"><rect width="100%" height="100%" filter="url(#paperNoise)"/></svg>';
  const hd = '<div class="hd"><div>Requirements and Testing Procedures</div><div>Guidance</div></div>';
  const bars = (ws) => ws.map((w) => `<div class="ln" style="width:${w}%"></div>`).join("");
  if (p.kind === "overview") {
    return `<div class="ov">Requirement 1: Install and Maintain Network Security Controls<small>Sections · Overview · Applicability</small></div>
      <div class="cols"><div class="l">${bars([94, 88, 91, 70, 0, 92, 86, 64, 90, 76])}</div><div class="r">${bars([90, 84, 92, 58, 88, 80])}</div></div>
      ${foot}${grain}<div class="scanline"></div>`;
  }
  const secs = p.sections.map((s) => `<div class="sc">${esc(s)}</div>`).join("");
  const left = p.left.map((c, i) => c.cont
    ? `<p class="ctl cont"><b>${c.id}</b> (continued)</p>${bars([90, 72, 84, 60])}`
    : `<p class="ctl"><b>${c.id}</b> ${esc(c.desc)}</p>${bars(i ? [88, 66, 80] : [92, 78, 64])}`).join("");
  const right = p.right.map((c) => {
    const g = c.guid || "";
    const shown = c.cont ? "… " + g.slice(0, 260) : g.slice(0, 260);
    return `<p>${c.cont ? "" : "<b>Purpose</b>"}${esc(shown)}</p>${bars([90, 76])}`;
  }).join("");
  return `${hd}${secs}<div class="cols"><div class="l">${left}</div><div class="r">${right}</div></div>${foot}${grain}<div class="scanline"></div>`;
}

const el = {};
function initReplay() {
  ["runBtn", "stepBtn", "stopBtn", "tourBtn", "paper", "pageName", "term", "termStatus", "ckpt", "outRows", "outEmpty", "outDone",
    "outStatus", "doneMsg", "dlReplay", "mPage", "mCtl", "mTok", "mCost"].forEach((id) => (el[id] = $("#" + id)));
  const built = buildReplay();
  REPLAY = built.pages; SPLIT = built.split; EXPECT = built.expect;

  const saved = store.get("progress");
  state = saved && typeof saved.last_page === "number" && saved.controls ? saved : clone(START);
  meter = store.get("meter") || { tokens: 0, pages: 0 };

  el.runBtn.addEventListener("click", () => { stopTour(); onRun(false); });
  el.stepBtn.addEventListener("click", () => { stopTour(); onRun(true); });
  el.stopBtn.addEventListener("click", () => { stopTour(); if (run) run.abort = true; });
  el.tourBtn.addEventListener("click", tour);
  const heroRun = $("#heroRun");
  heroRun.addEventListener("click", () => {
    heroRun.classList.remove("pulse");
    $("#replay").scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" });
    if (!run && !touring) setTimeout(() => onRun(false), RM ? 0 : 450);
  });
  $("#heroTour").addEventListener("click", () => { heroRun.classList.remove("pulse"); if (!touring) tour(); });
  el.dlReplay.addEventListener("click", () => {
    const rows = writeCsvRows(state.controls);
    download("PCI_DSS_v4_Controls.csv", csvText([CSV_HEADER, ...rows]));
    commit(`csv: wrote ${rows.length} rows → output/PCI_DSS_v4_Controls.csv (replay)`);
    toast(`Downloaded ${rows.length} rows · same 12 columns as the full file`);
  });
  el.term.addEventListener("click", (e) => { const l = e.target.closest(".ln"); if (l) l.classList.toggle("open"); });

  restoreView();
}

function resetReplay() {
  state = clone(START); meter = { tokens: 0, pages: 0 };
  store.del("progress"); store.del("meter");
  delete el.outDone.dataset.shown; el.outDone.hidden = true;
  restoreView();
}
const clone = (o) => JSON.parse(JSON.stringify(o));
const nextIdx = () => REPLAY.findIndex((p) => p.page > state.last_page);
const nCtl = () => Object.keys(state.controls).length;

function restoreView() {
  const i = nextIdx();
  const shown = i < 0 ? REPLAY[REPLAY.length - 1] : REPLAY[i];
  el.paper.innerHTML = pageHTML(shown);
  el.pageName.textContent = `page_${pad3(shown.page)}.png`;
  const resumed = state.last_page > START.last_page;
  el.term.innerHTML = `<p class="term__hint">$ python scripts/extract_pci_full.py<br>Found ${TOTAL_PAGES} pages in temp/pdf_pages<br>Resuming from page ${state.last_page + 1} (${nCtl()} controls so far)<br><span class="dim">${resumed
    ? "# progress.json from your last visit: finished pages are not sent to the model again"
    : "# pages 0–35 are cover, contents and intro: the model answered SKIP"}</span></p>`;
  updateMeters(); updateCkpt(false); renderOut(new Set(), null);
  if (i < 0) finish(false);
  updateButtons();
}

function updateButtons() {
  const i = nextIdx(), busy = !!run;
  el.runBtn.disabled = busy; el.stepBtn.disabled = busy || i < 0; el.stopBtn.disabled = !busy;
  el.tourBtn.disabled = busy && !touring;
  const label = el.runBtn.querySelector("span");
  if (busy) label.textContent = "Running…";
  else if (i < 0) label.textContent = "Replay again";
  else if (state.last_page > START.last_page) label.textContent = `Resume from page ${REPLAY[i].page}`;
  else label.textContent = "Run 6 pages";
  el.runBtn.classList.toggle("pulse", !busy && state.last_page === START.last_page && !touring);
  const hr = $("#heroRun"); if (hr) hr.classList.toggle("pulse", !busy && state.last_page === START.last_page && !touring);
}

function updateMeters(bump) {
  const shownPage = state.last_page > START.last_page ? state.last_page : "–";
  el.mPage.textContent = run && run.page ? run.page : shownPage;
  el.mCtl.textContent = nCtl();
  el.mTok.textContent = fmtK(meter.tokens);
  el.mCost.textContent = "$" + (meter.pages * 0.40 / TOTAL_PAGES).toFixed(4);
  if (bump) [el.mCtl, el.mTok, el.mCost].forEach((d) => { d.classList.add("bump"); setTimeout(() => d.classList.remove("bump"), 500); });
}

function updateCkpt(flash) {
  const dom = state.domain ? `"${state.domain.slice(0, 22)}…"` : '""';
  el.ckpt.textContent = `{ "last_page": ${state.last_page}, "domain": ${dom}, "controls": {${nCtl()} keys} }`;
  if (flash) { el.ckpt.classList.remove("saved"); void el.ckpt.offsetWidth; el.ckpt.classList.add("saved"); }
}

/* sleeps that an interrupt can cut short */
class Interrupted extends Error {}
function sleep(ms, tok) {
  const d = RM ? Math.min(ms, 30) : ms / (tok && tok.speed || 1);
  return new Promise((res, rej) => {
    const t0 = performance.now();
    const tick = () => {
      if (tok && tok.abort) return rej(new Interrupted());
      if (performance.now() - t0 >= d) return res();
      setTimeout(tick, Math.min(40, d));
    };
    tick();
  });
}

async function onRun(single) {
  if (run) return;
  if (nextIdx() < 0) resetReplay();                          // replay again from the start
  run = { abort: false, speed: touring ? 1.15 : 1, page: null };
  updateButtons();
  const hint = el.term.querySelector(".term__hint .dim"); if (hint && !single) hint.textContent = "# running…";
  try {
    do {
      const i = nextIdx(); if (i < 0) break;
      await runPage(REPLAY[i], run);
    } while (!single && !run.abort);
  } catch (e) {
    if (!(e instanceof Interrupted)) throw e;
  } finally {
    run = null;
    el.paper.classList.remove("swap", "scanning");
    el.termStatus.textContent = nextIdx() < 0 ? "done" : "idle";
    updateMeters(); updateButtons();
  }
  if (nextIdx() < 0 && !el.outDone.dataset.shown) finish(true);
}

function colorLine(line, n) {      // paint the first n characters of a raw model line
  const vis = line.slice(0, n);
  if (!line.startsWith("CONTROL|")) return `<span class="${line === "SKIP" ? "k" : ""}">${esc(vis)}</span>`;
  const parts = pySplit(line, "|", 4); const cls = ["k", "id", "dm", "ds", "gd"];
  let out = "", used = 0;
  for (let i = 0; i < parts.length && used < n; i++) {
    if (i) { out += '<span class="p">|</span>'; used++; if (used >= n) break; }
    const s = parts[i].slice(0, n - used); used += s.length;
    out += i === 2 && parts[2] === "" && used <= n ? '<span class="em">(empty)</span>' : `<span class="${cls[i]}">${esc(s)}</span>`;
  }
  return out;
}

async function runPage(p, tok) {
  tok.page = p.page;
  el.termStatus.textContent = `rendering page_${pad3(p.page)}.png`;
  el.paper.classList.add("swap");
  await sleep(220, tok);
  el.paper.innerHTML = pageHTML(p);
  el.pageName.textContent = `page_${pad3(p.page)}.png`;
  el.paper.classList.remove("swap");
  el.mPage.textContent = p.page;

  const block = document.createElement("div"); block.className = "tpage";
  block.innerHTML = `<div class="tp-h">[${pad3(p.page)}/${TOTAL_PAGES - 1}] <b>page_${pad3(p.page)}.png</b> … <span class="caret"></span></div>`;
  el.term.appendChild(block); el.term.scrollTop = el.term.scrollHeight;

  try {
    // 1. Haiku looks at the page (scan line)
    el.termStatus.textContent = "claude-haiku-4-5 reading…";
    const scanMs = 1150;
    el.paper.style.setProperty("--scan-ms", scanMs / (tok.speed || 1) + "ms");
    void el.paper.offsetWidth; el.paper.classList.add("scanning");
    await sleep(scanMs, tok);
    el.paper.classList.remove("scanning");

    // 2. reply streams in
    const caret = block.querySelector(".caret"); caret && caret.remove();
    const lineEls = [];
    for (const line of p.lines) {
      const d = document.createElement("div"); d.className = "ln" + (line.startsWith("CONTROL|") || line === "SKIP" ? "" : " noise");
      block.appendChild(d); lineEls.push(d);
      const dur = Math.min(900, Math.max(220, line.length * 0.55));
      const t0 = performance.now();
      while (true) {
        const k = RM ? 1 : Math.min(1, (performance.now() - t0) / (dur / (tok.speed || 1)));
        const n = Math.max(1, Math.round(line.length * k));
        d.innerHTML = colorLine(line, n) + (k < 1 ? '<span class="caret"></span>' : "");
        el.term.scrollTop = el.term.scrollHeight;
        if (k >= 1) break;
        await sleep(32, tok);
      }
      await sleep(120, tok);
    }
    tok.streamed = true;

    // 3. parse + merge + checkpoint: synchronous, exactly like the Python loop body
    const before = nCtl();
    const res = processPage(state, p.page, p.response);
    meter.tokens += p.tokens; meter.pages += 1;
    store.set("progress", state); store.set("meter", meter);
    updateCkpt(true); updateMeters(true);

    // 4. annotate each raw line with what the parser did with it
    let ei = 0; const highlight = new Set(); let mergeEv = null;
    p.lines.forEach((line, li) => {
      const v = document.createElement("span"); v.className = "verdict";
      if (line === "SKIP") { return; }
      const parsed = parseResponse(line, "");
      if (!parsed.length) {
        lineEls[li].classList.add("v-drop");
        v.classList.add("drop"); v.innerHTML = "<b>dropped</b> · not a CONTROL| line";
      } else {
        const ev = res.events[ei++];
        if (ev.kind === "new") {
          lineEls[li].classList.add("v-new"); highlight.add(ev.ident);
          v.classList.add(parsed[0].domain ? "new" : "fb");
          v.innerHTML = parsed[0].domain ? `<b>new</b> · controls["${ev.ident}"]`
            : `<b>new</b> · controls["${ev.ident}"] · empty domain → fallback "${esc(res.found.find((c) => c.identifier === ev.ident).domain.slice(0, 26))}…"`;
        } else {
          lineEls[li].classList.add("v-merge"); mergeEv = ev;
          v.classList.add("merge");
          v.innerHTML = `<b>merge</b> · "${ev.ident}" already in controls → description ${ev.descDup ? "already present, skipped" : "+" + (ev.descAppended || 0) + " chars"} · guidance <b>+${ev.guidAppended || 0} chars</b>`;
        }
      }
      lineEls[li].after(v);
    });
    const r = document.createElement("div");
    r.className = "tp-r" + (res.skip ? " skip" : "");
    r.innerHTML = res.skip ? "<b>skip</b>" : `<b>${res.found.length} control(s)</b> → total ${nCtl()}`;
    block.appendChild(r); el.term.scrollTop = el.term.scrollHeight;

    renderOut(highlight, mergeEv);
    const tk = fmtK(p.tokens);
    commit(res.skip ? `page ${p.page}/${TOTAL_PAGES} → SKIP (haiku, ${tk} tokens)`
      : `page ${p.page}/${TOTAL_PAGES} → ${res.found.length} control${res.found.length === 1 ? "" : "s"} (haiku, ${tk} tokens)${nCtl() - before < res.found.length ? " · 1 merged" : ""}`);
    if (mergeEv) commit(`merge ${mergeEv.ident}: guidance +${mergeEv.guidAppended} chars from page ${p.page}; description already present, skipped`);
    el.termStatus.textContent = `checkpoint saved · last_page=${state.last_page}`;
    await sleep(mergeEv ? 1500 : 520, tok);
  } catch (e) {
    if (e instanceof Interrupted && !tok.streamed) {
      // nothing was parsed or saved for this page: the checkpoint still points at the previous one
      block.querySelectorAll(".ln,.caret").forEach((n) => n.remove());
      el.paper.classList.remove("scanning");
      const r = document.createElement("div"); r.className = "tp-r err";
      r.innerHTML = `<b>^C KeyboardInterrupt</b> · progress.json still says last_page=${state.last_page}, so the next run resumes at page ${state.last_page + 1}`;
      block.appendChild(r); el.term.scrollTop = el.term.scrollHeight;
      commit(`interrupted on page ${p.page}; checkpoint last_page=${state.last_page} kept`);
      tok.page = null;
    }
    throw e;
  } finally {
    tok.streamed = false;
  }
}

function renderOut(highlight, mergeEv) {
  const rows = writeCsvRows(state.controls);
  el.outEmpty.hidden = rows.length > 0;
  el.outStatus.textContent = `${rows.length} row${rows.length === 1 ? "" : "s"}`;
  el.outRows.innerHTML = rows.map((r) => {
    const id = r[6], g = r[7];
    const isSplit = id === SPLIT.id && state.last_page >= SPLIT.pageB;
    const fresh = highlight.has(id) ? " fresh" : "";
    const gd = isSplit
      ? `<span class="mtag mtag--a">p.${SPLIT.pageA}</span><span class="seg seg--a">${esc(SPLIT.p1)}</span> <span class="mtag mtag--b">p.${SPLIT.pageB}</span><span class="seg seg--b">${esc(SPLIT.p2)}</span>`
      : `${esc(g)}`;
    const note = isSplit
      ? `<div class="mnote"><b>Merged across the page break.</b> Page ${SPLIT.pageB} sent ${id} again. Its description was already present (<code>c["description"] in existing["description"]</code>), so it was skipped; its guidance was new, so ${SPLIT.p2.length} chars were appended: ${SPLIT.p1.length} → ${g.length}.</div>` : "";
    return `<li class="orow${isSplit ? " merged" : ""}${fresh}" data-id="${esc(id)}" style="${highlight.has(id) || (isSplit && mergeEv) ? "" : "animation:none"}">
      <span class="cid">${r[0]}</span><span class="idf">${esc(id)}</span>
      <span class="dsc">${esc(r[2])}</span><span class="gd">${gd} <span class="len">· ${g.length} chars</span></span>${note}</li>`;
  }).join("");
  if (mergeEv) {
    const li = el.outRows.querySelector(`[data-id="${SPLIT.id}"]`);
    if (li && !touring && !isInView(li)) li.scrollIntoView({ block: "nearest", behavior: RM ? "auto" : "smooth" });
  }
}
const isInView = (n) => { const r = n.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; };

function finish(animate) {
  const rows = writeCsvRows(state.controls);
  // verify the parser's output against the published file, field by field
  const ok = rows.length === EXPECT.length && rows.every((r, i) => {
    const e = EXPECT[i];
    return r[6] === e.id && r[0] === e.n && r[2] === e.desc && r[4] === e.domain && r[7] === e.guid;
  });
  el.doneMsg.innerHTML = ok
    ? `<b>✓ ${rows.length} rows, identical to rows 1–${rows.length} of output/PCI_DSS_v4_Controls.csv</b>, compared field by field. The real run kept going for another ${TOTAL_PAGES - 1 - state.last_page} pages and ended at 328 controls.`
    : `${rows.length} rows written. (They differ from the published file. That should not happen.)`;
  el.outDone.hidden = false; el.outDone.dataset.shown = "1";
  const hint = document.createElement("p"); hint.className = "term__hint";
  hint.innerHTML = `Writing CSV …<br>Done! ${rows.length} controls written to:<br>&nbsp;&nbsp;output/PCI_DSS_v4_Controls.csv<br><span class="dim">To start over: delete progress.json and re-run.</span>`;
  if (animate) { el.term.appendChild(hint); el.term.scrollTop = el.term.scrollHeight; commit(`write_csv: ${rows.length} rows, sorted by sort_key, 12 columns`); }
}

/* ════════════════ D. CONTROLS EXPLORER ════════════════ */

function reqOf(id) {
  if (/^A\d/.test(id)) return "A";
  const m = /^(\d+)\./.exec(id);
  return m ? m[1] : null;
}

function buildRows(raw) {
  const rows = raw.map((r, i) => ({ n: i + 1, id: r[0], domain: r[1], desc: r[2], guid: r[3], req: reqOf(r[0]) }));
  const byId = {};
  rows.forEach((r) => (byId[r.id] = byId[r.id] || []).push(r.n));
  rows.forEach((r) => {
    r.hay = (r.id + " \u0001 " + r.domain + " \u0001 " + r.desc + " \u0001 " + r.guid).toLowerCase();
    r.flags = [];
    if (byId[r.id].length > 1) r.flags.push(`Identifier appears ${byId[r.id].length}× in the file (rows ${byId[r.id].join(" and ")}). A single run keys controls by identifier, so one of them belongs elsewhere.`);
    if (!/^(A\d+|\d+)(\.\d+)+/.test(r.id)) r.flags.push("Not a control number: the model returned a section label as the identifier.");
    else if (/(\d[a-e]|\.[a-e])$/.test(r.id)) r.flags.push("Ends in a testing-procedure suffix (.a, .b…). The prompt tells the model to leave testing procedures out.");
    const dm = /^(?:Requirement|Appendix) (A?\d+)\b/.exec(r.domain);
    const ip = /^(A?\d+)\./.exec(r.id);
    if (ip && !dm) r.flags.push(`Domain is a column title (“${r.domain}”), not a requirement heading.`);
    else if (ip && dm[1] !== ip[1]) r.flags.push(`Domain heading says ${dm[1].startsWith("A") ? "Appendix" : "Requirement"} ${dm[1]}, identifier starts with ${ip[1]}.`);
  });
  return rows;
}

const X = { q: "", req: "all", review: false, list: [], sel: null };
const xel = {};

function initExplorer() {
  ["q", "chips", "rows", "count", "detail", "detailIn", "scrim", "exportBtn", "exportLbl"].forEach((id) => (xel[id] = $("#" + id)));
  // chips
  const counts = {}; ROWS.forEach((r) => { if (r.req) counts[r.req] = (counts[r.req] || 0) + 1; });
  const nRev = ROWS.filter((r) => r.flags.length).length;
  const chip = (k, label, n, extra = "") => `<button type="button" class="chip${extra}" data-k="${k}" aria-pressed="false">${label} <small>${n}</small></button>`;
  xel.chips.innerHTML = chip("all", "All", ROWS.length)
    + Array.from({ length: 12 }, (_, i) => chip(String(i + 1), "Req " + (i + 1), counts[String(i + 1)] || 0)).join("")
    + chip("A", "Appendix A1–A4", counts.A || 0)
    + chip("review", "Needs review", nRev, " chip--rev");
  syncChips();
  xel.chips.addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    const k = b.dataset.k;
    if (k === "review") X.review = !X.review; else X.req = k;
    syncChips(); applyFilter(true);
  });
  let qt;
  xel.q.addEventListener("input", () => { clearTimeout(qt); qt = setTimeout(() => { X.q = xel.q.value; applyFilter(true); }, 70); });
  xel.q.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1, true); }
    if (e.key === "Enter" && X.list.length) { e.preventDefault(); select(X.sel ?? X.list[0].n, true); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== xel.q && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); xel.q.focus(); }
    if (e.key === "Escape") closeSheet();
  });
  xel.rows.addEventListener("click", (e) => { const li = e.target.closest(".row"); if (li) select(+li.dataset.n, true); });
  xel.rows.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); move(1, true); }
    if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); move(-1, true); }
    if (e.key === "Enter") { const li = e.target.closest(".row"); if (li) select(+li.dataset.n, true); }
  });
  xel.scrim.addEventListener("click", closeSheet);
  xel.detail.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const a = b.dataset.act;
    if (a === "prev") move(-1, false, true);
    if (a === "next") move(1, false, true);
    if (a === "close") closeSheet();
    if (a === "copy") {
      const r = ROWS[X.sel - 1];
      const text = csvText([csvRow(r.n, { description: r.desc, domain: r.domain, identifier: r.id, guidance: r.guid })]);
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast(`Copied row ${r.n} (${r.id}) as CSV`), () => toast("Clipboard unavailable here"));
    }
  });
  xel.exportBtn.addEventListener("click", exportCsv);

  const st = store.get("explorer");
  if (st) { X.req = st.req || "all"; X.review = !!st.review; syncChips(); }
  applyFilter(false);
  if (!isSheet()) select(X.list.length ? X.list[0].n : null, false);
}

const isSheet = () => matchMedia("(max-width:1020px)").matches;

function syncChips() {
  xel.chips.querySelectorAll(".chip").forEach((b) => {
    const k = b.dataset.k;
    b.setAttribute("aria-pressed", String(k === "review" ? X.review : X.req === k));
  });
  store.set("explorer", { req: X.req, review: X.review });
}

function terms(q) { return q.toLowerCase().split(/\s+/).filter(Boolean); }

function applyFilter(userAction) {
  const ts = terms(X.q);
  const idq = /^a?\d+(\.\d+)*\.?$/i.test(X.q.trim()) ? X.q.trim().toLowerCase() : null;
  let list = ROWS.filter((r) => (X.req === "all" || r.req === X.req) && (!X.review || r.flags.length) && ts.every((t) => r.hay.includes(t)));
  if (idq) {
    const a = list.filter((r) => r.id.toLowerCase().startsWith(idq));
    list = a.concat(list.filter((r) => !r.id.toLowerCase().startsWith(idq)));
  }
  X.list = list;
  renderList(ts);
  const n = list.length;
  xel.exportLbl.textContent = `Export CSV · ${n} row${n === 1 ? "" : "s"}`;
  xel.exportBtn.disabled = n === 0;
  if (userAction && !isSheet()) {
    if (n && !list.some((r) => r.n === X.sel)) select(list[0].n, false);
    if (!n) renderDetail(null);
  }
}

function hl(text, ts) {
  let s = esc(text);
  if (!ts.length) return s;
  const re = new RegExp("(" + ts.map((t) => esc(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
  return s.replace(re, "<mark>$1</mark>");
}

function snippet(text, t) {
  const i = text.toLowerCase().indexOf(t); if (i < 0) return null;
  const a = Math.max(0, i - 40);
  return (a ? "…" : "") + text.slice(a, i + t.length + 60) + "…";
}

function renderList(ts) {
  const parts = [];
  const flt = X.req === "all" ? "" : X.req === "A" ? " in Appendix A1–A4" : ` in Requirement ${X.req}`;
  xel.count.textContent = `${X.list.length} of ${ROWS.length} controls${flt}${X.review ? " · needs review" : ""}${X.q.trim() ? ` · “${X.q.trim()}”` : ""}`;
  if (!X.list.length) { xel.rows.innerHTML = `<li class="noresult">No control matches. Try a broader word, or clear the requirement filter.</li>`; return; }
  for (const r of X.list) {
    let meta = esc(r.domain);
    if (ts.length) {
      const inDesc = ts.some((t) => r.desc.toLowerCase().includes(t) || r.id.toLowerCase().includes(t));
      if (!inDesc) { const t = ts.find((t) => r.guid.toLowerCase().includes(t)); const sn = t && snippet(r.guid, t); if (sn) meta = "guidance: " + hl(sn, ts); }
    }
    parts.push(`<li class="row" role="option" tabindex="-1" data-n="${r.n}" aria-selected="${r.n === X.sel}">
      <span class="rid">${hl(r.id, ts)}<i>row ${r.n}</i></span>
      <span class="rd">${r.flags.length ? '<span class="flag" title="needs review"></span>' : ""}${hl(r.desc, ts)}</span>
      <span class="rm">${meta}</span></li>`);
  }
  xel.rows.innerHTML = parts.join("");
  xel.rows.setAttribute("role", "listbox");
  const cur = xel.rows.querySelector('[aria-selected="true"]') || xel.rows.firstElementChild;
  if (cur) cur.tabIndex = 0;
}

function move(d, focus, fromDetail) {
  if (!X.list.length) return;
  let i = X.list.findIndex((r) => r.n === X.sel);
  i = i < 0 ? 0 : Math.max(0, Math.min(X.list.length - 1, i + d));
  select(X.list[i].n, fromDetail ? true : !isSheet(), focus);
}

function select(n, open, focus) {
  X.sel = n;
  xel.rows.querySelectorAll('.row[aria-selected="true"]').forEach((x) => { x.setAttribute("aria-selected", "false"); x.tabIndex = -1; });
  const li = n && xel.rows.querySelector(`.row[data-n="${n}"]`);
  if (li) {
    li.setAttribute("aria-selected", "true"); li.tabIndex = 0;
    if (focus) li.focus({ preventScroll: true });
    const r = li.getBoundingClientRect();
    if (focus && (r.top < 0 || r.bottom > innerHeight)) li.scrollIntoView({ block: "nearest" });
  }
  renderDetail(n ? ROWS[n - 1] : null);
  if (open && isSheet() && n) openSheet();
}

function openSheet() { xel.detail.classList.add("open"); xel.detail.setAttribute("aria-hidden", "false"); xel.scrim.hidden = false; }
function closeSheet() { if (!isSheet()) return; xel.detail.classList.remove("open"); xel.detail.setAttribute("aria-hidden", "true"); xel.scrim.hidden = true; }

function renderDetail(r) {
  xel.detail.setAttribute("aria-hidden", isSheet() ? String(!xel.detail.classList.contains("open")) : "false");
  if (!r) { xel.detailIn.innerHTML = '<p class="d-empty">Pick a control to see every column the pipeline wrote for it.</p>'; return; }
  const ts = terms(X.q);
  const e = (v) => (v === "" ? '<td class="e">(empty)</td>' : `<td>${esc(v)}</td>`);
  const fields = csvRow(r.n, { description: r.desc, domain: r.domain, identifier: r.id, guidance: r.guid });
  const shortCols = [[0, ""], [1, ""], [3, ""], [5, ""], [6, ""], [8, ""], [9, ""], [10, ""], [11, ""]];
  const raw = `<span class="k">CONTROL</span><span class="p">|</span>${esc(r.id)}<span class="p">|</span><span class="dm">${esc(r.domain)}</span><span class="p">|</span>${esc(r.desc)}<span class="p">|</span><span class="gd">${esc(r.guid)}</span>`;
  xel.detailIn.innerHTML = `
    <div class="d-top">
      <div><p class="d-id">${esc(r.id)}</p><p class="d-row">row ${r.n} of ${ROWS.length} · Framework (FK) ${FRAMEWORK_FK}</p></div>
      <div class="d-nav">
        <button class="btn" type="button" data-act="prev" aria-label="Previous control">↑</button>
        <button class="btn" type="button" data-act="next" aria-label="Next control">↓</button>
        <button class="btn d-close" type="button" data-act="close" aria-label="Close">✕</button>
      </div>
    </div>
    <p class="d-dom">${esc(r.domain)}</p>
    ${r.flags.length ? `<div class="d-flags"><b>Needs review before import</b><ul>${r.flags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></div>` : ""}
    <p class="d-h">Control Description</p><p class="d-txt">${hl(r.desc, ts)}</p>
    <p class="d-h">Implementation Guidance</p><p class="d-g">${r.guid ? hl(r.guid, ts) : '<span class="dim">(empty)</span>'}</p>
    <p class="d-h">The other CSV columns</p>
    <table class="d-csv"><tbody>${shortCols.map(([i]) => `<tr><th>${CSV_HEADER[i]}</th>${e(fields[i])}</tr>`).join("")}</tbody></table>
    <p class="d-h">The model line this row comes from</p>
    <pre class="d-raw">${raw}</pre>
    <div class="d-acts"><button class="btn" type="button" data-act="copy">Copy as CSV row</button></div>`;
}

function exportCsv() {
  const list = X.list.slice().sort((a, b) => a.n - b.n);        // file order, numbered from 1 like write_csv
  const rows = list.map((r, i) => csvRow(i + 1, { description: r.desc, domain: r.domain, identifier: r.id, guidance: r.guid }));
  const all = list.length === ROWS.length;
  const name = all ? "PCI_DSS_v4_Controls.csv" : "PCI_DSS_v4_Controls_filtered.csv";
  download(name, csvText([CSV_HEADER, ...rows]));
  commit(`csv: wrote ${rows.length} rows × 12 columns → ${name}`);
  toast(`Downloaded ${name} · ${rows.length} rows · 12 columns`);
}

/* ════════════════ E. AUTOPLAY TOUR ════════════════ */

let touring = false, tourTok = null;
function stopTour() { if (tourTok) tourTok.abort = true; }

async function tour() {
  if (touring) { stopTour(); return; }
  touring = true; tourTok = { abort: false };
  el.tourBtn.textContent = "Stop tour"; el.tourBtn.disabled = false;
  const T = tourTok;
  try {
    if (run) { run.abort = true; while (run) await sleep(50); }
    $("#replay").scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" });
    await sleep(500, T);
    if (state.last_page > START.last_page) resetReplay();             // start clean
    const p = onRun(false);
    // follow the stream; stop the tour if the user interrupts
    while (run) { if (T.abort) { run.abort = true; } await sleep(100); }
    await p;
    if (T.abort || nextIdx() >= 0) return;
    const li = el.outRows.querySelector(`[data-id="${SPLIT.id}"]`);
    if (li) { li.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "center" }); await sleep(2600, T); }
    $("#explorer").scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" });
    await sleep(900, T);
    X.req = "all"; X.review = false; syncChips();
    xel.q.value = ""; xel.q.focus({ preventScroll: true });
    for (const ch of "data-flow") { xel.q.value += ch; X.q = xel.q.value; applyFilter(true); await sleep(RM ? 0 : 110, T); }
    await sleep(700, T);
    const hit = ROWS.find((r) => r.id === "1.2.4");
    select(hit.n, true, false);
    await sleep(1800, T);
    closeSheet();
    xel.exportBtn.classList.add("tour-focus");
    xel.exportBtn.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "center" });
    toast("Tour done. Export CSV downloads the exact 12-column file.");
    await sleep(2400, T);
  } catch (e) {
    if (!(e instanceof Interrupted)) throw e;
  } finally {
    xel.exportBtn && xel.exportBtn.classList.remove("tour-focus");
    touring = false; tourTok = null;
    el.tourBtn.textContent = "Autoplay tour";
    updateButtons();
  }
}

// expose the ported functions for inspection and the verification script
window.PCIX = { parseResponse, processPage, sortKey, writeCsvRows, csvText, csvRow, CSV_HEADER, get rows() { return ROWS; } };
})();
