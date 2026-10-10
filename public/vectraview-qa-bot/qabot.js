/* VectraView QA Bot, browser port.
   Real here: the PRD parser (prd_parser.py), the DOM skeleton + LLM prompt formatter
   (skeleton.py), the per-criterion agent loop and its verdict bookkeeping (agent.py),
   playback speeds (player.py) and the HTML report layout (reporter_html.py).
   Simulated: Claude's choice of the next action (a deterministic planner below) and
   Playwright (actions are performed on the mini app's real DOM). */
(function () {
  "use strict";
  const { addDays, fmtDue, esc } = window.Northwind;

  /* ------------------------------------------------------------------ parser
     port of prd_parser.parse_prd: H1 title, "## Overview", and "## Acceptance
     Criteria" split into ### sections of "- [ ]" items; nested items fold into
     the previous criterion as "\n  - <text>". */
  function parsePrd(text, fallbackTitle) {
    text = String(text).replace(/\r\n?/g, "\n");
    const tm = text.match(/^#\s+(.+)$/m);
    const title = tm ? tm[1].trim() : fallbackTitle || "prd";
    let overview = "";
    const ov = text.match(/##\s+Overview\s*\n([\s\S]*?)(?=^##\s)/m);
    if (ov) overview = ov[1].trim();
    const ac = text.match(/##\s+Acceptance Criteria\s*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/m);
    if (!ac) return { title, overview, sections: [] };
    const sections = [];
    let current = null;
    for (const line of ac[1].split("\n")) {
      const h3 = line.match(/^###\s+(.+)$/);
      if (h3) {
        if (current && current.criteria.length) sections.push(current);
        current = { name: h3[1].trim(), criteria: [] };
        continue;
      }
      if (!current) continue;
      const cb = line.match(/^(\s*)-\s+\[\s*\]\s+(.+)$/);
      if (cb) {
        const indent = cb[1].length;
        const acLine = cb[2].trim();
        if (indent === 0) current.criteria.push(acLine);
        else if (current.criteria.length) current.criteria[current.criteria.length - 1] += "\n  - " + acLine;
      }
    }
    if (current && current.criteria.length) sections.push(current);
    return { title, overview, sections };
  }
  const listSections = (parsed) => parsed.sections.map((s, i) => ({ index: i + 1, name: s.name, count: s.criteria.length }));

  /* -------------------------------------------------------------- risk score
     Impact (what breaks if this AC fails) x likelihood (how much tricky logic
     sits behind it). Transparent keyword rules, so every score explains itself. */
  const IMPACT = [
    { re: /reload|persist|lost|delete|still (on|there)|saved after/i, w: 3, why: "data persistence" },
    { re: /\badds?\b|\bcreates?\b|moves? (it )?to/i, w: 3, why: "core flow" },
    { re: /reject|cannot|can't|required|disabled|invalid|\bpast\b|only/i, w: 2, why: "validation rule" },
    { re: /due date|remind|reminder|email|notif/i, w: 2, why: "feature data" },
  ];
  const LIKELY = [
    { re: /\bpast\b|today|tomorrow|yesterday|overdue|hour|minute|time ?zone/i, why: "date arithmetic" },
    { re: /reject|cannot|can't|empty|disabled|invalid|until/i, why: "negative path" },
    { re: /reload|persist|session|still (on|there)/i, why: "state across reloads" },
    { re: /\n\s+- /, why: "compound criterion" },
  ];
  function scoreRisk(ac) {
    let impact = 1, impactWhy = "presentation";
    for (const r of IMPACT) if (r.re.test(ac) && r.w > impact) { impact = r.w; impactWhy = r.why; }
    const signals = LIKELY.filter((r) => r.re.test(ac)).map((r) => r.why);
    const likelihood = Math.min(3, 1 + signals.length);
    const score = impact * likelihood;
    const level = score >= 6 ? "high" : score >= 3 ? "medium" : "low";
    return { impact, impactWhy, likelihood, signals, score, level };
  }

  /* ------------------------------------------------------------ the planner
     Stand-in for Claude: maps a criterion to an action plan by intent. Each
     verify() reads the live DOM, so the verdict is never hard-coded. */
  const T = (s) => `[data-test=${s}]`;
  function intentOf(ac) {
    const a = ac.toLowerCase();
    if (/email|sms|push notification|inbox/.test(a)) return null;
    if (/remind/.test(a) && /reload|persist|still on/.test(a)) return "remPersist";
    if (/remind/.test(a) && /disabled|until|without/.test(a)) return "remDisabled";
    if (/remind/.test(a) && /bell|icon/.test(a)) return "remPersist";
    if (/\bpast\b/.test(a)) return "duePast";
    if (/today/.test(a)) return "dueToday";
    if (/due date/.test(a)) return "dueShow";
    if (/empty|required|blank/.test(a)) return "creEmpty";
    if (/done|complete|check/.test(a)) return "comDone";
    if (/add|create/.test(a) && /title|task/.test(a)) return "creAdd";
    return null;
  }

  function makePlan(ac, today) {
    const intent = intentOf(ac);
    const y = addDays(today, -1), p2 = addDays(today, 2), p5 = addDays(today, 5);
    const typeTitle = (t, say) => ({ act: "type", sel: T("title"), text: t, say: say || `The new-task form is empty. Typing a title into the title field.`, human: `Type "${t}" into the title field` });
    const fillDue = (d, label, say) => ({ act: "fill", sel: T("due"), text: d, say, human: `Set the due date to ${d} (${label})` });
    const clickAdd = (say) => ({ act: "click", sel: T("add-task"), say: say || `Form is filled in. Submitting with "Add task".`, human: `Click "Add task"` });
    const P = {
      creAdd: () => {
        const t = "Order team lunch";
        return {
          expect: `"${t}" appears as the first row of the open list.`,
          steps: [Object.assign(typeTitle(t), { observe: (q, m) => { m.before = q.openRows().length; } }), clickAdd()],
          verify(q, m) {
            const rows = q.openRows(), first = rows[0], got = first ? q.titleOf(first) : "(none)";
            const ok = got === t && rows.length === m.before + 1;
            return ok
              ? pass(`First row ${q.r(first)} in the open list reads "${t}"; the open count went from ${m.before} to ${rows.length}.`)
              : fail(`Expected "${t}" at the top of the open list; first row ${q.r(first)} reads "${got}" (open count ${m.before} → ${rows.length}).`, { title: "New task does not appear at the top of the list", expected: `"${t}" is the first open task`, actual: `First open task is "${got}"` });
          },
        };
      },
      creEmpty: () => ({
        expect: `Form shows "Title is required"; no task is created.`,
        steps: [Object.assign(clickAdd(`The title field is empty. Submitting as-is to probe validation.`), { observe: (q, m) => { m.before = q.openRows().length; }, human: `Leave the title empty and click "Add task"` })],
        verify(q, m) {
          const err = q.$(T("form-error")), msg = err.textContent.trim(), n = q.openRows().length;
          return /title is required/i.test(msg) && n === m.before
            ? pass(`Error ${q.r(err)} reads "${msg}" and the open count stayed at ${n}.`)
            : fail(`Expected "Title is required"; error element ${q.r(err)} reads "${msg || "(empty)"}", open count ${m.before} → ${n}.`, { title: "Empty title is not rejected", expected: `"Title is required" and no new task`, actual: msg ? `Message "${msg}", open count ${m.before} → ${n}` : `No message, open count ${m.before} → ${n}` });
        },
      }),
      dueShow: () => {
        const t = "Renew the domain", want = "Due " + fmtDue(p5);
        return {
          expect: `Row "${t}" shows "${want}".`,
          steps: [typeTitle(t), fillDue(p5, "in 5 days", `Title is in. Setting a due date five days out.`), clickAdd()],
          verify(q) {
            const row = q.rowByTitle(t), badge = row && q.dueOf(row);
            return badge === want
              ? pass(`Row ${q.r(row)} "${t}" shows the badge "${badge}".`)
              : fail(`Row ${q.r(row)} "${t}" shows "${badge || "no due badge"}", expected "${want}".`, { title: "Due date is not shown on the task row", expected: `"${want}" on the row`, actual: badge ? `"${badge}"` : "No due badge" });
          },
        };
      },
      duePast: () => {
        const t = "File the expense report";
        return {
          expect: `Form shows "Due date can't be in the past"; no task is created.`,
          steps: [typeTitle(t), fillDue(y, "yesterday", `Setting the due date to yesterday (${y}) to probe the past-date rule.`), clickAdd(`A past date is set. Submitting to see whether the form rejects it.`)],
          verify(q) {
            const err = q.$(T("form-error")), msg = err.textContent.trim(), row = q.rowByTitle(t);
            if (/can't be in the past|cannot be in the past/i.test(msg) && !row) return pass(`Error ${q.r(err)} reads "${msg}" and no row titled "${t}" exists.`);
            const badge = row ? q.dueOf(row) : "";
            return fail(
              row ? `No error message is shown (the form-error element is empty, so it is not in the skeleton). A new row ${q.r(row)} "${t}" was created with "${badge}", so a due date in the past was accepted.`
                  : `No row was created, but the error ${q.r(err)} reads "${msg || "(empty)"}" instead of "Due date can't be in the past".`,
              { title: "A due date in the past is accepted", expected: `The form shows "Due date can't be in the past" and no task is created.`, actual: row ? `Task "${t}" was created with "${badge}" and no error was shown.` : `Message: "${msg}"` });
          },
        };
      },
      dueToday: () => {
        const t = "Call the printer";
        return {
          expect: `Row "${t}" shows a "Today" badge.`,
          steps: [typeTitle(t), fillDue(today, "today", `Setting the due date to today (${today}).`), clickAdd()],
          verify(q) {
            const row = q.rowByTitle(t), badge = row && q.dueOf(row);
            return badge === "Today"
              ? pass(`Row ${q.r(row)} "${t}" shows the badge "Today" instead of a date.`)
              : fail(`Row ${q.r(row)} "${t}" shows "${badge || "no badge"}" instead of "Today".`, { title: `Tasks due today don't show "Today"`, expected: `"Today" badge`, actual: `"${badge}"` });
          },
        };
      },
      remDisabled: () => {
        const t = "Water the office plants";
        return {
          expect: `"Remind me" is disabled with no date and enabled once a date is set.`,
          steps: [
            typeTitle(t),
            Object.assign(fillDue(p2, "in 2 days", `Before setting a date I note the "Remind me" switch state, then set a due date.`), { observe: (q, m) => { m.before = q.$(T("remind")).disabled; } }),
          ],
          verify(q, m) {
            const sw = q.$(T("remind")), now = sw.disabled;
            return m.before && !now
              ? pass(`With no due date the "Remind me" switch ${q.r(sw)} was disabled; after filling the date it is enabled.`)
              : fail(`"Remind me" ${q.r(sw)} was ${m.before ? "disabled" : "enabled"} before a date and is ${now ? "disabled" : "enabled"} after.`, { title: `"Remind me" ignores the due date`, expected: "Disabled until a due date is set", actual: `Before: ${m.before ? "disabled" : "enabled"}, after: ${now ? "disabled" : "enabled"}` });
          },
        };
      },
      remPersist: () => {
        const t = "Renew the parking permit";
        const nested = /reload|persist|still on/i.test(ac);
        const steps = [
          typeTitle(t),
          fillDue(p2, "in 2 days", `A reminder needs a due date first. Setting one two days out.`),
          { act: "click", sel: T("remind"), say: `The "Remind me" switch is enabled now. Turning it on.`, human: `Turn on "Remind me"` },
          clickAdd(),
        ];
        if (nested) steps.push({ act: "reload", say: `The row shows a bell. The sub-criterion needs it to survive a reload, so reloading.`, human: "Reload the page", observe: (q, m) => { const r = q.rowByTitle(t); m.bellBefore = !!(r && r.querySelector(T("task-bell"))); m.rowBefore = q.r(r); } });
        return {
          expect: nested ? `Row "${t}" shows a bell, and still shows it after a reload.` : `Row "${t}" shows a bell.`,
          steps,
          verify(q, m) {
            const row = q.rowByTitle(t), bell = row && row.querySelector(T("task-bell"));
            if (!nested) return bell ? pass(`Row ${q.r(row)} "${t}" shows the reminder bell ${q.r(bell)}.`) : fail(`Row ${q.r(row)} "${t}" has no reminder bell.`, { title: "Reminder bell is missing", expected: "Bell icon on the row", actual: "No bell" });
            if (m.bellBefore && bell) return pass(`Before the reload row ${m.rowBefore} showed the bell; after page.reload() row ${q.r(row)} "${t}" still shows it ${q.r(bell)}.`);
            if (!m.bellBefore) return fail(`After turning on "Remind me", row ${m.rowBefore} "${t}" showed no bell.`, { title: "Reminder bell never appears", expected: "Bell icon on the row", actual: "No bell after saving" });
            return fail(`Before the reload row ${m.rowBefore} "${t}" showed the bell. After page.reload() the row ${q.r(row)} is back with "${row ? q.dueOf(row) : "?"}" but no bell, so the reminder was not saved.`, { title: "Reminder is lost after the page reloads", expected: `The bell is still on "${t}" after a reload.`, actual: "The bell shows right after saving, then disappears on reload. The reminder setting is not persisted." });
          },
        };
      },
      comDone: () => {
        const t = "Draft launch checklist";
        return {
          expect: `"${t}" moves to Done and is struck through.`,
          steps: [{ act: "click", sel: `${T("open-list")} li:first-child ${T("task-check")}`, say: `Ticking the checkbox on the first open task, "${t}".`, human: `Tick the checkbox on "${t}"` }],
          verify(q) {
            const row = q.rowByTitle(t, "done"), el = row && row.querySelector(T("task-title"));
            const struck = el && /line-through/.test(getComputedStyle(el).textDecorationLine || getComputedStyle(el).textDecoration);
            return row && struck
              ? pass(`"${t}" is now in the Done list ${q.r(row)} and its title ${q.r(el)} has text-decoration: line-through.`)
              : fail(row ? `"${t}" moved to Done ${q.r(row)} but is not struck through.` : `"${t}" is not in the Done list.`, { title: "Completed task does not move to Done", expected: "Row moves to Done, struck through", actual: row ? "Moved, not struck through" : "Still in the open list" });
          },
        };
      },
    };
    if (intent && P[intent]) return Object.assign({ intent }, P[intent]());
    return {
      intent: null,
      expect: ac.split("\n")[0],
      steps: [
        { act: "scroll", text: "down", say: /email|inbox|sms/i.test(ac) ? "The criterion needs an email inbox. Nothing in the skeleton reaches one; scrolling to look further." : "Nothing in the skeleton matches this criterion. Scrolling to look for more of the page.", human: "Explore the page (no scripted plan)" },
        { act: "scroll", text: "top", say: "Still nothing relevant. Back to the top to re-read the page.", human: "" },
      ],
      verify() { return { verdict: "inconclusive", reasoning: "timed out after 31s (cap 30s). The simulated agent has no plan for this criterion." + (/email|inbox|sms/i.test(ac) ? " An email inbox is not reachable from the browser, so a human has to check this one." : " The real bot would keep asking Claude for the next action.") }; },
    };
  }
  const pass = (reasoning) => ({ verdict: "pass", reasoning });
  const fail = (reasoning, bug) => ({ verdict: "fail", reasoning, bug });

  /* ------------------------------------------------------------- test cases */
  function buildCases(parsed, today) {
    const used = {};
    const cases = [];
    parsed.sections.forEach((s) => {
      let pre = (s.name.match(/[A-Za-z]+/) || ["SEC"])[0].slice(0, 3).toUpperCase();
      while (used[pre] && used[pre] !== s.name) pre = pre.slice(0, 2) + String.fromCharCode(pre.charCodeAt(2) + 1);
      used[pre] = s.name;
      s.criteria.forEach((ac, j) => {
        const [main, ...subs] = ac.split("\n  - ");
        const plan = makePlan(ac, today);
        cases.push({
          id: `${pre}-${String(j + 1).padStart(2, "0")}`,
          section: s.name, ac, main, subs, plan,
          steps: ["Open the app on a fresh “Launch week” workspace"].concat(plan.steps.map((x) => x.human).filter(Boolean)),
          expected: plan.intent ? [plan.expect] : [main].concat(subs),
          risk: scoreRisk(ac),
          status: "pending",
        });
      });
    });
    return cases;
  }

  /* --------------------------------------------------------------- skeleton
     port of skeleton.SKELETON_JS, scoped to the mini app instead of a whole page */
  const INTERACTIVE_TAGS = new Set(["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "LABEL", "SUMMARY"]);
  const ROLE_INTERACTIVE = new Set(["button", "link", "tab", "menuitem", "option", "checkbox", "radio", "switch", "textbox", "combobox", "listbox", "searchbox", "slider"]);
  function captureSkeleton(root, frame) {
    root.querySelectorAll("[data-qa-ref]").forEach((el) => el.removeAttribute("data-qa-ref"));
    const fr = frame.getBoundingClientRect();
    const isVisible = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
      if (r.bottom < fr.top || r.top > fr.bottom + 2000) return false;
      return true;
    };
    const accessibleName = (el) => (el.getAttribute("aria-label") || el.getAttribute("alt") || el.getAttribute("title") || el.getAttribute("placeholder") || "").trim();
    const shortText = (el) => { let t = (el.innerText || "").trim(); if (t.length > 120) t = t.slice(0, 120) + "..."; return t.replace(/\s+/g, " "); };
    const isInteractive = (el) => {
      if (INTERACTIVE_TAGS.has(el.tagName)) return true;
      const role = el.getAttribute("role");
      if (role && ROLE_INTERACTIVE.has(role)) return true;
      if (el.onclick) return true;
      try { if (getComputedStyle(el).cursor === "pointer") return true; } catch (e) { /* ignore */ }
      return false;
    };
    const isMeaningfulText = (el) => {
      if (/^H[1-6]$|^T[DH]$/.test(el.tagName)) return true;
      const t = shortText(el);
      if (!t) return false;
      if (el.querySelector("a, button, input, select, textarea, [role=button], [role=link]")) return false;
      if (t.length > 200) return false;
      return true;
    };
    const results = [];
    let ref = 0;
    for (const el of root.querySelectorAll("*")) {
      if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
      if (!isVisible(el)) continue;
      const interactive = isInteractive(el);
      const meaningful = !interactive && (isMeaningfulText(el) || el.getAttribute("role") === "img");
      if (!interactive && !meaningful) continue;
      const parent = el.parentElement;
      if (parent && parent.dataset && parent.dataset.qaRef && !interactive && shortText(parent) === shortText(el)) continue;
      ref++;
      el.setAttribute("data-qa-ref", String(ref));
      const r = el.getBoundingClientRect();
      const e = { ref, tag: el.tagName.toLowerCase(), role: el.getAttribute("role") || null, name: accessibleName(el) || null, text: shortText(el), x: Math.round(r.x + r.width / 2 - fr.x), y: Math.round(r.y + r.height / 2 - fr.y) };
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") { e.input_type = el.type || "text"; e.value = el.type === "checkbox" ? (el.checked ? "on" : "off") : el.value || ""; }
      results.push(e);
    }
    return { url: "https://northwind-tasks.test/app/launch-week", title: "Launch week · Northwind Tasks", viewport: { w: Math.round(fr.width), h: Math.round(fr.height) }, scroll: { x: 0, y: 0 }, elements: results };
  }
  function formatForLlm(skel, max) {
    max = max || 200;
    const lines = [`URL: ${skel.url}`, `Title: ${skel.title}`, `Viewport: ${skel.viewport.w}x${skel.viewport.h} (scrolled to y=${skel.scroll.y})`, `Elements (${skel.elements.length} captured):`];
    for (const el of skel.elements.slice(0, max)) {
      const p = [`[${el.ref}]`, el.tag];
      if (el.role) p.push(`role=${el.role}`);
      if (el.name) p.push(`name="${el.name.slice(0, 60)}"`);
      if (el.text) p.push(`text="${el.text.slice(0, 80)}"`);
      if ("value" in el) p.push(`value="${String(el.value).slice(0, 40)}"`);
      if (el.input_type) p.push(`input_type=${el.input_type}`);
      lines.push("  " + p.join(" "));
    }
    if (skel.elements.length > max) lines.push(`  ... (${skel.elements.length - max} more elements not shown)`);
    return lines.join("\n");
  }

  /* ------------------------------------------------------------- snapshots
     a "screenshot" is a frozen copy of the app's DOM with form state baked in */
  function snapshot(root, cursor) {
    const clone = root.cloneNode(true);
    const src = root.querySelectorAll("input"), dst = clone.querySelectorAll("input");
    src.forEach((el, i) => {
      const c = dst[i];
      if (el.type === "checkbox") { if (el.checked) c.setAttribute("checked", ""); else c.removeAttribute("checked"); }
      else c.setAttribute("value", el.value);
      if (el.disabled) c.setAttribute("disabled", ""); else c.removeAttribute("disabled");
    });
    clone.querySelectorAll("[data-qa-ref]").forEach((el) => el.removeAttribute("data-qa-ref"));
    clone.querySelectorAll(".nw-blank").forEach((el) => el.remove());
    clone.querySelectorAll(".is-new").forEach((el) => el.classList.remove("is-new"));
    clone.querySelectorAll(".is-agent-focus").forEach((el) => el.classList.remove("is-agent-focus"));
    if (cursor) {
      const m = document.createElement("i");
      m.className = "snap-cur";
      m.setAttribute("style", `position:absolute;left:${Math.round(cursor.x) - 11}px;top:${Math.round(cursor.y) - 11}px;width:22px;height:22px;border-radius:50%;border:3px solid #C7312B;box-shadow:0 0 0 3px rgba(199,49,43,.25);pointer-events:none`);
      clone.appendChild(m);
    }
    return { html: clone.outerHTML, w: root.offsetWidth, h: root.offsetHeight };
  }

  /* ------------------------------------------------------- deterministic ms */
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const fakeMs = (kind, key, n) => {
    const j = hash(kind + key) % 1000 / 1000;
    if (kind === "goto") return 280 + Math.round(j * 90);
    if (kind === "reload") return 380 + Math.round(j * 90);
    if (kind === "type") return 40 + 30 * (n || 1) + Math.round(j * 20);
    if (kind === "fill") return 40 + Math.round(j * 40);
    if (kind === "scroll") return 10 + Math.round(j * 10);
    return 60 + Math.round(j * 90);
  };

  const SPEED = { fast: 0.2, normal: 1.0, slow: 2.0 }; // player.SPEED_MULTIPLIERS
  const MAX_STEPS_PER_AC = 25; // agent.MAX_STEPS_PER_AC

  /* ----------------------------------------------------------- the run loop
     mirrors agent.verify_criterion / run_section. ui supplies: app, frame,
     cursor driver, log(kind,text), onStep, onCase, speed(), cancelled() */
  async function runSection(cases, ui) {
    const sleep = (ms) => new Promise((res, rej) => {
      const t = ms * (SPEED[ui.speed()] || 1);
      setTimeout(() => (ui.cancelled() ? rej(new Error("cancelled")) : res()), t);
    });
    const app = ui.app;
    const report = { section: ui.title, run_at: new Date().toISOString(), model: "claude-sonnet-4-5 (simulated)", build: app.version, total: cases.length, passed: 0, failed: 0, inconclusive: 0, results: [] };
    ui.onStart(report);
    for (let i = 0; i < cases.length; i++) {
      const c = cases[i];
      const plan = makePlan(c.ac, app.today);
      ui.onCase(c, "running");
      ui.log("agent", `AC #${i + 1} ${c.id}: ${c.main}`);
      // reset to a known state between ACs (run_section does page.goto(start_url))
      app.resetFixture();
      ui.log("playwright", `page.goto('https://northwind-tasks.test/app/launch-week') · ${fakeMs("goto", c.id)}ms`, true);
      ui.log("fixture", `workspace "Launch week" reset to 3 tasks`);
      await ui.cursorHome();
      await sleep(220);
      const mem = {};
      const history = [];
      const result = { id: c.id, ac: c.ac, section: c.section, risk: c.risk, verdict: "inconclusive", reasoning: "loop exited without a verify action", steps: [] };
      let stepNo = 0;
      for (const st of plan.steps.concat([{ act: "verify" }])) {
        if (++stepNo > MAX_STEPS_PER_AC) break;
        const skel = captureSkeleton(app.root, ui.frame);
        const q = query(app.root);
        if (st.observe) st.observe(q, mem);
        const el = st.sel ? app.root.querySelector(st.sel) : null;
        const ref = el ? Number(el.getAttribute("data-qa-ref")) || null : null;
        const cursorPt = el ? ui.pointOf(el) : ui.cursorPoint();
        // screenshot first, like agent.py: the picture is what the model was looking at
        const shot = snapshot(app.root, st.act === "verify" || st.act === "reload" || st.act === "scroll" ? null : cursorPt);
        ui.log("skeleton", `${skel.elements.length} elements captured`);
        if (st.act === "verify") {
          const v = plan.verify(q, mem);
          const aj = v.verdict === "inconclusive" ? null : { thought: v.verdict === "pass" ? "The page state satisfies the criterion." : "The page state contradicts the criterion.", action: "verify", verdict: v.verdict, reasoning: v.reasoning };
          result.verdict = v.verdict;
          result.reasoning = v.reasoning;
          result.skeleton = formatForLlm(skel, 180);
          if (aj) {
            ui.log("claude", aj.thought + " " + JSON.stringify({ action: "verify", verdict: v.verdict }));
            history.push({ action_json: aj, result: "verdict", shot });
          } else {
            ui.log("agent", `no verify action, ${v.reasoning.split(".")[0]}`);
          }
          if (v.bug) result.bug = v.bug;
          ui.onStep(c, history.length, aj || { action: "timeout" }, shot, v.verdict);
          await sleep(300);
          break;
        }
        const aj = { thought: st.say, action: st.act === "fill" ? "type" : st.act };
        if (ref) aj.ref = ref;
        if (st.text && st.act !== "scroll") aj.text = st.text;
        if (st.act === "scroll") aj.text = st.text;
        ui.log("claude", `${st.say}  ${JSON.stringify(Object.fromEntries(Object.entries(aj).filter(([k]) => k !== "thought")))}`);
        await sleep(260);
        let res = "ok", pw = "";
        if (st.act === "click") {
          await ui.moveTo(el, 320); await ui.click(el); res = "clicked";
          pw = `page.click('${st.sel}') · ${fakeMs("click", c.id + stepNo)}ms`;
        } else if (st.act === "type") {
          await ui.moveTo(el, 320); await ui.type(el, st.text, 26); res = `typed '${st.text.slice(0, 40)}'`;
          pw = `page.click('${st.sel}'); keyboard.type('${st.text}', delay=30) · ${fakeMs("type", c.id + stepNo, st.text.length)}ms`;
        } else if (st.act === "fill") {
          await ui.moveTo(el, 320); await ui.fill(el, st.text); res = `typed '${st.text}'`;
          pw = `page.fill('${st.sel}', '${st.text}') · ${fakeMs("fill", c.id + stepNo)}ms`;
        } else if (st.act === "reload") {
          await ui.reload(); res = "reloaded";
          pw = `page.reload() · ${fakeMs("reload", c.id)}ms`;
        } else if (st.act === "scroll") {
          await ui.wiggle(); res = `scrolled ${st.text}`;
          pw = st.text === "top" ? `page.evaluate('window.scrollTo(0, 0)') · ${fakeMs("scroll", c.id + 1)}ms` : `mouse.wheel(0, 600) · ${fakeMs("scroll", c.id)}ms`;
        }
        ui.log("playwright", pw, true);
        history.push({ action_json: aj, result: res, shot });
        ui.onStep(c, history.length, aj, shot, null);
        await sleep(170);
      }
      result.steps = history;
      report.results.push(result);
      report[result.verdict === "pass" ? "passed" : result.verdict === "fail" ? "failed" : "inconclusive"]++;
      ui.log("verdict", `${c.id} ${result.verdict === "inconclusive" ? "BLOCKED" : result.verdict.toUpperCase()}: ${result.reasoning}`, false, result.verdict);
      ui.onCase(c, result.verdict, result, report);
      await sleep(260);
    }
    report.finished = true;
    return report;
  }

  function query(root) {
    const $ = (s) => root.querySelector(s);
    const list = (name) => Array.from(root.querySelectorAll(`[data-test=${name}] > [data-test=task]`));
    const titleOf = (row) => (row.querySelector("[data-test=task-title]") || {}).textContent || "";
    return {
      $, titleOf,
      openRows: () => list("open-list"),
      dueOf: (row) => { const d = row.querySelector("[data-test=task-due]"); return d ? d.textContent.trim() : ""; },
      rowByTitle: (t, where) => (where === "done" ? list("done-list") : where === "open" ? list("open-list") : list("open-list").concat(list("done-list"))).find((r) => titleOf(r) === t) || null,
      r: (el) => {
        if (!el) return "[no ref]";
        const own = el.getAttribute("data-qa-ref");
        if (own) return `[ref ${own}]`;
        const kid = el.querySelector("[data-test=task-title][data-qa-ref]") || el.querySelector("[data-qa-ref]");
        return kid ? `[ref ${kid.getAttribute("data-qa-ref")}]` : "[not in skeleton]";
      },
    };
  }

  /* -------------------------------------------------------------- bugs */
  function bugsOf(report, cases) {
    const sev = { high: "High", medium: "Medium", low: "Low" };
    return report.results.filter((r) => r.verdict === "fail" && r.bug).map((r, i) => {
      const c = cases.find((x) => x.id === r.id) || {};
      return {
        id: `BUG-${String(i + 1).padStart(2, "0")}`,
        caseId: r.id, title: r.bug.title, severity: sev[r.risk.level], level: r.risk.level,
        repro: (c.steps || []).slice(),
        expected: r.bug.expected, actual: r.bug.actual,
        evidence: r.steps.length ? r.steps[r.steps.length - 1].shot : null,
      };
    });
  }

  /* -------------------------------------------------- report.html (download)
     reporter_html.build_report, ported: same CSS, same blocks; screenshots are
     inline DOM snapshots so the file is fully self-contained. */
  const REPORT_CSS = `
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; margin: 0; padding: 32px; background: #0b0d12; color: #e6e8ee; max-width: 1100px; margin: 0 auto; }
h1 { font-size: 28px; margin: 0 0 6px; color: #fff; }
h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .6px; color: #98a1b3; margin: 32px 0 12px; }
.subtitle { color: #98a1b3; margin-bottom: 24px; font-size: 14px; }
.summary { display: flex; gap: 16px; padding: 16px; background: #161922; border: 1px solid #2a2f3d; border-radius: 12px; margin-bottom: 32px; flex-wrap: wrap; }
.stat { flex: 1; min-width: 90px; }
.stat .label { color: #98a1b3; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
.stat .value { font-size: 28px; font-weight: 600; margin-top: 4px; }
.stat.pass .value { color: #34d399; } .stat.fail .value { color: #f87171; } .stat.inc .value { color: #fbbf24; } .stat.total .value { color: #fff; }
.ac { border: 1px solid #2a2f3d; border-radius: 12px; margin-bottom: 20px; background: #161922; overflow: hidden; }
.ac-header { padding: 16px 20px; display: flex; align-items: flex-start; gap: 12px; cursor: pointer; user-select: none; }
.ac-header:hover { background: #1c2030; }
.badge { flex-shrink: 0; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.badge.pass { background: rgba(52,211,153,0.15); color: #34d399; border: 1px solid rgba(52,211,153,0.3); }
.badge.fail { background: rgba(248,113,113,0.15); color: #f87171; border: 1px solid rgba(248,113,113,0.3); }
.badge.inconclusive { background: rgba(251,191,36,0.15); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); }
.badge.risk { background: transparent; color: #98a1b3; border: 1px solid #2a2f3d; }
.ac-title { flex: 1; font-size: 14px; line-height: 1.5; color: #e6e8ee; white-space: pre-wrap; }
.ac-title .num { color: #6c7589; margin-right: 8px; }
.toggle { color: #6c7589; font-size: 12px; flex-shrink: 0; }
.ac-body { padding: 0 20px 20px; display: none; border-top: 1px solid #2a2f3d; }
.ac.open .ac-body { display: block; }
.ac.open .toggle::before { content: "Hide"; }
.ac:not(.open) .toggle::before { content: "Show steps"; }
.reasoning { padding: 14px 16px; background: #0e1118; border-radius: 8px; margin: 16px 0; color: #c8cdd8; font-size: 13px; line-height: 1.6; white-space: pre-wrap; border-left: 3px solid #4f6df3; }
.reasoning .label { color: #98a1b3; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; display: block; }
.steps { display: flex; flex-direction: column; gap: 16px; }
.step { border: 1px solid #2a2f3d; border-radius: 8px; overflow: hidden; background: #0e1118; }
.step-meta { padding: 12px 16px; display: flex; gap: 12px; align-items: flex-start; }
.step-num { flex-shrink: 0; width: 28px; height: 28px; border-radius: 999px; background: #1c2030; color: #98a1b3; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
.step-content { flex: 1; min-width: 0; }
.thought { color: #c8cdd8; font-size: 13px; line-height: 1.5; margin-bottom: 6px; }
.action { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 12px; color: #98a1b3; background: #161922; padding: 6px 10px; border-radius: 6px; word-break: break-all; }
.action .ok { color: #34d399; } .action .err { color: #f87171; }
.screenshot { width: 100%; display: block; border-top: 1px solid #2a2f3d; background: #e9ecf2; padding: 14px; overflow: auto; }
.screenshot .nw { max-width: 560px; margin: 0 auto; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,.35); pointer-events: none; }
.verdict-step .step-meta { background: rgba(79,109,243,0.08); }
.bug { border: 1px solid rgba(248,113,113,.35); border-radius: 12px; background: #1a1418; padding: 16px 20px; margin-bottom: 16px; }
.bug h3 { margin: 6px 0 10px; font-size: 16px; color: #fff; }
.bug .meta { font-size: 12px; color: #98a1b3; }
.bug .sev { color: #f87171; font-weight: 700; }
.bug ol { margin: 0 0 10px; padding-left: 20px; color: #c8cdd8; font-size: 13px; line-height: 1.6; }
.bug .ea { display: grid; grid-template-columns: 90px 1fr; gap: 4px 10px; font-size: 13px; color: #c8cdd8; }
.bug .ea b { color: #98a1b3; font-weight: 600; }
pre.skel { white-space: pre-wrap; font: 11px/1.5 ui-monospace, Menlo, monospace; color: #98a1b3; background: #0e1118; padding: 12px; border-radius: 8px; max-height: 260px; overflow: auto; }
footer { color: #6c7589; font-size: 12px; margin-top: 32px; }
`;
  const REPORT_JS = `document.querySelectorAll('.ac-header').forEach(h => { h.addEventListener('click', () => h.parentElement.classList.toggle('open')); });`;
  const VERDICT_LABEL = (v) => (v === "inconclusive" ? "BLOCKED" : String(v || "unknown").toUpperCase());

  function actionSummary(a) {
    const parts = [`<strong>${esc(a.action || "?")}</strong>`];
    if (a.ref != null) parts.push(`ref=${a.ref}`);
    if (a.text) parts.push(`text=${esc(("'" + a.text + "'").slice(0, 60))}`);
    if (a.key) parts.push(`key=${esc(a.key)}`);
    if (a.verdict) parts.push(`verdict=${esc(a.verdict)}`);
    return parts.join(" &nbsp; ");
  }
  function renderStep(idx, step) {
    const a = step.action_json || {};
    const res = step.result || "";
    const cls = res.startsWith("error:") ? "err" : "ok";
    const isV = a.action === "verify";
    return `<div class="step${isV ? " verdict-step" : ""}"><div class="step-meta"><div class="step-num">${idx}</div><div class="step-content"><div class="thought">${esc(a.thought || "")}</div><div class="action">${actionSummary(a)} &nbsp; &rarr; <span class="${cls}">${esc(res)}</span></div></div></div>${step.shot ? `<div class="screenshot">${step.shot.html}</div>` : ""}</div>`;
  }
  function renderAc(idx, r) {
    const steps = r.steps.map((s, i) => renderStep(i + 1, s)).join("");
    return `<div class="ac"><div class="ac-header"><span class="badge ${esc(r.verdict)}">${VERDICT_LABEL(r.verdict)}</span><div class="ac-title"><span class="num">AC #${idx} · ${esc(r.id)}</span>${esc(r.ac)}</div><span class="badge risk">${esc(r.risk.level)} risk</span><div class="toggle"></div></div><div class="ac-body"><div class="reasoning"><span class="label">Verdict reasoning</span>${esc(r.reasoning)}</div><div class="steps">${steps}</div>${r.skeleton ? `<h2>Skeleton sent to the model at the verdict</h2><pre class="skel">${esc(r.skeleton)}</pre>` : ""}</div></div>`;
  }
  function buildReportHtml(report, bugs, appCss) {
    const bugsHtml = bugs.length
      ? `<h2>Bugs found (${bugs.length})</h2>` + bugs.map((b) => `<div class="bug"><div class="meta">${esc(b.id)} · <span class="sev">${esc(b.severity)} severity</span> · from ${esc(b.caseId)}</div><h3>${esc(b.title)}</h3><ol>${b.repro.map((s) => `<li>${esc(s)}</li>`).join("")}</ol><div class="ea"><b>Expected</b><span>${esc(b.expected)}</span><b>Actual</b><span>${esc(b.actual)}</span></div></div>`).join("")
      : "";
    const acs = report.results.map((r, i) => renderAc(i + 1, r)).join("");
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>QA Report — ${esc(report.section)}</title>
<style>${REPORT_CSS}${appCss}</style>
</head>
<body>
    <h1>Autonomous QA — ${esc(report.section)}</h1>
    <div class="subtitle">Run at ${esc(report.run_at)} &nbsp;·&nbsp; model: ${esc(report.model)} &nbsp;·&nbsp; app: Northwind Tasks ${esc(report.build)}</div>
    <div class="summary">
        <div class="stat total"><div class="label">Total</div><div class="value">${report.total}</div></div>
        <div class="stat pass"><div class="label">Passed</div><div class="value">${report.passed}</div></div>
        <div class="stat fail"><div class="label">Failed</div><div class="value">${report.failed}</div></div>
        <div class="stat inc"><div class="label">Blocked</div><div class="value">${report.inconclusive}</div></div>
    </div>
    ${bugsHtml}
    <h2>Acceptance criteria</h2>
    ${acs}
    <footer>Generated by the VectraView QA Bot demo. Northwind Tasks is a fictional app; all data is sample data.</footer>
<script>${REPORT_JS}</script>
</body>
</html>
`;
  }

  window.QABot = { parsePrd, listSections, scoreRisk, buildCases, makePlan, captureSkeleton, formatForLlm, snapshot, runSection, bugsOf, buildReportHtml, SPEED, VERDICT_LABEL };
})();
