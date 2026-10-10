/* Northwind CRM: a fictional Bubble app with exactly 10 data types.
   Every row is generated from a fixed seed, so the same question always gets
   the same answer. Dates are anchored to the visitor's current month so
   "closing this month" always means something. No real people or companies. */
(function (root) {
  "use strict";
  const DAY = 864e5;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function anchor(now) {
    const d = now || new Date();
    const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
    const today = Date.UTC(y, m, day);
    const dow = (new Date(today).getUTCDay() + 6) % 7; // Monday = 0
    return {
      today,
      tomorrow: today + DAY,
      weekStart: today - dow * DAY,
      nextWeekStart: today - dow * DAY + 7 * DAY,
      weekAfterStart: today - dow * DAY + 14 * DAY,
      monthStart: Date.UTC(y, m, 1),
      nextMonthStart: Date.UTC(y, m + 1, 1),
      monthAfterStart: Date.UTC(y, m + 2, 1),
      prevMonthStart: Date.UTC(y, m - 1, 1),
      daysInMonth: new Date(Date.UTC(y, m + 1, 0)).getUTCDate(),
      dayOfMonth: day,
    };
  }

  /* field definitions: [name, bubble type, extra]. These are what
     bubble_get_schema (GET /api/1.1/meta) reports. */
  const STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];
  const OPEN_STAGES = ["Lead", "Qualified", "Proposal", "Negotiation"];
  const TYPES = {
    company: { display: "Company", fields: [["name", "text"], ["industry", "text", ["Software", "Logistics", "Healthcare", "Food & Bev", "Media", "Retail", "Manufacturing"]], ["city", "text", ["Lisbon", "Austin", "Toronto", "Melbourne", "Berlin", "Denver", "Dublin", "Osaka"]], ["tier", "text", ["Enterprise", "Mid-market", "SMB"]], ["owner", "user"]] },
    contact: { display: "Contact", fields: [["name", "text"], ["title", "text"], ["company", "company"], ["email", "text"], ["phone", "text"]] },
    deal: { display: "Deal", fields: [["name", "text"], ["company", "company"], ["amount", "number"], ["stage", "text", STAGES], ["close_date", "date"], ["owner", "user"]] },
    task: { display: "Task", fields: [["title", "text"], ["company", "company"], ["deal", "deal"], ["due_date", "date"], ["done", "boolean"], ["assignee", "user"]] },
    note: { display: "Note", fields: [["body", "text"], ["company", "company"], ["author", "user"]] },
    user: { display: "User", fields: [["name", "text"], ["email", "text"], ["role", "text", ["Admin", "Sales", "Support", "Finance"]], ["active", "boolean"]] },
    invoice: { display: "Invoice", fields: [["number", "text"], ["company", "company"], ["amount", "number"], ["status", "text", ["Draft", "Sent", "Paid", "Overdue"]], ["due_date", "date"]] },
    product: { display: "Product", fields: [["name", "text"], ["sku", "text"], ["price", "number"], ["active", "boolean"]] },
    meeting: { display: "Meeting", fields: [["title", "text"], ["company", "company"], ["starts_at", "date"], ["attendees", "number"]] },
    ticket: { display: "Ticket", fields: [["subject", "text"], ["company", "company"], ["status", "text", ["Open", "Pending", "Solved", "Closed"]], ["priority", "text", ["Low", "Normal", "High", "Urgent"]], ["opened_at", "date"]] },
  };
  const TYPE_KEYS = Object.keys(TYPES);

  function build(now) {
    const A = anchor(now);
    const r = mulberry32(0x5eed2026);
    const pick = (a) => a[Math.floor(r() * a.length)];
    const int = (a, b) => a + Math.floor(r() * (b - a + 1));
    const chance = (p) => r() < p;
    const wpick = (items, weights) => {
      let s = 0; for (const w of weights) s += w;
      let x = r() * s;
      for (let i = 0; i < items.length; i++) { x -= weights[i]; if (x <= 0) return items[i]; }
      return items[items.length - 1];
    };
    const iso = (ms) => new Date(ms).toISOString();
    const noon = (dayMs) => dayMs + 12 * 3600e3;
    const ids = new Set();
    const mkId = (created) => {
      let id;
      do { id = created + "x" + String(int(1e8, 999999999)) + String(int(1e8, 999999999)); } while (ids.has(id));
      ids.add(id); return id;
    };
    const db = {}; TYPE_KEYS.forEach((k) => (db[k] = []));
    let adminId = null;
    function rec(type, fields, createdDaysAgo) {
      const created = A.today - (createdDaysAgo != null ? createdDaysAgo : int(15, 820)) * DAY + int(28800, 64800) * 1000;
      const modified = Math.min(created + int(0, 60) * DAY + int(0, 7200) * 1000, A.today + 9 * 3600e3);
      const row = { _id: mkId(created), "Created Date": iso(created), "Modified Date": iso(modified) };
      if (adminId) row["Created By"] = adminId;
      Object.assign(row, fields);
      db[type].push(row);
      return row;
    }

    /* ---- User (the team, plus three QA accounts someone forgot to clean up) */
    const TEAM = ["Ava", "Ben", "Chloe", "Dev", "Elif", "Finn", "Grace", "Hugo", "Iris", "Jonah", "Kira", "Leo", "Mira", "Noah", "Omar"];
    TEAM.forEach((n, i) => {
      const role = i === 0 ? "Admin" : wpick(["Admin", "Sales", "Support", "Finance"], [1, 6, 3, 2]);
      const u = rec("user", { name: n, email: n.toLowerCase() + "@northwind.example", role, active: i === 0 ? true : chance(0.9) }, 900 - i * 40);
      if (i === 0) adminId = u._id;
    });
    [["QA Test 1", "qa.test1@northwind.example"], ["QA Test 2", "qa.test2@northwind.example"], ["Test Sales", "test.sales@northwind.example"]]
      .forEach(([n, e], i) => rec("user", { name: n, email: e, role: i === 2 ? "Sales" : "Support", active: false }, int(30, 200)));
    const team = db.user.filter((u) => !/test/i.test(u.email));
    const sales = team.filter((u) => u.role === "Sales" || u.role === "Admin");

    /* ---- Company */
    const PRE = ["Amber", "Birch", "Bluefin", "Cobalt", "Copper", "Cedar", "Drift", "Ember", "Fable", "Glacier", "Harbor", "Indigo", "Juniper", "Kestrel", "Lumen", "Maple", "Nimbus", "Oakridge", "Pebble", "Quill", "Rook", "Saffron", "Tidal", "Umber", "Velvet", "Willow", "Yarrow", "Zephyr"];
    const SUF = { Labs: "Software", Works: "Manufacturing", Studio: "Media", Freight: "Logistics", Health: "Healthcare", Foods: "Food & Bev", Logistics: "Logistics", Systems: "Software", Analytics: "Software", Supply: "Retail", Media: "Media", Robotics: "Manufacturing", Outfitters: "Retail", Clinics: "Healthcare", Partners: "Media" };
    const combos = [];
    PRE.forEach((p) => Object.keys(SUF).forEach((s) => combos.push([p, s])));
    for (let i = combos.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [combos[i], combos[j]] = [combos[j], combos[i]]; }
    const chosen = [["Bluefin", "Labs"]];
    for (const c of combos) {
      if (chosen.length >= 124) break;
      const n = c.join(" ");
      if (n === "Bluefin Labs" || n === "Harbor Freight") continue;
      if (chosen.filter((y) => y[0] === c[0]).length >= 5) continue; // spread the names out
      chosen.push(c);
    }
    const CITIES = TYPES.company.fields[2][2];
    chosen.forEach(([p, s], i) => rec("company", {
      name: p + " " + s, industry: SUF[s], city: i === 0 ? "Lisbon" : pick(CITIES),
      tier: i === 0 ? "Mid-market" : wpick(["Enterprise", "Mid-market", "SMB"], [2, 4, 5]),
      owner: pick(sales)._id,
    }, i === 0 ? 640 : undefined));
    const companies = db.company;
    const pop = companies.map((c, i) => (i === 0 ? 3.2 : 0.25 + Math.pow(r(), 4) * 6));
    const slug = (n) => n.toLowerCase().replace(/[^a-z]+/g, "");

    /* ---- Contact */
    const FIRST = ["Aiden", "Bea", "Carmen", "Dario", "Esme", "Felix", "Gia", "Hana", "Ines", "Jules", "Kai", "Lena", "Mateo", "Nadia", "Oscar", "Pia", "Quinn", "Rosa", "Sami", "Tess", "Uma", "Vik", "Wren", "Xavi", "Yara", "Zoe", "Arlo", "Bruno", "Cleo", "Dina", "Emil", "Fern", "Gus", "Hedda", "Ivo", "Jana", "Kofi", "Lior", "Maya", "Nico"];
    const TITLES = ["CEO", "COO", "Head of Ops", "Finance Lead", "IT Manager", "Office Manager", "Procurement", "VP Sales", "Product Lead", "Founder"];
    function contact(c) {
      const first = pick(FIRST);
      rec("contact", {
        name: first + " " + String.fromCharCode(65 + int(0, 25)) + ".",
        title: pick(TITLES), company: c._id,
        email: chance(0.06) ? "" : first.toLowerCase() + "@" + slug(c.name) + ".example",
        phone: chance(0.22) ? "" : "555-01" + String(int(0, 99)).padStart(2, "0"),
      });
    }
    for (let k = 0; k < 6; k++) contact(companies[0]);
    for (let k = 0; k < 174; k++) contact(wpick(companies.slice(1), pop.slice(1)));

    /* ---- Deal */
    const LINES = ["Platform", "Analytics add-on", "Onboarding", "Support plan", "Seat expansion", "Renewal", "Pilot", "Integration", "Fleet module"];
    for (let k = 0; k < 190; k++) {
      const c = wpick(companies, pop);
      const stage = wpick(STAGES, [14, 16, 16, 12, 24, 18]);
      let off;
      if (stage === "Won" || stage === "Lost") off = -int(1, 140);
      else off = chance(0.32) ? int(0, A.daysInMonth - 1) : int(-6, 110);
      rec("deal", {
        name: c.name + " · " + pick(LINES), company: c._id,
        amount: Math.round((1500 + Math.pow(r(), 1.7) * 58000) / 50) * 50,
        stage, close_date: iso(noon(A.monthStart + off * DAY)), owner: pick(sales)._id,
      });
    }

    /* ---- Task */
    const VERBS = ["Call", "Email", "Send proposal to", "Follow up with", "Prep demo for", "Review contract with", "Book QBR with"];
    for (let k = 0; k < 110; k++) {
      const c = wpick(companies, pop);
      const off = int(-30, 45);
      const deals = db.deal.filter((d) => d.company === c._id);
      rec("task", {
        title: pick(VERBS) + " " + c.name, company: c._id, deal: deals.length && chance(0.7) ? pick(deals)._id : "",
        due_date: iso(noon(A.today + off * DAY)), done: off < 0 ? chance(0.7) : chance(0.12), assignee: pick(team)._id,
      });
    }

    /* ---- Note */
    const NOTES = ["Asked about annual billing.", "Wants SSO before they expand seats.", "Champion is moving teams in Q1.", "Happy with onboarding, slow to pay.", "Comparing us with two other vendors.", "Needs a security questionnaire.", "Budget frozen until next quarter.", "Loved the analytics demo.", "Prefers email over calls.", "Asked for a case study in their industry."];
    for (let k = 0; k < 80; k++) {
      const c = wpick(companies, pop);
      rec("note", { body: pick(NOTES), company: c._id, author: pick(team)._id });
    }

    /* ---- Invoice */
    for (let k = 0; k < 110; k++) {
      const c = wpick(companies, pop);
      const status = wpick(["Draft", "Sent", "Paid", "Overdue"], [12, 20, 55, 13]);
      const off = status === "Paid" ? -int(5, 160) : status === "Overdue" ? -int(1, 50) : int(-3, 40);
      rec("invoice", {
        number: "INV-" + (1001 + k), company: c._id, amount: Math.round((400 + Math.pow(r(), 1.5) * 24000) / 10) * 10,
        status, due_date: iso(noon(A.today + off * DAY)),
      });
    }

    /* ---- Product */
    [["Platform seat", 49], ["Analytics add-on", 1200], ["Onboarding package", 2500], ["Premium support", 3600], ["API access", 900], ["Fleet module", 4800], ["SSO add-on", 1500], ["Sandbox environment", 600], ["Data export", 300], ["Training day", 1800], ["Custom reports", 2200], ["Mobile app", 750], ["Audit trail", 1100], ["Legacy connector", 400]]
      .forEach(([n, p], i) => rec("product", { name: n, sku: "NW-" + (100 + i * 7), price: p, active: i !== 13 && i !== 8 }));

    /* ---- Meeting */
    const MEET = ["Discovery call", "Product demo", "QBR", "Kickoff", "Pricing review", "Security review"];
    for (let k = 0; k < 60; k++) {
      const c = wpick(companies, pop);
      rec("meeting", { title: pick(MEET) + " · " + c.name, company: c._id, starts_at: iso(A.today + int(-40, 40) * DAY + int(8, 17) * 3600e3), attendees: int(2, 8) });
    }

    /* ---- Ticket */
    const SUBJ = ["Can't export report to CSV", "SSO login loop", "Invoice shows wrong VAT", "Dashboard loads slowly", "Need to add 5 seats", "API rate limit question", "Password reset email delayed", "Duplicate contacts after import"];
    for (let k = 0; k < 64; k++) {
      const c = wpick(companies, pop);
      rec("ticket", {
        subject: pick(SUBJ), company: c._id, status: wpick(["Open", "Pending", "Solved", "Closed"], [22, 12, 30, 36]),
        priority: wpick(["Low", "Normal", "High", "Urgent"], [20, 45, 25, 10]), opened_at: iso(A.today - int(0, 90) * DAY + int(8, 18) * 3600e3),
      });
    }

    // Bubble returns things in creation order unless you pass sort_field
    TYPE_KEYS.forEach((k) => db[k].sort((a, b) => (a["Created Date"] < b["Created Date"] ? -1 : a["Created Date"] > b["Created Date"] ? 1 : 0)));
    return { db, anchor: A };
  }

  /* GET /api/1.1/meta: the shape bubble_mcp's types.ts expects */
  function meta() {
    const types = {};
    TYPE_KEYS.forEach((k) => {
      types[k] = {
        display: TYPES[k].display,
        fields: TYPES[k].fields.map(([n, t]) => ({ id: n + "_" + (t === "text" || t === "number" || t === "date" || t === "boolean" ? t : "custom_" + t), display: n, type: t })),
      };
    });
    return {
      get: TYPE_KEYS.slice(),
      post: [],
      types,
      app_data: { appname: "northwind-crm", favicon: "", app_version: "test", use_captions_for_get: false, domain: "app.northwind.example" },
    };
  }

  root.Northwind = { build, meta, anchor, TYPES, TYPE_KEYS, STAGES, OPEN_STAGES, DAY };
})(typeof window !== "undefined" ? window : globalThis);
