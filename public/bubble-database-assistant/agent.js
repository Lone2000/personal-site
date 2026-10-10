/* The two halves of the project, ported to the browser:
   1. createMcp: bubble_mcp's tool surface (mcp-server.ts + bubbleService.ts).
      Same 7 tools, same args, same URL building; it talks to the simulated
      Bubble server instead of axios. The token comes from "env" and is only
      ever put in the Authorization header of the request to Bubble.
   2. createClaude: the part CLAUDE.md governs. A small deterministic intent
      parser stands in for the model; every tool call it plans is checked
      against the CLAUDE.md rules before anything is sent. */
(function (root) {
  "use strict";
  const NW = root.Northwind, BS = root.BubbleSim;
  const ALLOWED = ["bubble_get_schema", "bubble_list", "bubble_get"];
  const WRITES = ["bubble_create", "bubble_update", "bubble_delete", "bubble_workflow"];
  const EXPOSED = NW.TYPE_KEYS;

  /* ------------------------------------------------------------------ MCP */
  function createMcp({ server, env, getMode }) {
    let schema = null; // BubbleService caches /meta for the life of the process
    function get(path) {
      const url = env.BUBBLE_API_URL + path;
      const res = server.handle({ method: "GET", url, headers: { Authorization: "Bearer " + env.BUBBLE_API_TOKEN, "Content-Type": "application/json" } });
      // what the inspector is allowed to see: the header with the secret masked
      return { method: "GET", url, path, shownHeaders: { Authorization: "Bearer ••••••••", "Content-Type": "application/json" }, status: res.status, statusText: res.statusText, ms: res.ms, body: res.body };
    }
    const fail = (r, msg) => { const e = new Error(msg); e.requests = r; throw e; };
    const handlers = {
      bubble_get_schema() {
        const reqs = [];
        if (!schema) {
          const r = get("/api/1.1/meta"); reqs.push(r);
          if (r.status !== 200) fail(reqs, "Schema fetch error: " + r.body.body.message);
          schema = r.body;
        }
        return { data: schema, requests: reqs, cached: reqs.length === 0 };
      },
      bubble_list(args) {
        if (!args) throw new Error("Arguments are undefined");
        const shipped = getMode() === "shipped";
        const q = [];
        // as shipped, bubble_list only forwards limit and cursor; the constraint-aware
        // build adds Bubble's constraints / sort params to the same query string
        if (!shipped && args.constraints && args.constraints.length) q.push("constraints=" + encodeURIComponent(JSON.stringify(args.constraints)));
        if (args.limit) q.push("limit=" + args.limit);
        if (args.cursor) q.push("cursor=" + args.cursor); // falsy cursor (0) is skipped, same as upstream
        if (!shipped && args.sort_field) { q.push("sort_field=" + encodeURIComponent(args.sort_field)); if (args.descending) q.push("descending=true"); }
        const r = get("/api/1.1/obj/" + args.dataType + "?" + q.join("&"));
        if (r.status !== 200) fail([r], "Failed to list " + args.dataType + ": " + r.body.body.message);
        return { data: r.body, requests: [r] };
      },
      bubble_get(args) {
        if (!args) throw new Error("Arguments are undefined");
        const r = get("/api/1.1/obj/" + args.dataType + "/" + args.id);
        if (r.status !== 200) fail([r], r.body.body.message);
        return { data: r.body, requests: [r] };
      },
    };
    WRITES.forEach((w) => (handlers[w] = () => { throw new Error("Write tools are not simulated: Claude never calls them here"); }));
    function call(name, args) {
      try {
        if (!handlers[name]) throw new Error("Unknown tool: " + name);
        const out = handlers[name](args);
        return { ok: true, ...out, content: [{ type: "text", text: JSON.stringify(out.data) }] };
      } catch (e) {
        return { ok: false, requests: e.requests || [], content: [{ type: "text", text: "Error: " + e.message }], isError: true, error: e.message };
      }
    }
    const listTools = () => ALLOWED.concat(WRITES);
    return { call, listTools, schemaCached: () => !!schema };
  }

  /* -------------------------------------------------------- CLAUDE.md guard */
  function guard(planned, opts) {
    const names = planned.map((p) => p.name);
    const types = planned.map((p) => p.dataType).filter(Boolean);
    const writes = names.filter((n) => WRITES.includes(n));
    const notAllowed = names.filter((n) => !ALLOWED.includes(n));
    const hidden = types.filter((t) => !EXPOSED.includes(t));
    const checks = [
      { rule: "Rule 1", text: "Read only. Always.", ok: writes.length === 0, why: writes.length ? "this would change data" : "lookup only" },
      { rule: "Rule 2", text: "Never call bubble_create / update / delete / workflow", ok: writes.length === 0, why: writes.length ? writes[0] + " is forbidden, even if asked" : "none planned" },
      { rule: "Rule 3", text: "Only bubble_get_schema, bubble_list, bubble_get", ok: notAllowed.length === 0, why: names.length ? [...new Set(names)].join(", ") : "no tool needed" },
      { rule: "Types", text: "Only the 10 exposed data types", ok: hidden.length === 0, why: types.length ? [...new Set(types)].join(", ") + (hidden.length ? " is not exposed (it would 401)" : "") : "none touched" },
      { rule: "Rule 4", text: "Never expose the API token", ok: !opts.wantsToken, why: opts.wantsToken ? "asked to reveal it" : "token stays in .env" },
    ];
    return { ok: checks.every((c) => c.ok), checks };
  }

  /* --------------------------------------------------------------- helpers */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
  const iso = (ms) => new Date(ms).toISOString();
  const monthName = (ms) => new Date(ms).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const shortDate = (s) => (s ? new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : "");
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
  const LABEL = { company: ["company", "companies"], contact: ["contact", "contacts"], deal: ["deal", "deals"], task: ["task", "tasks"], note: ["note", "notes"], user: ["user", "users"], invoice: ["invoice", "invoices"], product: ["product", "products"], meeting: ["meeting", "meetings"], ticket: ["ticket", "tickets"] };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const shortId = (id) => id.slice(0, 4) + "…" + id.slice(-4);
  const rid = (type, id) => `<button type="button" class="rid" data-ask="get ${type} ${esc(id)}" title="bubble_get this record">${esc(shortId(id))}</button>`;
  const follow = (q) => `<button type="button" class="follow" data-ask="${esc(q)}">${esc(q)}</button>`;

  const SYN = {
    company: ["companies", "company", "customers", "customer", "accounts", "account", "clients", "client", "organizations", "organisations"],
    contact: ["contacts", "contact", "people", "persons", "person"],
    deal: ["deals", "deal", "opportunities", "opportunity", "opps", "pipeline"],
    task: ["tasks", "task", "to-dos", "todos", "todo"],
    note: ["notes", "note"],
    user: ["users", "user", "teammates", "team members", "logins", "admins", "admin"],
    invoice: ["invoices", "invoice", "bills"],
    product: ["products", "product", "skus", "sku"],
    meeting: ["meetings", "meeting", "appointments"],
    ticket: ["tickets", "ticket", "support requests", "issues"],
  };
  const HIDDEN = ["payroll", "salaries", "salary", "passwords", "password", "audit logs", "audit log", "bank accounts", "bank account", "employees", "employee", "credit cards", "credit card", "orders", "order", "leads table", "expenses", "expense", "vendors", "vendor"];
  const WRITE_RX = [
    [/\b(delete|remove|drop|wipe|purge|truncate|erase|clean ?up|get rid of|destroy)\b/, "bubble_delete"],
    [/\b(run|trigger|execute|kick off|fire)\b[^?]*\b(workflow|job|automation|report)\b|\bworkflows?\b|\bsend\b/, "bubble_workflow"],
    [/\b(create|add|insert|import|make a new|log a new)\b/, "bubble_create"],
    [/\b(update|edit|change|modify|rename|set|mark|assign|reassign|archive|merge|move|bump|increase|decrease|deactivate|activate|fix|correct)\b/, "bubble_update"],
  ];
  const AMOUNT = { deal: "amount", invoice: "amount", product: "price" };
  const DATEF = { deal: "close_date", task: "due_date", invoice: "due_date", meeting: "starts_at", ticket: "opened_at" };
  const NAMEF = { company: "name", contact: "name", deal: "name", task: "title", note: "body", user: "name", invoice: "number", product: "name", meeting: "title", ticket: "subject" };
  const HAS_COMPANY = ["contact", "deal", "task", "note", "invoice", "meeting", "ticket"];

  function findType(s) {
    let best = null;
    for (const t of EXPOSED) for (const w of SYN[t]) {
      const m = new RegExp("\\b" + w.replace(/[-]/g, "\\-") + "\\b").exec(s);
      if (m && (!best || m.index < best.index)) best = { type: t, index: m.index, word: w };
    }
    return best;
  }
  const num = (n, unit) => { let v = parseFloat(String(n).replace(/,/g, "")); if (unit === "k") v *= 1e3; if (unit === "m") v *= 1e6; return v; };

  /* constraints a sentence implies for a given type */
  function filters(type, s, A) {
    const C = [], D = [];
    let rest = " " + s + " ";
    const take = (m) => { rest = rest.replace(m, " "); };
    const af = AMOUNT[type];
    if (af) {
      const over = rest.match(/\b(?:over|above|more than|greater than|bigger than|at least|>)\s*\$?\s*(\d[\d,.]*)\s*(k|m)?\b/);
      if (over) { const v = num(over[1], over[2]); C.push({ key: af, constraint_type: "greater than", value: v }); D.push(af + " over " + money(v)); take(over[0]); }
      const under = rest.match(/\b(?:under|below|less than|smaller than|at most|<)\s*\$?\s*(\d[\d,.]*)\s*(k|m)?\b/);
      if (under) { const v = num(under[1], under[2]); C.push({ key: af, constraint_type: "less than", value: v }); D.push(af + " under " + money(v)); take(under[0]); }
    }
    const df = DATEF[type] || "Created Date";
    const verb = { deal: "closing", task: "due", invoice: "due", meeting: "on the calendar", ticket: "opened" }[type] || "created";
    const RANGES = [
      [/\bthis month\b/, A.monthStart, A.nextMonthStart, "in " + monthName(A.monthStart)],
      [/\bnext month\b/, A.nextMonthStart, A.monthAfterStart, "in " + monthName(A.nextMonthStart)],
      [/\blast month\b/, A.prevMonthStart, A.monthStart, "in " + monthName(A.prevMonthStart)],
      [/\bthis week\b/, A.weekStart, A.nextWeekStart, "this week"],
      [/\bnext week\b/, A.nextWeekStart, A.weekAfterStart, "next week"],
      [/\btoday\b/, A.today, A.tomorrow, "today"],
    ];
    for (const [rx, a, b, label] of RANGES) {
      const m = rest.match(rx);
      if (m) { C.push({ key: df, constraint_type: "greater than", value: iso(a) }, { key: df, constraint_type: "less than", value: iso(b) }); D.push(verb + " " + label); take(m[0]); break; }
    }
    const E = {
      deal: [[/\bopen\b/, { key: "stage", constraint_type: "in", value: NW.OPEN_STAGES }, "still open"], [/\bclosed\b/, { key: "stage", constraint_type: "in", value: ["Won", "Lost"] }, "closed"]]
        .concat(NW.STAGES.map((st) => [new RegExp("\\b" + st.toLowerCase() + "\\b"), { key: "stage", constraint_type: "equals", value: st }, "stage " + st])),
      ticket: [[/\b(urgent|high|normal|low)(?:[- ]priority)?\b/, null, null], [/\bopen\b/, { key: "status", constraint_type: "in", value: ["Open", "Pending"] }, "open or pending"], [/\b(solved|closed|pending)\b/, null, null]],
      invoice: [[/\b(unpaid|outstanding|not paid)\b/, { key: "status", constraint_type: "not equal", value: "Paid" }, "not paid"], [/\b(paid|overdue|drafts?|sent)\b/, null, null]],
      task: [[/\b(overdue|late)\b/, "OVERDUE", "overdue"], [/\b(open|pending|incomplete|outstanding|not done|to do)\b/, { key: "done", constraint_type: "equals", value: false }, "not done"], [/\b(done|completed|finished)\b/, { key: "done", constraint_type: "equals", value: true }, "done"]],
      user: [[/\b(admins?|sales|support|finance)\b/, null, null], [/\btest\b/, { key: "email", constraint_type: "text contains", value: "test" }, "email contains “test”"], [/\binactive\b/, { key: "active", constraint_type: "equals", value: false }, "inactive"], [/\bactive\b/, { key: "active", constraint_type: "equals", value: true }, "active"]],
      product: [[/\binactive\b|\bretired\b/, { key: "active", constraint_type: "equals", value: false }, "inactive"], [/\bactive\b/, { key: "active", constraint_type: "equals", value: true }, "active"]],
      meeting: [[/\b(upcoming|future|scheduled)\b/, { key: "starts_at", constraint_type: "greater than", value: iso(A.today) }, "from today on"], [/\b(past|previous)\b/, { key: "starts_at", constraint_type: "less than", value: iso(A.today) }, "in the past"]],
      company: [],
    }[type] || [];
    for (const [rx, c, label] of E) {
      const m = rest.match(rx);
      if (!m) continue;
      take(m[0]);
      if (c === "OVERDUE") { C.push({ key: "done", constraint_type: "equals", value: false }, { key: "due_date", constraint_type: "less than", value: iso(A.today) }); D.push("overdue (not done, due before today)"); continue; }
      if (c) { C.push(c); D.push(label); continue; }
      const w = m[1];
      const fieldFor = { ticket: /urgent|high|normal|low/.test(w) ? "priority" : "status", invoice: "status", user: "role" }[type];
      const val = { admins: "Admin", drafts: "Draft" }[w] || cap(w);
      C.push({ key: fieldFor, constraint_type: "equals", value: val }); D.push(fieldFor + " " + val);
    }
    if (type === "company") {
      NW.TYPES.company.fields.forEach(([f, , vals]) => {
        if (!vals) return;
        vals.forEach((v) => {
          const key = v.toLowerCase().replace(/ & bev/, "").replace("-", "[- ]?");
          const m = rest.match(new RegExp("\\b" + key + "\\b"));
          if (m) { C.push({ key: f, constraint_type: "equals", value: v }); D.push(f + " " + v); take(m[0]); }
        });
      });
    }
    // empty / not-empty fields
    NW.TYPES[type].fields.forEach(([f]) => {
      const fw = f.replace(/_/g, " ");
      const emp = rest.match(new RegExp("\\b(?:without|with no|no|missing|lacking|has no|have no|blank|empty)\\s+(?:an?\\s+)?" + fw + "(?:\\s+(?:number|address|set))?\\b"));
      if (emp) { C.push({ key: f, constraint_type: "is_empty" }); D.push("no " + fw); take(emp[0]); return; }
      const has = rest.match(new RegExp("\\bwith (?:an?\\s+)?" + fw + "(?:\\s+(?:number|address))?\\b"));
      if (has && f !== "company") { C.push({ key: f, constraint_type: "is_not_empty" }); D.push("has a " + fw); take(has[0]); }
    });
    const named = s.match(/\b(?:named|called|containing|matching|mentioning|about)\s+["“']?([a-z0-9][^"”']*?)["”']?\s*\??$/);
    if (named && named[1].trim().length > 1) { C.push({ key: NAMEF[type], constraint_type: "text contains", value: named[1].trim() }); D.push(NAMEF[type] + " contains “" + named[1].trim() + "”"); }
    return { C, D };
  }

  function companyRef(original) {
    const m = original.match(/\b(?:at|for|from)\s+(.+?)\s*[?.!]*$/i);
    if (!m) return null;
    let name = m[1].split(/\s+(?:over|under|above|below|this|next|last|that|which|with|without|closing|due|in|since|sorted|by|opened|named|called)\b/i)[0].trim();
    name = name.replace(/^the\s+/i, "").replace(/['’]s$/i, "");
    if (/^company\s+\S{3,}/i.test(name)) name = name.replace(/^company\s+/i, "");
    if (!name || name.length < 2) return null;
    const low = name.toLowerCase();
    if (/^(this|next|last|today|now|all|every|our|my|me|us)\b/.test(low)) return null;
    if (findType(low) && findType(low).index === 0 && low.split(" ").length === 1) return null;
    return name;
  }

  /* the deterministic stand-in for "understanding" the question */
  function parse(question, A) {
    const original = String(question || "").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
    const s = original.toLowerCase();
    if (!s) return { kind: "empty" };
    const t = findType(s);
    if (/\b(api )?token\b|\.env\b|\bapi keys?\b|\bsecrets?\b|\bbearer\b|\bcredentials?\b/.test(s)) return { kind: "token" };
    for (const [rx, tool] of WRITE_RX) if (rx.test(s)) return { kind: "write", tool, type: t ? t.type : null, test: /\btest\b/.test(s) };
    const id = original.match(/\b(\d{13}x\d{18})\b/);
    if (id && t) return { kind: "get", type: t.type, id: id[1] };
    for (const h of HIDDEN) if (new RegExp("\\b" + h + "\\b").test(s)) return { kind: "hidden", word: h };
    if (/\b(schema|fields|columns|structure|properties|attributes)\b/.test(s) || /\brelationship\b/.test(s)) return { kind: "schema", type: t ? t.type : null };
    if (/\b(data ?types?|what types|which types|tables|what (?:data|kinds? of data)|what can (?:you|i) (?:see|query|ask))\b/.test(s)) return { kind: "types" };
    const top = s.match(/\btop\s*(\d+)?\s*(?:companies|accounts|customers|clients)\b.*\bdeals?\b|\b(?:companies|accounts|customers|clients) with the most (?:open )?deals\b/);
    if (top) return { kind: "topCompanies", n: Math.min(20, parseInt(top[1] || "5", 10)) };
    if (!t) {
      const hm = s.match(/\bhow many ([a-z]+)/);
      if (hm && !/^(of|are|is|do|does|did|have|has|records?|rows?|things?|items?)$/.test(hm[1])) return { kind: "hidden", word: hm[1] };
      if (/\b(hi|hello|hey|help|what can you do)\b/.test(s)) return { kind: "help" };
      return { kind: "unknown" };
    }
    const type = t.type;
    const count = /\b(how many|count|number of|total number)\b/.test(s);
    let sort = null;
    const tm = s.match(/\b(top|biggest|largest|highest|most expensive|smallest|lowest|cheapest|latest|newest|most recent)\s*(\d+)?\b/);
    if (tm) {
      const n = Math.min(20, parseInt(tm[2] || "5", 10));
      if (/latest|newest|recent/.test(tm[1])) sort = { field: "Created Date", desc: true, n, label: "newest" };
      else if (AMOUNT[type]) sort = { field: AMOUNT[type], desc: !/smallest|lowest|cheapest/.test(tm[1]), n, label: tm[1] };
    }
    const f = filters(type, s.replace(/\b(top|biggest|largest|highest|smallest|lowest|cheapest|latest|newest)\s*\d*\b/g, " "), A);
    const company = HAS_COMPANY.includes(type) ? companyRef(original) : null;
    return { kind: "query", type, count, sort, constraints: f.C, desc: f.D, company };
  }

  /* how each type is summarised in an answer row */
  function row(type, r) {
    const R = {
      company: () => [r.name, r.industry + " · " + r.city, r.tier],
      contact: () => [r.name, r.title, r.phone || "no phone"],
      deal: () => [r.name, money(r.amount), r.stage + " · " + shortDate(r.close_date)],
      task: () => [r.title, "due " + shortDate(r.due_date), r.done ? "done" : "open"],
      note: () => [r.body, shortDate(r["Created Date"]), ""],
      user: () => [r.name, r.email, r.role + (r.active ? "" : " · inactive")],
      invoice: () => [r.number, money(r.amount), r.status + " · due " + shortDate(r.due_date)],
      product: () => [r.name, money(r.price), r.active ? "active" : "inactive"],
      meeting: () => [r.title, shortDate(r.starts_at), r.attendees + " people"],
      ticket: () => [r.subject, r.priority, r.status + " · " + shortDate(r.opened_at)],
    }[type]();
    return `<tr><td>${esc(R[0])}</td><td>${esc(R[1])}</td><td>${esc(R[2])}</td><td>${rid(type, r._id)}</td></tr>`;
  }
  const table = (type, rows, max) => `<table class="rows"><tbody>${rows.slice(0, max).map((r) => row(type, r)).join("")}</tbody></table>` + (rows.length > max ? `<p class="more">+ ${rows.length - max} more in the inspector</p>` : "");

  /* ---------------------------------------------------------------- Claude */
  function createClaude({ mcp, anchor, getMode }) {
    let rpcSeq = 0;
    let knowsSchema = false; // CLAUDE.md: call bubble_get_schema once, then remember it

    async function run(question, emit) {
      const A = anchor;
      const p = parse(question, A);
      const stats = { tools: {}, requests: 0, read: 0 };
      const shipped = getMode() === "shipped";
      const cite = () => {
        const tools = Object.entries(stats.tools).map(([n, c]) => n + (c > 1 ? " ×" + c : "")).join(" + ");
        return (tools || "no tool call") + " · " + plural(stats.requests, "request", "requests") + (stats.read ? " · " + stats.read + " records read" : "") + " · 0 writes";
      };

      async function check(planned, opts) {
        const g = guard(planned, opts || {});
        await emit({ t: "guard", planned, ...g });
        return g.ok;
      }
      async function tool(name, args) {
        const id = ++rpcSeq;
        await emit({ t: "rpc", id, name, args });
        const out = mcp.call(name, args);
        stats.tools[name] = (stats.tools[name] || 0) + 1;
        for (const r of out.requests) {
          stats.requests++;
          const res = r.body && r.body.response;
          if (res && Array.isArray(res.results)) stats.read += res.results.length; else if (res) stats.read += 1;
          await emit({ t: "http", req: r });
        }
        await emit({ t: "rpcResult", id, name, out });
        if (!out.ok) { const e = new Error(out.error); e.tool = true; throw e; }
        return out;
      }
      async function listAll(dataType, constraints, why) {
        let cursor = 0, all = [], pages = [];
        for (let guardN = 0; guardN < 40; guardN++) {
          const args = { dataType, limit: 100 };
          if (cursor) args.cursor = cursor;
          if (!shipped && constraints.length) args.constraints = constraints;
          const out = await tool("bubble_list", args);
          const res = out.data.response;
          all = all.concat(res.results); pages.push(res.count);
          if (res.remaining === 0) break;
          cursor += res.count;
          await emit({ t: "local", text: `remaining: ${res.remaining}, so keep paging (cursor → ${cursor}).` });
        }
        let rows = all;
        if (shipped && constraints.length) {
          rows = all.filter((r) => constraints.every((c) => BS.matches(r, c)));
          await emit({ t: "local", warn: true, text: `As shipped, bubble_list can't send constraints. Read ${all.length} ${LABEL[dataType][1]} across ${pages.length} page${pages.length > 1 ? "s" : ""} and filtered them here: ${all.length} → ${rows.length}${why ? " (" + why + ")" : ""}. CLAUDE.md flags this as slow for big tables.` });
        }
        return { rows, pages };
      }
      const answer = (html, extra) => emit({ t: "answer", html, cite: cite(), ...(extra || {}) });
      const constraintsNote = (cs) => (cs.length ? (shipped ? " (filtered after paging)" : " (filtered by Bubble)") : "");

      await emit({ t: "intent", kind: p.kind, p });

      try {
        if (p.kind === "empty") return;
        if (p.kind === "help" || p.kind === "unknown") {
          await check([], {});
          return answer(`${p.kind === "help" ? "Hi! " : "I'm not sure which data that maps to. "}I can read the 10 data types Northwind CRM exposes (companies, contacts, deals, tasks, notes, users, invoices, products, meetings, tickets): counts, filters, schemas, single records. Read-only, so no edits.<div class="fups">${follow("how many companies do we have?")}${follow("deals over $10k closing this month")}${follow("open tickets that are urgent")}</div>`, { refused: false });
        }
        if (p.kind === "token") {
          await check([], { wantsToken: true });
          return answer(`I won't show the API token. CLAUDE.md rule 4: never print <code>.env</code> or echo the token. It lives in <code>.env</code>, and only the MCP server uses it, as the <code>Authorization: Bearer</code> header on requests to Bubble. The inspector shows it masked for that reason.`, { refused: "Rule 4" });
        }
        if (p.kind === "write") {
          const dataType = p.type || (p.tool === "bubble_workflow" ? null : "user");
          const planned = [{ name: p.tool, dataType: p.tool === "bubble_workflow" ? null : dataType }];
          await check(planned, {});
          const what = p.tool === "bubble_workflow" ? "Running a workflow is a write action" : p.tool === "bubble_delete" ? "Deleting records is a write" : p.tool === "bubble_create" ? "Creating records is a write" : "Changing records is a write";
          const alt = p.type === "user" && p.test ? follow("how many test users are there?") : p.type ? follow("how many " + LABEL[p.type][1] + " are there?") : follow("what data types exist?");
          return answer(`I can't do that. This project is <b>read-only</b>, so I can look things up but not change them. ${what}, and <code>${p.tool}</code> is off-limits under CLAUDE.md even when asked. Make edits in the Bubble editor.<div class="fups">I can look instead: ${alt}</div>`, { refused: "Rules 1–2", blockedTool: p.tool });
        }
        if (p.kind === "hidden") {
          const dt = p.word.replace(/s$/, "").replace(/\s+/g, "");
          await check([{ name: "bubble_list", dataType: dt }], {});
          return answer(`<b>${esc(cap(p.word))}</b> isn't one of the 10 data types this app exposes on the Data API, so I won't query it. A request to <code>/obj/${esc(dt)}</code> would just 401. The exposed types are Company, Contact, Deal, Task, Note, User, Invoice, Product, Meeting and Ticket.<div class="fups">${follow("what data types exist?")}</div>`, { refused: "Exposed types" });
        }
        if (p.kind === "types") {
          await check([], {});
          await emit({ t: "claudemd" });
          return answer(`Ten types are exposed on the Data API: <span class="tlist">${EXPOSED.map((k) => `<b>${NW.TYPES[k].display}</b>`).join(" ")}</span>Answered from CLAUDE.md, no request needed. Want the fields for one?<div class="fups">${follow("show me the schema for Deal")}${follow("how many companies do we have?")}</div>`);
        }
        if (p.kind === "schema") {
          await check(knowsSchema ? [] : [{ name: "bubble_get_schema" }], {});
          let meta;
          if (knowsSchema) {
            await emit({ t: "local", text: "Schema was loaded earlier in this chat. CLAUDE.md says call bubble_get_schema once per session and reuse it, so no new call." });
            meta = NW.meta();
          } else {
            meta = (await tool("bubble_get_schema", {})).data;
            knowsSchema = true;
          }
          if (!p.type) {
            const lines = Object.entries(meta.types).map(([k, v]) => `<tr><td>${esc(v.display)}</td><td>${v.fields.map((f) => esc(f.display)).join(", ")}</td><td></td><td></td></tr>`).join("");
            return answer(`The schema has ${Object.keys(meta.types).length} types. Every record also carries <code>_id</code>, <code>Created Date</code> and <code>Modified Date</code>.<table class="rows"><tbody>${lines}</tbody></table>`);
          }
          const tp = meta.types[p.type];
          const rels = tp.fields.filter((f) => EXPOSED.includes(f.type));
          return answer(`<b>${esc(tp.display)}</b> has ${tp.fields.length} fields, plus Bubble's built-in <code>_id</code>, <code>Created Date</code>, <code>Modified Date</code>:<table class="rows"><tbody>${tp.fields.map((f) => `<tr><td><code>${esc(f.display)}</code></td><td>${esc(f.type)}</td><td>${EXPOSED.includes(f.type) ? "links to " + esc(meta.types[f.type].display) : ""}</td><td></td></tr>`).join("")}</tbody></table>${rels.length ? `Relationships are stored as the related record's <code>_id</code>.` : ""}<div class="fups">${follow("how many " + LABEL[p.type][1] + " are there?")}</div>`);
        }
        if (p.kind === "get") {
          if (!(await check([{ name: "bubble_get", dataType: p.type }], {}))) return;
          const out = await tool("bubble_get", { dataType: p.type, id: p.id });
          const r = out.data.response;
          const fields = NW.TYPES[p.type].fields.map(([f, ft]) => {
            let v = r[f];
            if (v === "" || v == null) v = "—";
            else if (ft === "date") v = shortDate(v);
            else if (ft === "number" && /amount|price/.test(f)) v = money(v);
            else if (EXPOSED.includes(ft)) v = `${rid(ft, v)}`;
            return `<tr><td><code>${esc(f)}</code></td><td>${EXPOSED.includes(ft) ? v : esc(String(v))}</td><td></td><td></td></tr>`;
          }).join("");
          return answer(`Here's that ${LABEL[p.type][0]}:<table class="rows"><tbody>${fields}</tbody></table>`);
        }
        if (p.kind === "topCompanies") {
          if (!(await check([{ name: "bubble_list", dataType: "deal" }, { name: "bubble_list", dataType: "company" }], {}))) return;
          const open = [{ key: "stage", constraint_type: "in", value: NW.OPEN_STAGES }];
          const { rows } = await listAll("deal", open, "stage in Lead…Negotiation");
          const by = new Map();
          rows.forEach((d) => { const x = by.get(d.company) || { n: 0, sum: 0 }; x.n++; x.sum += d.amount; by.set(d.company, x); });
          const ranked = [...by.entries()].sort((a, b) => b[1].n - a[1].n || b[1].sum - a[1].sum || (a[0] < b[0] ? -1 : 1)).slice(0, p.n);
          await emit({ t: "local", text: `Grouped ${rows.length} open deals by company → ${by.size} companies. Ranked by count, then pipeline value. Next: one call to resolve the top ${ranked.length} company ids to names.` });
          const ids = ranked.map((x) => x[0]);
          const cs = (await listAll("company", [{ key: "_id", constraint_type: "in", value: ids }], "_id in top " + ranked.length)).rows;
          const name = (id) => (cs.find((c) => c._id === id) || { name: id }).name;
          const list = ranked.map(([id, x], i) => `<tr><td>${i + 1}. ${esc(name(id))}</td><td>${plural(x.n, "open deal", "open deals")}</td><td>${money(x.sum)}</td><td>${rid("company", id)}</td></tr>`).join("");
          return answer(`Top ${ranked.length} companies by open deals (stage Lead → Negotiation), out of <b>${rows.length} open deals</b> across ${by.size} companies:<table class="rows"><tbody>${list}</tbody></table><div class="fups">${follow("show contacts at " + name(ranked[0][0]))}</div>`);
        }
        if (p.kind === "query") {
          const type = p.type;
          const planned = [{ name: "bubble_list", dataType: type }];
          if (p.company) planned.unshift({ name: "bubble_list", dataType: "company" });
          if (!(await check(planned, {}))) return;
          const C = p.constraints.slice(), D = p.desc.slice();
          let companyName = null;
          if (p.company) {
            const look = [{ key: "name", constraint_type: "text contains", value: p.company }];
            const { rows: hits } = await listAll("company", look, "name contains “" + p.company + "”");
            if (!hits.length) {
              return answer(`No company name contains “${esc(p.company)}”${shipped ? "" : " (Bubble returned 0 results for that constraint)"}. Try one that exists:<div class="fups">${follow("show contacts at Bluefin Labs")}${follow("top 5 companies by open deals")}</div>`);
            }
            const exact = hits.find((h) => h.name.toLowerCase() === p.company.toLowerCase());
            const chosen = exact || hits[0];
            companyName = chosen.name;
            if (hits.length > 1 && !exact) await emit({ t: "local", text: `${hits.length} companies match “${p.company}”; using the first: ${chosen.name}.` });
            else await emit({ t: "local", text: `Resolved “${p.company}” → ${chosen.name} (${shortId(chosen._id)}). Bubble stores the link as that _id, so the next filter is company equals it.` });
            C.push({ key: "company", constraint_type: "equals", value: chosen._id }); D.push("at " + chosen.name);
          }
          const L = LABEL[type];
          if (p.sort && !p.count) {
            const args = { dataType: type, limit: p.sort.n, sort_field: p.sort.field, descending: p.sort.desc };
            if (!shipped && C.length) args.constraints = C;
            let rows, total;
            if (shipped) {
              const all = await listAll(type, C, "then sorted here");
              rows = all.rows.slice().sort((a, b) => (a[p.sort.field] < b[p.sort.field] ? 1 : -1) * (p.sort.desc ? 1 : -1));
              total = rows.length; rows = rows.slice(0, p.sort.n);
            } else {
              const out = await tool("bubble_list", args);
              rows = out.data.response.results; total = out.data.response.count + out.data.response.remaining;
            }
            return answer(`The ${p.sort.label} ${rows.length} ${L[1]}${D.length ? " (" + esc(D.join(", ")) + ")" : ""}, out of ${total} that match:${table(type, rows, p.sort.n)}`);
          }
          const { rows, pages } = await listAll(type, C);
          const sum = AMOUNT[type] ? rows.reduce((s, r) => s + (r[AMOUNT[type]] || 0), 0) : 0;
          const filt = D.length ? ": " + esc(D.join(", ")) : "";
          if (!rows.length) {
            return answer(`<b>0 ${L[1]}</b> match${filt}. If you expected data here, check the Privacy Rules on ${NW.TYPES[type].display} in Bubble: the API role needs “Find this in searches”.`);
          }
          if (!C.length || (p.count && !p.company)) {
            const pg = pages.length > 1 ? `Counted across ${pages.length} pages (${pages.join(" + ")}), paging until <code>remaining</code> hit 0.` : `One page was enough: <code>remaining</code> was 0.`;
            return answer(`There ${rows.length === 1 ? "is" : "are"} <b>${plural(rows.length, L[0], L[1])}</b>${C.length ? filt : " in Northwind CRM"}${sum ? ", worth " + money(sum) + " combined" : ""}. ${pg}${C.length && !p.count ? table(type, rows, 5) : ""}<div class="fups">${!C.length ? follow(type === "company" ? "top 5 companies by open deals" : "show me the schema for " + NW.TYPES[type].display) : ""}</div>`);
          }
          const pre = companyName && type === "contact" ? `<b>${plural(rows.length, "contact", "contacts")}</b> at ${esc(companyName)}${D.length > 1 ? " (" + esc(D.slice(0, -1).join(", ")) + ")" : ""}` : `<b>${plural(rows.length, L[0], L[1])}</b> match${rows.length === 1 ? "es" : ""}${filt}`;
          return answer(`${pre}${sum ? ". Worth " + money(sum) + " combined" : ""}${constraintsNote(C)}.${table(type, rows, 5)}`);
        }
      } catch (e) {
        if (!e.tool) throw e;
        return answer(`The tool returned an error: <code>${esc(e.message)}</code>. CLAUDE.md says report it as-is rather than guess.`, { error: true });
      }
    }
    return { run, parse: (q) => parse(q, anchor) };
  }

  root.BDA = { createMcp, createClaude, guard, parse, ALLOWED, WRITES, EXPOSED, esc };
})(typeof window !== "undefined" ? window : globalThis);
