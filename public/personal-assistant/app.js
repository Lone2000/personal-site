/* Personal Assistant — "unbiased second-opinion engine" demo.
   Method (from the project README): 1) generate options, 2) ask what the person leans
   toward and why, 3) give each option a likelihood %, 4) cite the memory facts behind
   every % — and if a key fact is missing, ask for it instead of guessing.
   Everything below runs in the browser over a fictional profile ("Sam"). */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const KEY = "pa-demo:v1";
  const emit = (d) => window.dispatchEvent(new CustomEvent("demo:commit", { detail: d }));
  const wait = (ms) => new Promise((r) => setTimeout(r, RM ? Math.min(ms, 120) : ms));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const minus = (n) => (n > 0 ? "+" + n : n < 0 ? "−" + Math.abs(n) : "0");
  const wide = () => matchMedia("(min-width:1100px)").matches;

  /* ---------------- memory: Sam's profile (all fictional) ---------------- */
  const GROUPS = [["said", "Said today"], ["background", "Background"], ["goals", "Goals"], ["constraints", "Constraints"], ["values", "Values"], ["history", "History"]];
  const KIND = { said: "said today", background: "background", goals: "goal", constraints: "constraint", values: "value", history: "history" };

  const BASE_FACTS = [
    { id: "M-01", g: "background", t: "{v} yrs as a junior front-end developer", type: "num", v: 1.5, min: 0, max: 10, step: 0.5, src: "CV" },
    { id: "M-02", g: "background", t: "Main stack is TypeScript + React", type: "fixed", v: true, src: "CV" },
    { id: "M-03", g: "background", t: "BSc Computer Science, graduated with a {v}", type: "sel", v: "2:1", opts: ["First", "2:1", "2:2"], src: "CV" },
    { id: "M-04", g: "goals", t: "Wants to reach mid-level within {v} years", type: "num", v: 2, min: 1, max: 6, step: 1, src: "Sam · onboarding" },
    { id: "M-05", g: "goals", t: "Long-term direction: {v}", type: "sel", v: "product engineering", opts: ["product engineering", "ML / data", "front-end specialist"], src: "Sam · onboarding" },
    { id: "M-06", g: "goals", t: "{v} to buy a flat within 5 years", type: "bool", v: true, yes: "Wants", no: "Doesn't plan", src: "Sam · onboarding" },
    { id: "M-07", g: "constraints", t: "Lease ties Sam to this city for {v} more months", type: "num", v: 8, min: 0, max: 24, step: 1, src: "Sam · chat" },
    { id: "M-08", g: "constraints", t: "Savings runway: {v} months of expenses", type: "num", v: 4, min: 0, max: 24, step: 1, src: "Sam · budgeting chat" },
    { id: "M-09", g: "constraints", t: "{v} money home to a parent each month", type: "bool", v: true, yes: "Sends", no: "Doesn't send", src: "Sam · onboarding" },
    { id: "M-10", g: "constraints", t: "Partner {v} a job in this city", type: "bool", v: true, yes: "has", no: "doesn't have", src: "Sam · chat" },
    { id: "M-11", g: "constraints", t: "Tuition budget without borrowing: €{v}k", type: "num", v: 6, min: 0, max: 40, step: 1, src: "Sam · budgeting chat" },
    { id: "M-12", g: "values", t: "Risk appetite: {v} out of 5", type: "num", v: 2, min: 1, max: 5, step: 1, src: "Sam · correction" },
    { id: "M-13", g: "values", t: "{v} with a mentor nearby", type: "bool", v: true, yes: "Learns fastest", no: "Learns just as well without", src: "Sam · retro notes" },
    { id: "M-14", g: "values", t: "{v} remote work, at least part-time", type: "bool", v: true, yes: "Prefers", no: "Is fine without", src: "Sam · onboarding" },
    { id: "M-15", g: "values", t: "Living near family matters {v}", type: "bool", v: true, yes: "a lot", no: "less than it did", src: "Sam · chat" },
    { id: "M-16", g: "history", t: "Shipped a side project solo (habit tracker, ~400 users)", type: "fixed", v: true, src: "CV" },
    { id: "M-17", g: "history", t: "Burned out during a 3-month freelance stint", type: "fixed", v: true, src: "Sam · journal" },
    { id: "M-18", g: "history", t: "Got 2 interview callbacks from studios in a bigger city", type: "fixed", v: true, src: "Sam · chat", stale: true, age: "11 months old" },
    { id: "M-19", g: "history", t: "Dropped an online ML course at week 4", type: "fixed", v: true, src: "Sam · journal" },
    { id: "M-20", g: "history", t: "Manager promised a promotion review in {v} months", type: "num", v: 6, min: 1, max: 24, step: 1, src: "Sam · chat" },
  ];

  /* ---------------- decisions: options + weighted rules over memory ----------------
     rule = [factId, test(value), delta, why]. A rule only fires when the fact is
     remembered (switched on). Stale facts fire at half weight. */
  const yes = (v) => v === true, no = (v) => v === false;
  const DECISIONS = [
    {
      id: "contract", short: "Remote contract or local offer?",
      q: "Should I take the remote contract or the local full-time offer?",
      ctx: "Remote: 12-month contract, about 30% more pay, no benefits. Local: full-time at a 40-person product company, mentor assigned.",
      req: ["M-08", "M-09"],
      opts: [
        { k: "A", title: "Take the remote contract", base: 45, rules: [
          ["M-14", yes, 12, "prefers remote work"],
          ["M-14", no, -4, "no pull toward remote"],
          ["M-12", (v) => v >= 4, 10, "risk appetite {v}/5 suits a contract"],
          ["M-12", (v) => v <= 2, -8, "risk appetite only {v}/5"],
          ["M-08", (v) => v >= 6, 8, "{v}-month runway covers a gap between contracts"],
          ["M-08", (v) => v <= 4, -10, "only {v} months of runway if the contract ends early"],
          ["M-09", yes, -10, "money sent home needs a steady salary"],
          ["M-17", yes, -12, "burned out the last time working solo"],
          ["M-16", yes, 6, "has shipped alone before"],
          ["M-13", yes, -6, "no mentor on a solo contract"],
          ["M-06", yes, 3, "more pay toward a flat deposit"],
          ["M-01", (v) => v < 2, -5, "under 2 yrs in; contracts expect autonomy"],
          ["M-01", (v) => v >= 3, 6, "{v} yrs in; ready for autonomy"],
        ] },
        { k: "B", title: "Take the local full-time offer", base: 30, rules: [
          ["M-13", yes, 14, "mentor assigned, and Sam learns fastest that way"],
          ["M-04", (v) => v <= 2, 8, "structured path to mid-level in {v} yrs"],
          ["M-09", yes, 8, "steady salary covers the money sent home"],
          ["M-12", (v) => v <= 2, 6, "low risk appetite ({v}/5)"],
          ["M-05", (v) => v === "product engineering", 6, "product company fits the long-term direction"],
          ["M-14", yes, -6, "office-based; Sam prefers remote"],
          ["M-06", yes, 5, "permanent contract helps a mortgage"],
        ] },
        { k: "C", title: "Decline both, push for the promotion review", base: 22, rules: [
          ["M-20", (v) => v <= 6, 10, "promotion review is only {v} months away"],
          ["M-20", (v) => v > 6, -6, "promotion review is {v} months out"],
          ["M-12", (v) => v <= 2, 5, "lowest-risk path"],
          ["M-01", (v) => v < 2, -4, "under 2 yrs in; thin promotion case"],
          ["M-01", (v) => v >= 3, 6, "{v} yrs of tenure to argue from"],
        ] },
      ],
      leans: [
        { o: "A", key: "money", label: "A — the extra money", say: "Leaning A. The extra money would really help right now.", fact: "money matters most on the contract question" },
        { o: "B", key: "mentor", label: "B — a real mentor", say: "Leaning B. I want someone senior to learn from.", fact: "a senior mentor matters more than pay" },
        { o: "C", key: "stay", label: "C — avoid a big change", say: "Honestly C. I don't want to start over somewhere new.", fact: "wants to avoid a big change right now" },
        { o: null, key: "unsure", label: "Not sure yet", say: "No idea. That's why I'm asking." },
      ],
    },
    {
      id: "masters", short: "Master's now or in two years?",
      q: "Should I do a master's now, or in two years?",
      ctx: "A CS master's: quit and study full-time, study part-time while working, or wait and decide later.",
      req: ["M-11", "M-05"],
      opts: [
        { k: "A", title: "Full-time master's now", base: 34, rules: [
          ["M-05", (v) => v === "ML / data", 16, "the degree unlocks the ML / data direction"],
          ["M-05", (v) => v === "product engineering", -8, "product teams hire on shipped work, not degrees"],
          ["M-05", (v) => v === "front-end specialist", -10, "a front-end path rarely needs a master's"],
          ["M-03", (v) => v === "First", 8, "a First makes admission and funding likelier"],
          ["M-03", (v) => v === "2:2", -8, "a 2:2 narrows admission and funding"],
          ["M-11", (v) => v >= 12, 8, "€{v}k covers full-time tuition"],
          ["M-11", (v) => v < 8, -12, "€{v}k is below typical full-time tuition"],
          ["M-08", (v) => v < 6, -8, "{v} months of runway can't cover a year without salary"],
          ["M-09", yes, -10, "no salary means the money home stops"],
          ["M-19", yes, -8, "dropped the last ML course at week 4"],
        ] },
        { k: "B", title: "Part-time master's while working", base: 24, rules: [
          ["M-05", (v) => v === "ML / data", 8, "moves toward ML / data without quitting"],
          ["M-11", (v) => v >= 4, 8, "€{v}k covers part-time fees"],
          ["M-11", (v) => v < 4, -8, "€{v}k won't cover part-time fees"],
          ["M-09", yes, 6, "keeps the salary for the money sent home"],
          ["M-17", yes, -10, "burnout history; job plus study is a heavy load"],
          ["M-19", yes, -6, "self-paced study stalled before"],
        ] },
        { k: "C", title: "Work two more years, then decide", base: 28, rules: [
          ["M-04", (v) => v <= 2, 8, "mid-level in {v} yrs comes from shipping, not study"],
          ["M-05", (v) => v === "product engineering", 10, "product engineering rewards experience"],
          ["M-05", (v) => v === "front-end specialist", 12, "front-end growth happens on the job"],
          ["M-05", (v) => v === "ML / data", -6, "delays the ML / data direction"],
          ["M-06", yes, 6, "keeps saving toward a flat"],
          ["M-20", (v) => v <= 6, 5, "promotion review in {v} months"],
          ["M-08", (v) => v < 4, 4, "time to rebuild a {v}-month runway"],
        ] },
      ],
      leans: [
        { o: "A", key: "switch", label: "A — switch to ML sooner", say: "Leaning A. I want to get into ML before it's too late.", fact: "wants to switch into ML sooner rather than later" },
        { o: "B", key: "income", label: "B — keep my income", say: "Probably B. I can't stop earning.", fact: "keeping an income is non-negotiable" },
        { o: "C", key: "ready", label: "C — not ready yet", say: "C, I think. I don't feel ready to pick a field.", fact: "doesn't feel ready to pick a field" },
        { o: null, key: "unsure", label: "Not sure yet", say: "No idea. That's why I'm asking." },
      ],
    },
    {
      id: "move", short: "Move cities for a job?",
      q: "Should I move cities for a job?",
      ctx: "A studio in a bigger city wants Sam to start in 6 weeks: about 20% more pay, higher rent.",
      req: ["M-07", "M-10"],
      opts: [
        { k: "A", title: "Move now and break the lease", base: 40, rules: [
          ["M-07", (v) => v > 2, -12, "{v} months left on the lease"],
          ["M-07", (v) => v <= 2, 6, "lease is nearly done"],
          ["M-10", yes, -14, "partner's job is in this city"],
          ["M-10", no, 4, "no partner job tying Sam here"],
          ["M-15", yes, -8, "living near family matters a lot"],
          ["M-18", yes, 10, "two callbacks from studios there"],
          ["M-12", (v) => v >= 4, 8, "risk appetite {v}/5"],
          ["M-12", (v) => v <= 2, -6, "risk appetite only {v}/5"],
          ["M-08", (v) => v < 3, -8, "moving costs vs a {v}-month runway"],
        ] },
        { k: "B", title: "Negotiate a later start, move when the lease ends", base: 26, rules: [
          ["M-07", (v) => v >= 3 && v <= 9, 10, "start after the {v}-month lease runs out"],
          ["M-07", (v) => v > 9, -6, "few offers wait {v} months"],
          ["M-18", yes, 6, "callbacks suggest that market wants Sam"],
          ["M-10", yes, -8, "partner still needs a plan"],
          ["M-12", (v) => v <= 3, 4, "less risk than moving now"],
          ["M-13", yes, 4, "in-person team with seniors"],
        ] },
        { k: "C", title: "Stay, and target remote-first roles", base: 26, rules: [
          ["M-14", yes, 12, "prefers remote work"],
          ["M-10", yes, 10, "partner's job stays put"],
          ["M-15", yes, 8, "stays near family"],
          ["M-02", yes, 6, "TypeScript + React is a well-hired remote stack"],
          ["M-01", (v) => v < 2, -8, "remote teams hire few devs under 2 yrs"],
          ["M-13", yes, -6, "remote means less mentoring"],
        ] },
      ],
      leans: [
        { o: "A", key: "market", label: "A — bigger market", say: "A. The bigger market is where I'd grow fastest.", fact: "thinks a bigger market means faster growth" },
        { o: "B", key: "both", label: "B — best of both", say: "B feels like the best of both.", fact: "wants the move, but on a calmer timeline" },
        { o: "C", key: "people", label: "C — my people are here", say: "C. My people are here.", fact: "being close to people here comes first" },
        { o: null, key: "unsure", label: "Not sure yet", say: "No idea. That's why I'm asking." },
      ],
    },
  ];
  const DEC = Object.fromEntries(DECISIONS.map((d) => [d.id, d]));

  /* the question to ask when a required fact is missing */
  const ASK = {
    "M-08": { q: "If your income stopped, how many months of expenses could you cover?", unit: "months" },
    "M-09": { q: "Do you still send money home to a parent each month?", choices: [[true, "Yes, every month"], [false, "Not any more"]] },
    "M-11": { q: "What could you spend on tuition without borrowing?", unit: "€k" },
    "M-05": { q: "What should the degree unlock? Where do you want to be long-term?", choices: [["product engineering", "Product engineering"], ["ML / data", "ML / data"], ["front-end specialist", "Front-end specialist"]] },
    "M-07": { q: "How many months are left on your lease?", unit: "months" },
    "M-10": { q: "Does a partner's job tie you to this city?", choices: [[true, "Yes"], [false, "No"]] },
  };

  /* ---------------- state ---------------- */
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let mem = [];          // fact objects (+ on flag)
  const S = { dec: null, phase: "idle", lean: null, tok: 0, asked: new Set(), qEls: {}, summaryEl: null, last: null, tipShown: false, touring: false };

  function defaults() { return BASE_FACTS.map((f) => ({ ...clone(f), on: true })); }
  function load() {
    mem = defaults();
    try {
      const raw = localStorage.getItem(KEY); if (!raw) return;
      const saved = JSON.parse(raw);
      for (const s of saved.facts || []) {
        const f = mem.find((x) => x.id === s.id);
        if (f) Object.assign(f, { on: s.on, v: s.v, stale: s.stale, src: s.src });
        else if (s.type === "said") mem.push(s);
      }
    } catch (e) { /* storage unavailable or bad JSON: use the sample profile */ }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ facts: mem.map((f) => f.type === "said" ? f : { id: f.id, on: f.on, v: f.v, stale: f.stale, src: f.src }) })); } catch (e) { /* ignore */ }
  }
  const F = (id) => mem.find((f) => f.id === id);

  function disp(f, v = f.v) {
    if (f.type === "bool") return v ? f.yes : f.no;
    return String(v);
  }
  function factText(f) {
    if (f.type === "said") return "Said: " + f.t;
    return f.t.replace("{v}", disp(f));
  }
  const logText = (f) => f.type === "said" ? `said today: ${f.t}` : `${KIND[f.g]}: ${factText(f).replace(/^./, (c) => c.toLowerCase())}`;

  /* ---------------- scoring (deterministic) ---------------- */
  function pctRound(raws) {
    const tot = raws.reduce((a, b) => a + b, 0);
    const exact = raws.map((r) => (r * 100) / tot);
    const fl = exact.map(Math.floor);
    let left = 100 - fl.reduce((a, b) => a + b, 0);
    exact.map((e, i) => [e - fl[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { fl[i]++; left--; } });
    return fl;
  }
  function score(dec) {
    const missing = dec.req.filter((id) => !F(id).on);
    const read = new Set();
    for (const o of dec.opts) for (const [id] of o.rules) if (F(id).on) read.add(id);
    if (missing.length) return { missing, read };
    const said = mem.find((f) => f.type === "said" && f.dec === dec.id && f.on);
    const opts = dec.opts.map((o) => {
      let raw = o.base; const fired = [];
      for (const [id, test, d, why] of o.rules) {
        const f = F(id);
        if (!f.on || !test(f.v)) continue;
        const dd = f.stale ? Math.round(d * 0.5) : d;
        raw += dd;
        fired.push({ id, d: dd, why: why.replace("{v}", disp(f)), stale: !!f.stale });
      }
      if (said && said.o === o.k) { raw += 5; fired.push({ id: said.id, d: 5, why: "said today: " + said.t, stale: false }); read.add(said.id); }
      fired.sort((a, b) => Math.abs(b.d) - Math.abs(a.d) || a.id.localeCompare(b.id));
      return { k: o.k, title: o.title, raw: Math.max(3, raw), fired };
    });
    const pcts = pctRound(opts.map((o) => o.raw));
    opts.forEach((o, i) => (o.pct = pcts[i]));
    return { missing: [], read, opts };
  }

  /* ---------------- memory panel ---------------- */
  const memList = $("#memList");
  function control(f) {
    if (f.type === "num") return `<input class="val" type="number" inputmode="decimal" data-id="${f.id}" min="${f.min}" max="${f.max}" step="${f.step}" value="${f.v}" style="width:${String(f.v).length + 1.4}ch" aria-label="${f.id} value">`;
    if (f.type === "sel") return `<select class="val" data-id="${f.id}" aria-label="${f.id} value">${f.opts.map((o) => `<option${o === f.v ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    if (f.type === "bool") return `<select class="val" data-id="${f.id}" aria-label="${f.id} value"><option value="1"${f.v ? " selected" : ""}>${esc(f.yes)}</option><option value="0"${!f.v ? " selected" : ""}>${esc(f.no)}</option></select>`;
    return "";
  }
  function factHTML(f) {
    const tx = f.type === "said" ? `Said: “${esc(f.t)}”` : f.t.includes("{v}") && f.type !== "fixed" ? f.t.split("{v}").map(esc).join(control(f)) : esc(f.t);
    return `<div class="fact${f.type === "said" ? " said" : ""}" data-fact="${f.id}">
      <span class="id">${f.id}</span>
      <div><div class="tx">${tx}</div><div class="meta"><span class="src">${esc(f.src)}</span><span class="stl"></span><span class="drvs"></span></div></div>
      <button type="button" class="sw" role="switch" aria-checked="${f.on}" aria-label="Remember ${f.id}" data-sw="${f.id}"></button></div>`;
  }
  function renderMemory() {
    let h = "";
    for (const [g, name] of GROUPS) {
      const fs = mem.filter((f) => f.g === g);
      if (!fs.length) continue;
      h += `<div class="grp">${name}</div>` + fs.map(factHTML).join("");
    }
    memList.innerHTML = h;
    fitSelects();
    refreshMemory();
  }
  function fitSelects() { for (const el of $$("select.val", memList)) el.style.width = el.options[el.selectedIndex].text.length + 1 + "ch"; }
  function refreshMemory(r = S.last) {
    const on = mem.filter((f) => f.on).length;
    $("#memCnt").textContent = `${mem.length} facts · ${on} remembered`;
    $("#factCount").textContent = `${on} facts`;
    const drv = {};
    if (r && r.opts) for (const o of r.opts) for (const x of o.fired) (drv[x.id] ||= []).push([o.k, x.d]);
    for (const row of $$(".fact", memList)) {
      const f = F(row.dataset.fact); if (!f) continue;
      row.classList.toggle("off", !f.on);
      const sw = $(".sw", row); sw.setAttribute("aria-checked", String(f.on));
      $(".src", row).textContent = f.src;
      $(".stl", row).innerHTML = f.stale ? `<span class="stale">stale · ${esc(f.age)}</span> <button type="button" data-confirm="${f.id}">still true?</button>` : "";
      const d = drv[f.id];
      $(".drvs", row).innerHTML = d && f.on ? d.map(([k, v]) => `<span class="drv" style="--c:var(--${k})">${k} ${minus(v)}</span>`).join("") : "";
    }
  }
  function changeFact(id, mutate, line) {
    const f = F(id); if (!f) return;
    mutate(f);
    save(); emit(line(f)); refreshMemory();
    if (S.dec && (S.phase === "odds" || S.phase === "missing")) {
      evaluate({ cause: id });
      if (S.phase === "missing") pill("it needs an answer \u2191", "thread"); else pill("odds re-scored \u2191 see them", "fork");
    }
  }
  memList.addEventListener("click", (e) => {
    const sw = e.target.closest("[data-sw]");
    if (sw) {
      const id = sw.dataset.sw;
      changeFact(id, (f) => { f.on = !f.on; }, (f) => f.on ? `memory: restored ${f.id} (${logText(f)})` : `memory: forgot ${f.id} (${logText(f)})`);
      return;
    }
    const c = e.target.closest("[data-confirm]");
    if (c) confirmStale(c.dataset.confirm, true);
  });
  memList.addEventListener("change", (e) => {
    const el = e.target.closest(".val"); if (!el) return;
    const f = F(el.dataset.id); const old = disp(f);
    let v;
    if (f.type === "num") {
      v = parseFloat(el.value);
      if (!isFinite(v)) { el.value = f.v; return; }
      v = Math.min(f.max, Math.max(f.min, Math.round(v / f.step) * f.step));
      el.value = v; el.style.width = String(v).length + 1.4 + "ch";
    } else if (f.type === "bool") v = el.value === "1";
    else v = el.value;
    fitSelects();
    if (v === f.v) return;
    changeFact(f.id, (x) => { x.v = v; x.src = "Sam · edited just now"; }, (x) => `memory: updated ${x.id} (${KIND[x.g]}) ${old} → ${disp(x)}`);
  });
  memList.addEventListener("pointerover", (e) => { const row = e.target.closest(".fact"); litReceipts(row ? row.dataset.fact : null); });
  memList.addEventListener("pointerleave", () => litReceipts(null));
  function litReceipts(id) { for (const c of $$(".rcp")) c.classList.toggle("lit", !!id && c.dataset.fact === id); }
  function litFact(id) { for (const r of $$(".fact", memList)) r.classList.toggle("lit", !!id && r.dataset.fact === id); }
  function showFact(id, fromReceipt) {
    const row = $(`.fact[data-fact="${id}"]`, memList); if (!row) return;
    if (wide()) {
      const top = row.offsetTop - memList.offsetTop - memList.clientHeight / 2 + row.offsetHeight / 2;
      memList.scrollTo({ top, behavior: RM ? "auto" : "smooth" });
    } else {
      row.scrollIntoView({ block: "center", behavior: RM ? "auto" : "smooth" });
      if (fromReceipt) pill("back to the odds", ".forkpane");
    }
    row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash");
  }
  function confirmStale(id, still) {
    if (still) changeFact(id, (f) => { f.stale = false; f.src = "Sam · confirmed just now"; }, (f) => `memory: confirmed ${f.id} still current (full weight now)`);
    else changeFact(id, (f) => { f.on = false; }, (f) => `memory: forgot ${f.id} (no longer true)`);
  }

  /* ---------------- stepper ---------------- */
  function steps(phase) {
    const st = { idle: ["active", "", "", ""], options: ["done", "active", "", ""], ask: ["done", "active", "", ""],
      missing: ["done", "done", "blocked", ""], odds: ["done", "done", "done", "done"] }[phase] || ["", "", "", ""];
    $$("#stepper li").forEach((li, i) => {
      li.className = st[i];
      if (i === 2) $("span", li).textContent = phase === "missing" ? "Needs data" : "Odds";
    });
  }

  /* ---------------- the fork (option signs + road) ---------------- */
  const signsEl = $("#signs"), road = $("#road"), you = $("#you"), wrap = $("#signsWrap");
  function emptyFork() {
    $("#forkTitle").textContent = "waiting for a decision";
    signsEl.innerHTML = ["A", "B", "C"].map((k) => `<div class="sign empty" data-o="${k}"><div class="ok">OPTION ${k}</div><div class="ot">pick a decision to see this path</div></div>`).join("");
    drawRoad();
  }
  function buildFork(dec) {
    $("#forkTitle").textContent = dec.short;
    signsEl.innerHTML = dec.opts.map((o) => `<div class="sign wait" data-o="${o.k}">
      <div class="ok"><span>OPTION ${o.k}</span><span class="lean" hidden>YOU LEAN HERE</span></div>
      <div class="ot">${esc(o.title)}</div>
      <div class="pc"><span class="n" data-v="0">—</span><span class="u">odds after your view</span></div>
      <div class="bar"><i></i></div><div class="rc"></div></div>`).join("");
    drawRoad();
  }
  function drawRoad(r) {
    const signs = $$(".sign", signsEl);
    const H = signsEl.offsetHeight;
    const X = wide() || innerWidth > 560 ? 26 : 20;
    road.setAttribute("height", H); road.style.height = H + "px";
    road.setAttribute("viewBox", `0 0 60 ${H}`);
    const ys = signs.map((s) => s.offsetTop + Math.min(60, s.offsetHeight / 2));
    const endX = signs.length ? signs[0].offsetLeft + 4 : 60;
    const pct = (k) => (r && r.opts ? r.opts.find((o) => o.k === k).pct : null);
    let h = `<path class="trunk" d="M${X},${H} L${X},${(ys[0] || 0) + 26}"/>`;
    signs.forEach((s, i) => {
      const y = ys[i], p = pct(s.dataset.o);
      const w = p == null ? 10 : 6 + p * 0.28;
      h += `<path style="stroke-width:${w}px" d="M${X},${y + 30} C${X},${y + 6} ${X + 8},${y} ${endX},${y}"/>`;
    });
    road.innerHTML = h;
    // the walker: waits at the bottom, then walks up to the best option's fork
    let ty = H - 22;
    if (r && r.opts) { const best = r.opts.reduce((a, b) => (b.pct > a.pct ? b : a)); const i = signs.findIndex((s) => s.dataset.o === best.k); if (i >= 0) ty = ys[i] + 18; }
    you.style.left = X - 10 + "px";
    you.style.transform = `translateY(${Math.max(0, ty - 10)}px)`;
  }
  new ResizeObserver(() => drawRoad(S.phase === "odds" ? S.last : null)).observe(signsEl);

  function tween(el, to) {
    const from = +el.dataset.v || 0; el.dataset.v = to;
    if (RM || from === to) { el.textContent = to; return; }
    const t0 = performance.now(), dur = 850;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function receiptHTML(x, i) {
    return `<button type="button" class="rcp" data-fact="${x.id}" style="animation-delay:${0.25 + i * 0.08}s">
      <span>${esc(x.why)}</span><span class="d ${x.d > 0 ? "p" : "m"}">${minus(x.d)}</span>
      <s>${x.id} · ${esc(F(x.id).src)}${x.stale ? " · stale, ½ weight" : ""}</s></button>`;
  }
  function paintOdds(r, fresh) {
    const best = Math.max(...r.opts.map((o) => o.pct));
    for (const o of r.opts) {
      const s = $(`.sign[data-o="${o.k}"]`, signsEl); if (!s) continue;
      s.classList.remove("wait", "need"); s.classList.toggle("best", o.pct === best);
      $(".need-note", s)?.remove();
      tween($(".n", s), o.pct);
      $(".u", s).textContent = "% likely the right fit";
      $(".bar i", s).style.width = o.pct + "%";
      const rc = $(".rc", s), open = rc.dataset.open === "1";
      const list = open ? o.fired : o.fired.slice(0, 4);
      rc.innerHTML = (list.length ? list.map(receiptHTML).join("") : `<span class="rcp"><span>no stored fact moved this option; base rate only</span></span>`) +
        (o.fired.length > 4 ? `<button type="button" class="more" data-more="${o.k}">${open ? "show fewer" : `+${o.fired.length - 4} more receipts`}</button>` : "");
      if (!fresh) $$(".rcp", rc).forEach((c) => (c.style.animation = "none"));
    }
    drawRoad(r);
  }
  function paintNeed(missing) {
    for (const s of $$(".sign", signsEl)) {
      s.classList.remove("wait", "best"); s.classList.add("need");
      const n = $(".n", s); n.textContent = "?"; n.dataset.v = 0;
      $(".u", s).textContent = "not enough data";
      $(".bar i", s).style.width = "0";
      $(".rc", s).innerHTML = "";
      if (!$(".need-note", s)) s.insertAdjacentHTML("beforeend", `<div class="need-note"></div>`);
      $(".need-note", s).textContent = `Won't guess without ${missing.join(" + ")}.`;
    }
    drawRoad(null);
  }
  signsEl.addEventListener("click", (e) => {
    const m = e.target.closest("[data-more]");
    if (m) { const rc = m.parentElement; rc.dataset.open = rc.dataset.open === "1" ? "0" : "1"; if (S.last && S.last.opts) paintOdds(S.last, false); return; }
    const c = e.target.closest(".rcp[data-fact]"); if (c) showFact(c.dataset.fact, true);
  });
  signsEl.addEventListener("pointerover", (e) => { const c = e.target.closest(".rcp[data-fact]"); litFact(c ? c.dataset.fact : null); });
  signsEl.addEventListener("pointerleave", () => litFact(null));

  /* ---------------- conversation ---------------- */
  const thread = $("#thread");
  function add(kind, html) {
    const el = document.createElement("div");
    el.className = "msg " + kind; el.innerHTML = html;
    thread.appendChild(el);
    el.scrollIntoView({ block: "nearest", behavior: RM ? "auto" : "smooth" });
    return el;
  }
  async function typing(tok, ms = 650) {
    const el = add("ai typing", "<i></i><i></i><i></i>");
    await wait(ms); el.remove();
    return tok === S.tok;
  }
  const ref = (id) => `<button type="button" class="ref" data-fact="${id}">${id}</button>`;
  thread.addEventListener("click", (e) => {
    const r = e.target.closest(".ref"); if (r) { showFact(r.dataset.fact, false); return; }
    const l = e.target.closest("[data-lean]"); if (l) { pickLean(l.dataset.lean, l); return; }
    const st = e.target.closest("[data-stale]"); if (st) { confirmStale(st.dataset.id, st.dataset.stale === "1"); st.parentElement.querySelectorAll("button").forEach((b) => (b.disabled = true)); return; }
    const ch = e.target.closest("[data-ans]"); if (ch) { answer(ch.dataset.id, JSON.parse(ch.dataset.ans), ch.textContent); return; }
  });
  thread.addEventListener("submit", (e) => {
    const fm = e.target.closest(".qform"); if (!fm) return;
    e.preventDefault();
    const inp = $("input", fm), f = F(fm.dataset.id);
    const v = parseFloat(inp.value);
    if (!isFinite(v) || v < f.min || v > f.max) { inp.focus(); inp.select(); return; }
    answer(f.id, v, `${v} ${ASK[f.id].unit}`);
  });
  thread.addEventListener("pointerover", (e) => { const r = e.target.closest(".ref"); litFact(r ? r.dataset.fact : null); });

  /* decision picker */
  const picker = $("#picker");
  picker.innerHTML = DECISIONS.map((d, i) => `<button type="button" class="chip${i === 0 ? " pulse" : ""}" data-dec="${d.id}">${esc(d.short)}${i === 0 ? '<span class="tag">start here</span>' : ""}</button>`).join("");
  picker.addEventListener("click", (e) => { const b = e.target.closest("[data-dec]"); if (b) startDecision(b.dataset.dec); });

  async function startDecision(id, typed) {
    const dec = DEC[id], tok = ++S.tok;
    Object.assign(S, { dec, phase: "options", lean: null, asked: new Set(), qEls: {}, summaryEl: null, last: null });
    $$(".chip", picker).forEach((c) => { c.classList.toggle("on", c.dataset.dec === id); c.classList.remove("pulse"); $(".tag", c)?.remove(); });
    thread.innerHTML = "";
    $("#backPill").hidden = true;
    refreshMemory(null);
    add("me", esc(typed || dec.q));
    if (!(await typing(tok))) return;
    add("ai", `Three realistic paths, including one people usually skip (C).<span class="ctx">${esc(dec.ctx)}</span>`);
    buildFork(dec);
    steps("options");
    emit(`decision: "${dec.short}" → 3 options generated`);
    if (!wide()) await wait(400);
    if (!(await typing(tok, 700))) return;
    add("ai ask", `Before I give odds: which are you leaning toward, and why?<div class="row">${dec.leans.map((l) => `<button type="button" class="chip" data-lean="${l.key}">${esc(l.label)}</button>`).join("")}</div>`);
    S.phase = "ask"; steps("ask");
  }

  async function pickLean(key, btn) {
    if (S.phase !== "ask") return;
    const dec = S.dec, tok = S.tok, lean = dec.leans.find((l) => l.key === key);
    S.lean = lean; S.phase = "leaned";
    $$("[data-lean]", btn.parentElement).forEach((b) => { b.disabled = true; b.classList.toggle("picked", b === btn); });
    add("me", esc(lean.say));
    $$(".sign .lean", signsEl).forEach((t) => (t.hidden = t.closest(".sign").dataset.o !== lean.o));
    if (lean.o) {
      let f = mem.find((x) => x.type === "said" && x.dec === dec.id);
      if (!f) {
        const n = Math.max(...mem.map((x) => parseInt(x.id.slice(2), 10))) + 1;
        f = { id: "M-" + String(n).padStart(2, "0"), g: "said", type: "said", dec: dec.id };
        mem.push(f);
      }
      Object.assign(f, { t: lean.fact, o: lean.o, on: true, src: "Sam · just now" });
      save(); renderMemory();
      emit(`memory: wrote ${f.id} (said today: ${lean.fact})`);
      add("sys", `memory ← saved as <i>${f.id}</i>: “${esc(lean.fact)}”`);
      if (wide()) showFact(f.id, false);
    } else add("sys", "nothing new to save · scoring on memory alone");
    if (!(await typing(tok, 800))) return;
    evaluate({ first: true });
  }

  async function answer(id, v, label) {
    const f = F(id), tok = S.tok;
    const q = S.qEls[id];
    if (q) { $$("button,input", q).forEach((b) => (b.disabled = true)); q.classList.add("old"); }
    Object.assign(f, { v, on: true, src: "Sam · answered just now" });
    if (f.stale) f.stale = false;
    save(); refreshMemory();
    // keep the editable control in the memory panel in sync
    const ctl = $(`.val[data-id="${id}"]`, memList);
    if (ctl) { ctl.value = f.type === "bool" ? (v ? "1" : "0") : v; if (f.type === "num") ctl.style.width = String(v).length + 1.4 + "ch"; }
    fitSelects();
    add("me", esc(label));
    emit(`memory: wrote ${id} (${logText(f)}) from Sam's answer`);
    add("sys", `memory ← <i>${id}</i> ${esc(factText(f))}`);
    if (wide()) showFact(id, false);
    delete S.qEls[id]; S.asked.delete(id);
    if (!(await typing(tok, 600))) return;
    evaluate({ cause: id, answered: true });
  }

  function askMissing(r) {
    const id = r.missing[0], f = F(id), a = ASK[id];
    if (S.asked.has(id)) return;
    S.asked.add(id);
    const others = r.missing.slice(1);
    const form = a.choices
      ? `<div class="row">${a.choices.map(([v, l]) => `<button type="button" class="chip" data-id="${id}" data-ans='${JSON.stringify(v)}'>${esc(l)}</button>`).join("")}</div>`
      : `<form class="qform" data-id="${id}"><input type="number" inputmode="decimal" min="${f.min}" max="${f.max}" step="${f.step}" aria-label="${esc(a.q)}"><span class="unit">${esc(a.unit)}</span><button class="go" type="submit">Save to memory</button></form>`;
    const el = add("ai", `<span class="missing-k">NOT ENOUGH DATA</span>I'd be guessing without ${ref(id)} (${esc(KIND[f.g])}), so no odds yet. ${others.length ? `I'll also need ${others.map(ref).join(", ")}. ` : ""}One question first:<br><i>${esc(a.q)}</i>${form}`);
    S.qEls[id] = el;
    emit(`gate: ${id} missing → asked instead of guessing`);
  }

  function evaluate({ first = false, cause = null } = {}) {
    if (!S.dec) return;
    const r = score(S.dec), prev = S.last;
    // questions whose fact came back (e.g. switched on in the memory panel) are resolved
    for (const [id, el] of Object.entries(S.qEls)) if (F(id).on) { $$("button,input", el).forEach((b) => (b.disabled = true)); el.classList.add("old"); el.insertAdjacentHTML("beforeend", `<span class="note">answered from memory</span>`); delete S.qEls[id]; S.asked.delete(id); }
    if (r.missing.length) {
      S.phase = "missing"; S.last = r; steps("missing");
      paintNeed(r.missing); refreshMemory(null);
      if (S.summaryEl) S.summaryEl.classList.add("old");
      askMissing(r);
      return;
    }
    const firstOdds = !prev || !prev.opts;
    if (first || firstOdds) {
      [...r.read].sort().forEach((id) => emit(`memory: read ${id} (${logText(F(id))})`));
      emit(`score: ${r.opts.map((o) => `${o.k} ${o.pct}%`).join(" · ")} (${r.read.size} facts read)`);
    } else {
      const moved = r.opts.filter((o, i) => o.pct !== prev.opts[i].pct);
      emit(moved.length ? `score: ${r.opts.map((o, i) => o.pct === prev.opts[i].pct ? `${o.k} ${o.pct}%` : `${o.k} ${prev.opts[i].pct}→${o.pct}%`).join(" · ")}${cause ? ` (after ${cause})` : ""}` : `score: unchanged${cause ? ` after ${cause}` : ""}`);
    }
    S.phase = "odds"; S.last = r; steps("odds");
    paintOdds(r, firstOdds);
    refreshMemory(r);
    summarize(r, prev && prev.opts ? prev : null, cause);
    if (first && !wide() && !S.touring) setTimeout(() => $(".forkpane").scrollIntoView({ block: "start", behavior: RM ? "auto" : "smooth" }), 250);
  }

  function summarize(r, prev, cause) {
    const by = [...r.opts].sort((a, b) => b.pct - a.pct);
    const top = by[0], second = by[1], lean = S.lean && S.lean.o;
    const drv = (x) => `${ref(x.id)} ${esc(x.why)} (${minus(x.d)})`;
    let h = "";
    if (!lean) h = `On what I know, the strongest fit is <b>${top.k}. ${esc(top.title)}</b> at ${top.pct}%.`;
    else if (lean === top.k) h = `You lean ${lean}, and the receipts agree: <b>${top.k}. ${esc(top.title)}</b> at ${top.pct}%.`;
    else {
      const L = r.opts.find((o) => o.k === lean);
      h = `Honest read: you lean ${lean}, but the data points to <b>${top.k}. ${esc(top.title)}</b> (${top.pct}% vs ${L.pct}%).`;
      const drag = L.fired.filter((x) => x.d < 0).sort((a, b) => a.d - b.d)[0];
      if (drag) h += ` What pulls ${lean} down most: ${drv(drag)}.`;
    }
    const best = top.fired.filter((x) => x.d > 0).sort((a, b) => b.d - a.d)[0];
    if (best) h += ` Biggest driver for ${top.k}: ${drv(best)}.`;
    if (top.pct - second.pct < 8) h += ` It's close between ${top.k} and ${second.k}; one more fact could flip it.`;
    const stale = r.opts.flatMap((o) => o.fired).find((x) => x.stale);
    if (stale) { const f = F(stale.id); h += `<span class="note">${ref(f.id)} is ${esc(f.age)}, so I gave it half weight. Is it still true?</span><div class="row"><button type="button" class="chip" data-stale="1" data-id="${f.id}">Still true</button><button type="button" class="chip" data-stale="0" data-id="${f.id}">Not any more</button></div>`; }
    if (prev && cause) h += `<span class="note upd">re-scored after ${esc(cause)} changed</span>`;
    const inPlace = S.summaryEl && S.summaryEl === thread.lastElementChild;
    const tip = inPlace ? S.summaryEl.dataset.tip === "1" : !S.tipShown;
    if (tip) { S.tipShown = true; h += `<span class="note">Try it: switch off any fact in Sam's memory, or edit a value. Odds and receipts re-score live.</span>`; }
    if (inPlace) { S.summaryEl.innerHTML = h; S.summaryEl.classList.remove("old"); S.summaryEl.scrollIntoView({ block: "nearest", behavior: RM ? "auto" : "smooth" }); }
    else { if (S.summaryEl) S.summaryEl.classList.add("old"); S.summaryEl = add("ai", h); }
    S.summaryEl.dataset.tip = tip ? "1" : "0";
  }

  /* typed questions route to the closest preset */
  $("#composer").addEventListener("submit", async (e) => {
    e.preventDefault();
    const inp = $("#ask"), txt = inp.value.trim(); if (!txt) return;
    inp.value = "";
    const t = txt.toLowerCase();
    const id = /master|degree|study|msc|grad school|uni/.test(t) ? "masters" : /move|city|cities|relocat|lease/.test(t) ? "move" : /remote|contract|offer|full.?time|job/.test(t) ? "contract" : null;
    if (id) return startDecision(id, txt);
    const tok = ++S.tok;
    add("me", esc(txt));
    if (!(await typing(tok))) return;
    add("ai", "In this demo I only hold rules for three decisions: the remote contract, the master's, and moving cities. Pick one above, or ask about one of those.");
  });

  const backPill = $("#backPill");
  let pillT = 0;
  function pill(text, target) {
    if (wide() || S.touring) return;
    backPill.textContent = text; backPill.dataset.to = target; backPill.hidden = false;
    clearTimeout(pillT); pillT = setTimeout(() => (backPill.hidden = true), 7000);
  }
  backPill.addEventListener("click", () => {
    backPill.hidden = true;
    const t = backPill.dataset.to === "thread" ? thread.lastElementChild : $(".forkpane");
    t && t.scrollIntoView({ block: "start", behavior: RM ? "auto" : "smooth" });
  });

  /* ---------------- scripted tour ---------------- */
  const tourCap = $("#tourCap"), tourBtn = $("#tourBtn");
  function cap(t) { tourCap.hidden = false; $("#tourTxt").textContent = t; }
  async function ring(el, ms = 900) {
    if (!el) return;
    if (wide() && el.closest(".mem")) showFact(el.closest(".fact").dataset.fact, false);
    else el.scrollIntoView({ block: "center", behavior: RM ? "auto" : "smooth" });
    el.classList.add("tour-ring"); await wait(ms); el.classList.remove("tour-ring");
  }
  async function until(fn, ms = 6000) { const t0 = Date.now(); while (!fn() && Date.now() - t0 < ms) await wait(80); }
  function stopTour() { S.touring = false; tourBtn.textContent = "Run the tour"; tourBtn.classList.remove("on"); tourCap.hidden = true; }
  async function tour() {
    if (S.touring) return stopTour();
    S.touring = true; tourBtn.textContent = "Stop tour"; tourBtn.classList.add("on");
    const live = () => S.touring;
    mem = defaults(); save(); renderMemory(); S.tipShown = false;
    emit("tour: memory reset to Sam's sample profile");
    const sw = (id) => $(`[data-sw="${id}"]`, memList);
    // on narrow screens the memory sits below the odds, so bring the result into view
    const look = async (el) => { if (wide() || !el) return; await wait(450); el.scrollIntoView({ block: "start", behavior: RM ? "auto" : "smooth" }); };
    const script = [
      ["1/6 · Bring a decision. It lays out three paths.", async () => { const b = $('[data-dec="contract"]', picker); await ring(b); b.click(); await until(() => S.phase === "ask"); await wait(1200); }],
      ["2/6 · It asks your view first. Say you lean A, for the money.", async () => { const b = $('[data-lean="money"]', thread); await ring(b); b.click(); await until(() => S.phase === "odds"); await wait(RM ? 400 : 3200); }],
      ["3/6 · Forget a memory: M-17 (burnout). A's odds climb.", async () => { const b = sw("M-17"); await ring(b, 1100); b.click(); await look($(".forkpane")); await wait(2800); }],
      ["4/6 · Edit a value: savings runway 4 → 9 months.", async () => { const i = $('.val[data-id="M-08"]', memList); await ring(i, 1100); i.value = 9; i.dispatchEvent(new Event("change", { bubbles: true })); await look($(".forkpane")); await wait(2800); }],
      ["5/6 · Remove a key fact (M-08). It refuses to guess and asks.", async () => { const b = sw("M-08"); await ring(b, 1100); b.click(); await look(thread.lastElementChild); await wait(2600); }],
      ["6/6 · Answer it. The answer is saved to memory and the odds return.", async () => { const fm = $('.qform[data-id="M-08"]', thread); if (!fm) return; const i = $("input", fm); await ring(i, 700); i.value = 6; await wait(500); fm.requestSubmit(); await until(() => S.phase === "odds"); await look($(".forkpane")); await wait(2600); }],
    ];
    for (const [t, fn] of script) { if (!live()) return; cap(t); await fn(); }
    if (!live()) return;
    cap("Your turn: try the master's question, then change M-05 to “ML / data”.");
    await wait(6000);
    if (live()) stopTour();
  }
  tourBtn.addEventListener("click", tour);
  $("#tourStop").addEventListener("click", stopTour);

  /* ---------------- boot ---------------- */
  const stars = $(".top .stars");
  for (let i = 0; i < 46; i++) { const d = document.createElement("i"); d.style.left = ((i * 137) % 100) + "%"; d.style.top = ((i * 53) % 90) + "%"; d.style.opacity = 0.2 + ((i * 37) % 60) / 100; stars.appendChild(d); }
  load(); renderMemory(); emptyFork(); steps("idle");
  addEventListener("resize", () => drawRoad(S.phase === "odds" ? S.last : null));
  window.PA = { score: (id) => score(DEC[id]), F, get state() { return S; } }; // handy for tests
})();
