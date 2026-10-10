/* UI: the chat on the left, the "under the hood" inspector on the right.
   Everything the inspector shows comes from events the agent emits while it
   actually runs: guard results, tools/call payloads, the GET it builds, and
   the JSON the simulated Bubble server returns. */
(function () {
  "use strict";
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const NW = window.Northwind, BDA = window.BDA, esc = BDA.esc;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = () => window.matchMedia && matchMedia("(max-width: 900px)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const store = {
    get(k) { try { return localStorage.getItem("bda-demo:" + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem("bda-demo:" + k, v); } catch (e) { /* storage off: fine */ } },
  };
  const commit = (line) => window.dispatchEvent(new CustomEvent("demo:commit", { detail: line }));

  /* ------------------------------------------------------------- the world */
  function mkToken() {
    const a = new Uint8Array(20);
    try { crypto.getRandomValues(a); } catch (e) { for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 256) | 0; }
    return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  const { db, anchor } = NW.build(new Date());
  // the "env" only the MCP server reads; the token is random per page load and never rendered
  const env = { BUBBLE_API_URL: "https://app.northwind.example/version-test", BUBBLE_API_TOKEN: mkToken() };
  const server = window.BubbleSim.createServer({ db, meta: NW.meta(), token: env.BUBBLE_API_TOKEN, base: env.BUBBLE_API_URL });
  let mode = store.get("mode") === "shipped" ? "shipped" : "constraints";
  const mcp = BDA.createMcp({ server, env, getMode: () => mode });
  const claude = BDA.createClaude({ mcp, anchor, getMode: () => mode });

  /* ------------------------------------------------------------- elements */
  const msgs = $("#msgs"), chipsEl = $("#chips"), form = $("#composer"), input = $("#q");
  const ibody = $("#ibody"), iTitle = $("#iTitle"), modeNote = $("#modeNote"), grid = $("#grid");
  const tourBtn = $("#tourBtn"), glass = $("#glass");

  const CHIPS = [
    { q: "what data types exist?" },
    { q: "how many companies do we have?" },
    { q: "deals over $10k closing this month" },
    { q: "top 5 companies by open deals" },
    { q: "show contacts at Bluefin Labs" },
    { q: "delete all test users", warn: true },
    { q: "contacts with no phone number" },
    { q: "unpaid invoices" },
    { q: "show me the schema for Deal" },
    { q: "what's in the Payroll table?", warn: true },
  ];
  const GUIDE = [0, 1, 2, 3, 4, 5];
  const asked = new Set();
  CHIPS.forEach((c, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip" + (c.warn ? " warn" : ""); b.textContent = c.q; b.dataset.i = i;
    b.addEventListener("click", () => ask(c.q));
    chipsEl.appendChild(b);
  });
  function markNext() {
    $$(".chip", chipsEl).forEach((b) => b.classList.remove("next", "later"));
    const n = GUIDE.find((i) => !asked.has(CHIPS[i].q));
    if (n == null) return;
    const b = chipsEl.children[n];
    b.classList.add("next");
    if (asked.size) b.classList.add("later");
    if (chipsEl.classList.contains("compact")) chipsEl.scrollTo({ left: Math.max(0, b.offsetLeft - 16), behavior: reduce ? "auto" : "smooth" });
  }
  markNext();

  /* ----------------------------------------------------------- pipeline */
  function pipe(node, flow) {
    $$(".node").forEach((n) => n.classList.toggle("on", n.dataset.n === node));
    $$(".str").forEach((s) => s.classList.toggle("flow", flow === s.dataset.s));
  }
  function hitGlass() {
    glass.classList.remove("hit"); void glass.offsetWidth; glass.classList.add("hit");
    const r = document.createElement("i"); r.className = "ring"; glass.appendChild(r);
    setTimeout(() => r.remove(), 700);
  }

  /* -------------------------------------------------------------- render */
  function hlJson(text) {
    const h = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return h.replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g, (m, str, colon, kw) => {
      if (str) return colon ? `<span class="k">${str}</span>${colon}` : str.charAt(1) === "…" ? `<span class="c">${str}</span>` : `<span class="s">${str}</span>`;
      if (kw) return `<span class="b">${m}</span>`;
      return `<span class="n">${m}</span>`;
    });
  }
  const code = (obj) => `<pre class="code">${hlJson(typeof obj === "string" ? obj : JSON.stringify(obj, null, 2))}</pre>`;
  function shownBody(body) {
    const r = body && body.response;
    if (r && Array.isArray(r.results) && r.results.length > 2) {
      const extra = r.results.length - 2;
      return JSON.stringify({ response: { cursor: r.cursor, results: r.results.slice(0, 2).concat(["… " + extra + " more results, all of them go back to Claude"]), count: r.count, remaining: r.remaining } }, null, 2);
    }
    if (body && body.types) {
      const t = {}; Object.keys(body.types).slice(0, 2).forEach((k) => (t[k] = body.types[k]));
      t["…"] = "… " + (Object.keys(body.types).length - 2) + " more types";
      return JSON.stringify({ get: body.get, post: body.post, types: t, app_data: body.app_data }, null, 2);
    }
    return JSON.stringify(body, null, 2);
  }
  function urlHtml(url) {
    const [path, qs] = url.split("?");
    const base = env.BUBBLE_API_URL;
    let h = `<span class="h">${esc(base)}</span>${esc(path.slice(base.length))}`;
    if (qs != null) h += "?" + qs.split("&").filter(Boolean).map((kv) => { const i = kv.indexOf("="); return `<span class="p">${esc(kv.slice(0, i))}</span>=<span class="v">${esc(kv.slice(i + 1))}</span>`; }).join("&amp;");
    return h;
  }
  const shortPath = (p) => p.replace(/constraints=[^&]*/, "constraints=…").replace(/\?$/, "");
  const fmtVal = (v) => (Array.isArray(v) ? "[" + v.map((x) => (String(x).length > 18 ? String(x).slice(0, 4) + "…" + String(x).slice(-4) : x)).join(", ") + "]" : v === undefined ? "" : typeof v === "string" && v.length > 24 && /x\d+$/.test(v) ? v.slice(0, 4) + "…" + v.slice(-4) : String(v));

  function intentLine(p) {
    switch (p.kind) {
      case "query": return `parsed → ${p.type} · ${p.count ? "count" : p.sort ? p.sort.label + " " + p.sort.n : "list"}${p.company ? " · company “" + p.company + "”" : ""} · ${p.constraints.length + (p.company ? 1 : 0)} constraint${p.constraints.length + (p.company ? 1 : 0) === 1 ? "" : "s"}`;
      case "types": return "parsed → which data types exist";
      case "schema": return "parsed → schema" + (p.type ? " for " + p.type : "");
      case "topCompanies": return `parsed → top ${p.n} companies by open deals (page deals, group, look up names)`;
      case "write": return `parsed → a write: would need ${p.tool}${p.type ? " on " + p.type : ""}`;
      case "hidden": return `parsed → data type “${p.word}”`;
      case "token": return "parsed → asks for the API token";
      case "get": return `parsed → one ${p.type} by _id`;
      default: return "parsed → no data question recognised";
    }
  }

  function card(cls, h4, right, inner) {
    const d = document.createElement("div");
    d.className = "card " + (cls || "");
    d.innerHTML = `<h4>${h4}${right ? `<span class="r">${right}</span>` : ""}</h4>${inner}`;
    return d;
  }

  function render(ev, turn) {
    switch (ev.t) {
      case "intent":
        return card("q", "QUESTION", "turn " + (turn.n), `<p>${esc(turn.q)}</p><div class="intent">${esc(intentLine(ev.p))}</div>`);
      case "guard": {
        const planned = ev.planned.length ? ev.planned.map((p) => `${p.name}${p.dataType ? "(" + esc(p.dataType) + ")" : ""}`).join(" → ") : "no tool needed";
        const rows = ev.checks.map((c) => `<li class="${c.ok ? "" : "no"}"><span class="ic">${c.ok ? "✓" : "✕"}</span><span class="rl">${esc(c.rule)}</span><span class="tx">${esc(c.text)}<em>${esc(c.why)}</em></span></li>`).join("");
        return card(ev.ok ? "" : "blocked", "CLAUDE.MD CHECK", ev.ok ? "passed" : "blocked", `<p class="planned">planned: ${planned}</p><ul class="checks">${rows}</ul>${ev.ok ? "" : `<p class="foot-note">Stopped before the MCP server. No tool call, no request to Bubble. (Backup layer: <code>MCP_MODE=read-only</code> in .mcp.json.)</p>`}`);
      }
      case "claudemd":
        return card("local", "CLAUDE.MD · DATA TYPES EXPOSED VIA THE DATA API", "0 requests", `<div class="md">“These are the only types the user's Bubble app has enabled on <code>/obj/&lt;type&gt;</code>. Do not attempt to query anything else.”<table><tbody>${NW.TYPE_KEYS.map((k, i) => (i % 2 ? "" : "<tr>") + `<td class="hot">${NW.TYPES[k].display}</td>` + (i % 2 ? "</tr>" : "")).join("")}</tbody></table><p class="foot-note">The rule: answer this from the table, or call bubble_get_schema only if field-level detail is wanted.</p></div>`);
      case "rpc":
        return card("", "MCP · TOOLS/CALL #" + ev.id, "Claude → bubble_mcp · stdio", code({ jsonrpc: "2.0", id: ev.id, method: "tools/call", params: { name: ev.name, arguments: ev.args } }));
      case "http": {
        const r = ev.req, res = r.body && r.body.response;
        const ok = r.status === 200;
        const qs = r.url.split("?")[1] || "";
        let cons = null;
        try { const m = qs.match(/(?:^|&)constraints=([^&]*)/); if (m) cons = JSON.parse(decodeURIComponent(m[1])); } catch (e) { cons = null; }
        const info = res && Array.isArray(res.results)
          ? `<div class="pageinfo"><span>cursor ${res.cursor}</span><span>count ${res.count}</span><span class="${res.remaining === 0 ? "z" : ""}">remaining ${res.remaining}</span></div>`
          : res ? `<div class="pageinfo"><span>1 record</span></div>` : r.body && r.body.types ? `<div class="pageinfo"><span>${Object.keys(r.body.types).length} types</span></div>` : "";
        const consHtml = cons
          ? `<details open><summary>constraints, decoded from the query string</summary><table class="cons"><thead><tr><th>key</th><th>constraint_type</th><th>value</th></tr></thead><tbody>${cons.map((c) => `<tr><td>${esc(c.key)}</td><td>${esc(c.constraint_type)}</td><td>${esc(fmtVal(c.value))}</td></tr>`).join("")}</tbody></table></details>`
          : /\/obj\/[a-z]+\?/.test(r.path) && mode === "shipped" ? `<p class="foot-note" style="margin:0">No <code>constraints</code> param: the shipped bubble_list only forwards limit and cursor.</p>` : "";
        const first = turn.events.filter((e) => e.t === "http").indexOf(ev) === 0;
        return card("", "HTTP · BUBBLE DATA API", r.ms + " ms", `<div class="req">
          <div class="line1"><span class="meth">${r.method}</span><span class="st ${ok ? "" : "bad"}">${r.status} ${esc(r.statusText)}</span>${info}</div>
          <div class="url">${urlHtml(r.url)}</div>
          <div class="hdrs">Authorization: Bearer <span class="mask">••••••••</span> <span class="why">← from .env, masked</span><br>Content-Type: application/json</div>
          ${consHtml}
          <details${first ? " open" : ""}><summary>response JSON${res && res.results ? ` · ${res.count} result${res.count === 1 ? "" : "s"}` : ""}</summary>${code(shownBody(r.body))}</details>
        </div>`);
      }
      case "rpcResult": {
        const txt = ev.out.content[0].text;
        const size = txt.length > 1024 ? (txt.length / 1024).toFixed(1) + " KB" : txt.length + " B";
        return card(ev.out.ok ? "local" : "blocked", "RESULT #" + ev.id + " → CLAUDE", ev.out.cached ? "served from cache" : size, `<p>${ev.out.ok ? (ev.out.cached ? "BubbleService already holds the schema, so no request was made." : `<code>content[0].text</code> carries the raw JSON above back to Claude.`) : esc(txt)}</p>`);
      }
      case "local":
        return card("local" + (ev.warn ? " warn" : ""), ev.warn ? "CLAUDE · FILTERING CLIENT-SIDE" : "CLAUDE · IN CONTEXT", "", `<p>${esc(ev.text)}</p>`);
      case "answer":
        return ev.refused
          ? card("blocked", "REFUSED · " + esc(ev.refused).toUpperCase(), "0 requests to Bubble", `<p>${esc(ev.cite)}</p>`)
          : card("done", "ANSWERED", "", `<p>${esc(ev.cite)}</p>`);
      default: return null;
    }
  }

  /* -------------------------------------------------------------- turns */
  const turns = [];
  let viewing = -1;
  const DELAY = { intent: 260, guard: 560, claudemd: 420, rpc: 420, http: 620, rpcResult: 260, local: 460 };
  const speed = reduce ? 0.12 : 1;

  function showTurn(i, scroll) {
    viewing = i;
    const t = turns[i];
    iTitle.textContent = "“" + t.q + "”";
    ibody.innerHTML = "";
    t.events.forEach((ev) => { const el = render(ev, t); if (el) { el.style.animation = "none"; ibody.appendChild(el); } });
    $$(".inspect").forEach((b) => b.classList.toggle("cur", +b.dataset.turn === i));
    if (scroll !== false) ibody.scrollTop = 0;
  }

  function status(turn, text) { const s = $(".status", turn.el); if (s) s.textContent = text; }

  function onEvent(ev, turn) {
    if (viewing === turn.i) {
      const el = render(ev, turn);
      if (el) { ibody.appendChild(el); ibody.scrollTop = ibody.scrollHeight; if (isMobile()) el.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }); }
    }
    switch (ev.t) {
      case "intent": pipe("you", "1"); status(turn, "reading the question…"); break;
      case "guard":
        pipe("claude"); status(turn, "checking CLAUDE.md…");
        if (!ev.ok) hitGlass();
        break;
      case "claudemd": pipe("claude"); status(turn, "answering from CLAUDE.md…"); break;
      case "rpc": pipe("mcp"); status(turn, `calling ${ev.name}${ev.args && ev.args.cursor ? " · cursor " + ev.args.cursor : ""}…`); break;
      case "http": {
        pipe("bubble", "2");
        const r = ev.req, res = r.body && r.body.response;
        const n = res && Array.isArray(res.results) ? res.count + " results" : res ? "1 record" : r.body && r.body.types ? "schema, " + Object.keys(r.body.types).length + " types" : "error";
        status(turn, `GET ${shortPath(r.path)} · ${r.status}`);
        commit(`mcp → bubble: GET ${shortPath(r.path)} · ${r.status} · ${n}`);
        break;
      }
      case "rpcResult": pipe("claude"); break;
      case "local": pipe("claude"); status(turn, "working it out…"); break;
      case "answer": {
        pipe("you");
        const reqs = turn.events.filter((e) => e.t === "http").length;
        if (ev.refused === "Rules 1–2") commit(`claude: refused ${ev.blockedTool} · CLAUDE.md rules 1–2 · 0 requests`);
        else if (ev.refused === "Exposed types") commit(`claude: refused a type that isn't exposed · 0 requests`);
        else if (ev.refused === "Rule 4") commit(`claude: refused to print the API token · rule 4`);
        else if (turn.events.some((e) => e.t === "claudemd")) commit(`claude: answered from CLAUDE.md · 0 requests`);
        else if (!reqs && turn.kind === "schema") commit(`claude: reused the schema from earlier · 0 requests`);
        const a = $(".a", turn.el);
        turn.el.classList.toggle("refused", !!ev.refused);
        a.innerHTML = `<small>CLAUDE</small>${ev.html}<div class="cite"><span>${esc(ev.cite)}</span><button type="button" class="inspect" data-turn="${turn.i}">inspect ›</button></div>`;
        break;
      }
    }
  }

  let busy = false;
  function setBusy(b) {
    busy = b;
    chipsEl.setAttribute("aria-disabled", b ? "true" : "false");
    form.setAttribute("aria-disabled", b ? "true" : "false");
    input.disabled = b;
  }
  function scrollChat() { msgs.scrollTop = msgs.scrollHeight; }

  async function ask(q) {
    q = String(q || "").trim();
    if (!q || busy) return;
    setBusy(true);
    const hello = $("#hello"); if (hello) hello.remove();
    chipsEl.classList.add("compact");
    asked.add(q); markNext();
    $$(".chip", chipsEl).forEach((b) => { if (b.textContent === q) b.classList.add("used"); });
    const you = document.createElement("div");
    you.className = "you"; you.innerHTML = `<small>YOU</small><span class="bub q">${esc(q)}</span>`;
    msgs.appendChild(you);
    const el = document.createElement("div");
    el.className = "claude"; el.innerHTML = `<div class="a"><small>CLAUDE</small><div class="status">thinking…</div></div>`;
    msgs.appendChild(el);
    scrollChat();
    const turn = { i: turns.length, n: turns.length + 1, q, events: [], el, kind: null };
    turns.push(turn);
    viewing = turn.i; iTitle.textContent = "“" + q + "”"; ibody.innerHTML = "";
    if (isMobile() && grid.dataset.tab === "chat") $(".mtabs .badge").hidden = false;
    try {
      await claude.run(q, async (ev) => {
        turn.events.push(ev);
        if (ev.t === "intent") turn.kind = ev.kind;
        onEvent(ev, turn);
        scrollChat();
        const d = DELAY[ev.t];
        if (d) await sleep(d * speed);
      });
    } catch (e) {
      $(".a", el).innerHTML = `<small>CLAUDE</small>Something went wrong in the demo: ${esc(e.message)}`;
      console.error(e);
    }
    $$(".inspect").forEach((b) => b.classList.toggle("cur", +b.dataset.turn === viewing));
    setTimeout(() => pipe(null), 900);
    // long answers: keep the question and the top of the answer in view
    if (you.offsetHeight + el.offsetHeight + 24 > msgs.clientHeight) { msgs.style.scrollBehavior = "auto"; msgs.scrollTop = you.offsetTop - 8; msgs.style.scrollBehavior = ""; }
    else scrollChat();
    // inspector: land on the first real request, the interesting bit
    if (viewing === turn.i && !isMobile()) {
      const firstHttp = $$("#ibody .card").find((c) => /HTTP/.test(c.querySelector("h4").textContent));
      if (firstHttp) ibody.scrollTo({ top: firstHttp.offsetTop - 8, behavior: reduce ? "auto" : "smooth" });
    }
    setMode(mode, false);
    setBusy(false);
    if (!touring) input.focus({ preventScroll: true });
    return turn;
  }

  /* ------------------------------------------------------------ inspector idle */
  function wired() {
    iTitle.textContent = "How it's wired";
    viewing = -1;
    const types = NW.TYPE_KEYS.map((k) => `<span class="bub">${NW.TYPES[k].display}</span>`).join("");
    ibody.innerHTML = "";
    [
      card("", "TOOLS CLAUDE MAY CALL", "CLAUDE.md rules 2–3", `<div class="pills">${BDA.ALLOWED.map((t) => `<span class="tool">${t}</span>`).join("")}${BDA.WRITES.map((t) => `<span class="tool x">${t}</span>`).join("")}</div><p class="foot-note">The server exposes all seven. CLAUDE.md forbids the four write tools, even if a user asks.</p>`),
      card("", "THE 10 EXPOSED DATA TYPES", "/api/1.1/obj/&lt;type&gt;", `<div class="types">${types}</div><p class="foot-note">Anything else (payroll, passwords…) is refused before a request is made: it would only 401.</p>`),
      card("", ".ENV", "gitignored", `<div class="envbox"><span class="k">BUBBLE_API_URL</span>=${esc(env.BUBBLE_API_URL)}<br><span class="k">BUBBLE_API_TOKEN</span>=<span class="mask">••••••••••••</span></div><p class="foot-note">Read by the MCP server only. It goes to Bubble as a Bearer header and nowhere else, so this panel masks it too.</p>`),
      card("local", "HOW TO READ THIS PANEL", "", `<p>Ask anything on the left. Each question shows up here in order: the CLAUDE.md check, the MCP <code>tools/call</code>, the exact GET Bubble receives, the paged JSON it sends back, and the counts Claude cites.</p>`),
    ].forEach((c) => ibody.appendChild(c));
  }

  /* ---------------------------------------------------------------- mode */
  function setMode(m, rerun) {
    mode = m; store.set("mode", m);
    $$(".mode button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
    const last = turns.slice().reverse().find((t) => t.events.some((e) => e.t === "http" && /\/obj\/[a-z]+\?/.test(e.req.path)));
    modeNote.innerHTML = (m === "constraints"
      ? `bubble_list forwards Bubble's <code>constraints</code> (and sort) in the query string, so Bubble filters. The upstream server doesn't yet; this is the upgrade CLAUDE.md suggests.`
      : `As shipped, bubble_list only takes <code>dataType</code>, <code>limit</code>, <code>cursor</code>. Claude pages through everything and filters client-side, which CLAUDE.md warns is slow on big tables.`)
      + (last && rerun !== false ? ` <button type="button" class="follow rerun" data-ask="${esc(last.q)}" style="background:var(--ink);color:#fff;font-size:12.5px">re-run “${esc(last.q)}”</button>` : "");
  }
  $$(".mode button").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
  setMode(mode, false);

  /* ---------------------------------------------------------------- tabs */
  function setTab(t) {
    grid.dataset.tab = t;
    $$(".mtabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === t)));
    if (t === "insp") $(".mtabs .badge").hidden = true;
    if (t === "chat") scrollChat();
  }
  $$(".mtabs button").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));

  /* ------------------------------------------------------------ delegation */
  document.addEventListener("click", (e) => {
    const insp = e.target.closest(".inspect");
    if (insp) { showTurn(+insp.dataset.turn); if (isMobile()) { setTab("insp"); window.scrollTo({ top: 0 }); } return; }
    const a = e.target.closest("[data-ask]");
    if (a) { if (isMobile() && grid.dataset.tab !== "chat") setTab("chat"); ask(a.dataset.ask); }
  });
  form.addEventListener("submit", (e) => { e.preventDefault(); const q = input.value; input.value = ""; ask(q); });

  /* ---------------------------------------------------------------- tour */
  let touring = false;
  function tourUi() { tourBtn.classList.toggle("on", touring); tourBtn.textContent = touring ? "Stop tour" : "Run the tour"; }
  async function tour() {
    if (touring) { touring = false; tourUi(); return; }
    if (busy) return;
    touring = true; tourUi();
    if (isMobile()) setTab("chat");
    for (const i of GUIDE) {
      if (!touring) break;
      const q = CHIPS[i].q;
      input.value = "";
      for (const ch of q) { if (!touring) break; input.value += ch; await sleep(reduce ? 0 : 24); }
      if (!touring) break;
      await sleep(reduce ? 0 : 250);
      input.value = "";
      await ask(q);
      if (!touring) break;
      if (isMobile()) { await sleep(reduce ? 200 : 1200); if (!touring) break; setTab("insp"); window.scrollTo({ top: 0 }); await sleep(reduce ? 400 : 2600); if (!touring) break; setTab("chat"); }
      await sleep(reduce ? 200 : 1500);
    }
    touring = false; tourUi();
  }
  tourBtn.addEventListener("click", tour);

  /* ----------------------------------------------------------- ambience */
  if (!reduce) {
    const amb = $("#amb");
    for (let i = 0; i < 9; i++) {
      const b = document.createElement("i");
      const s = 18 + ((i * 37) % 46);
      b.className = "bub";
      b.style.cssText = `width:${s}px;height:${s}px;left:${(i * 11.3 + 4) % 100}%;animation-duration:${22 + ((i * 7) % 16)}s;animation-delay:-${(i * 4.1) % 20}s`;
      amb.appendChild(b);
    }
  }

  wired();
  // tiny hook for automated checks; exposes nothing secret
  window.__bda = { ask, turns, get busy() { return busy; }, get mode() { return mode; } };
})();
