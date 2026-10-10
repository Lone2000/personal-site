/* Northwind Tasks: a tiny fictional to-do app that the QA agent tests.
   Real DOM, really clickable. Two bugs are seeded on purpose (build v1.4.0):
     1. a due date in the past is accepted (the validation rule is missing)
     2. the "remind" flag is dropped when a task is saved, so it disappears on reload
   Build v1.4.1 ("fix the bugs") restores both. */
(function () {
  "use strict";

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n) => String(n).padStart(2, "0");
  const isoOf = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const todayIso = () => isoOf(new Date());
  const addDays = (iso, n) => {
    const [y, m, d] = iso.split("-").map(Number);
    return isoOf(new Date(y, m - 1, d + n));
  };
  const fmtDue = (iso) => {
    const [, m, d] = iso.split("-").map(Number);
    return MONTHS[m - 1] + " " + d;
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* App CSS is a string so the QA report can embed it next to its DOM snapshots. */
  const APP_CSS = `
.nw{--nw-bg:#f6f7f9;--nw-card:#fff;--nw-ink:#1b2230;--nw-mute:#667085;--nw-line:#e3e6ec;--nw-acc:#2f5bd3;--nw-acc2:#e8eefc;--nw-bad:#c2362f;--nw-ok:#1f7a4d;
  font:14px/1.4 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--nw-ink);background:var(--nw-bg);
  text-transform:none;letter-spacing:0;min-height:100%;position:relative;-webkit-font-smoothing:antialiased}
.nw *{box-sizing:border-box}
.nw-top{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--nw-card);border-bottom:1px solid var(--nw-line)}
.nw-logo{width:24px;height:24px;border-radius:7px;background:var(--nw-acc);color:#fff;display:grid;place-items:center;font-weight:800;font-size:13px}
.nw-brand{font-weight:700;font-size:14px;white-space:nowrap}
.nw-proj{color:var(--nw-mute);font-size:13px}
.nw-proj:before{content:"/";margin:0 6px;color:#c3c8d2}
.nw-ver{margin-left:auto;font:600 11px ui-monospace,Menlo,monospace;color:var(--nw-mute);background:#eef0f4;border-radius:999px;padding:2px 8px}
.nw-ava{width:24px;height:24px;border-radius:50%;background:#f2c48d;color:#5b3a12;display:grid;place-items:center;font-weight:700;font-size:11px}
.nw-body{padding:14px}
.nw-form{background:var(--nw-card);border:1px solid var(--nw-line);border-radius:12px;padding:12px;box-shadow:0 1px 2px rgba(16,24,40,.05)}
.nw-in{width:100%;border:1px solid var(--nw-line);border-radius:8px;padding:8px 10px;font:inherit;color:inherit;background:#fff;outline:none}
.nw-in:focus,.nw-in.is-agent-focus{border-color:var(--nw-acc);box-shadow:0 0 0 3px var(--nw-acc2)}
.nw-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:8px}
.nw-date{width:auto;flex:1 1 140px;min-width:0}
.nw-sw{display:inline-flex;align-items:center;gap:7px;font-size:13px;color:var(--nw-ink);cursor:pointer;user-select:none;flex:0 0 auto}
.nw-sw input{appearance:none;-webkit-appearance:none;width:30px;height:18px;border-radius:999px;background:#d0d5dd;position:relative;cursor:pointer;margin:0;transition:background .15s}
.nw-sw input:before{content:"";position:absolute;left:2px;top:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2);transition:transform .15s}
.nw-sw input:checked{background:var(--nw-acc)}
.nw-sw input:checked:before{transform:translateX(12px)}
.nw-sw input:disabled{opacity:.45;cursor:not-allowed}
.nw-sw input:disabled+span{color:#98a2b3}
.nw-add{border:0;border-radius:8px;background:var(--nw-acc);color:#fff;font:600 13px/1 inherit;font-family:inherit;padding:9px 14px;cursor:pointer;flex:0 0 auto}
.nw-add:hover{filter:brightness(1.08)}
.nw-add.is-agent-focus{box-shadow:0 0 0 3px var(--nw-acc2)}
.nw-err{margin:8px 0 0;color:var(--nw-bad);font-size:12.5px;font-weight:600;min-height:0}
.nw-err:empty{display:none}
.nw-h{display:flex;align-items:center;gap:6px;margin:16px 2px 6px;font-size:11.5px;font-weight:700;color:var(--nw-mute);text-transform:uppercase;letter-spacing:.06em}
.nw-h b{background:#eef0f4;color:var(--nw-mute);border-radius:999px;padding:1px 7px;font-size:11px}
.nw-list{list-style:none;margin:0;padding:0;background:var(--nw-card);border:1px solid var(--nw-line);border-radius:12px;overflow:hidden}
.nw-list:empty:after{content:"Nothing here.";display:block;padding:10px 12px;color:#98a2b3;font-size:13px}
.nw-task{display:flex;align-items:center;gap:10px;padding:9px 12px;border-top:1px solid var(--nw-line);min-height:40px}
.nw-task:first-child{border-top:0}
.nw-task.is-new{animation:nwIn .5s ease}
@keyframes nwIn{from{background:#fff8d8}to{background:#fff}}
.nw-chk{width:16px;height:16px;margin:0;accent-color:var(--nw-acc);cursor:pointer;flex:0 0 auto}
.nw-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nw-task.is-done .nw-title{text-decoration:line-through;color:#98a2b3}
.nw-due{font-size:11.5px;font-weight:600;color:var(--nw-mute);background:#f2f4f7;border-radius:6px;padding:2px 7px;white-space:nowrap}
.nw-due.is-today{background:#fff1d6;color:#9a5b00}
.nw-due.is-late{background:#fde8e6;color:var(--nw-bad)}
.nw-bell{width:15px;height:15px;color:var(--nw-acc);flex:0 0 auto}
.nw-blank{position:absolute;inset:0;background:#fff;display:grid;place-items:center;color:#98a2b3;font-size:12px}
@media (max-width:420px){.nw-proj{display:none}}
@media (prefers-reduced-motion:reduce){.nw-task.is-new{animation:none}.nw-sw input,.nw-sw input:before{transition:none}}
`;

  const BELL = '<svg class="nw-bell" data-test="task-bell" role="img" aria-label="Reminder on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';

  /* ---- the simulated backend: stores rows as JSON, like a real API would ---- */
  class Server {
    constructor() { this.rows = []; this.nextId = 1; this.fixed = false; }
    // the column whitelist used when writing a task. v1.4.0 forgot "remind" (bug 2).
    columns() { return this.fixed ? ["id", "title", "due", "remind", "done"] : ["id", "title", "due", "done"]; }
    toRow(t) { const r = {}; for (const k of this.columns()) r[k] = t[k]; return JSON.stringify(r); }
    seed(fixture) { this.rows = fixture.map((t) => JSON.stringify(t)); this.nextId = fixture.length + 1; }
    list() { return this.rows.map((r) => { const t = JSON.parse(r); return { id: t.id, title: t.title, due: t.due || "", remind: !!t.remind, done: !!t.done }; }); }
    insert(t) { t.id = this.nextId++; this.rows.unshift(this.toRow(t)); return t; }
    update(t) { const i = this.rows.findIndex((r) => JSON.parse(r).id === t.id); if (i >= 0) this.rows[i] = this.toRow(t); }
  }

  function fixture() {
    const t = todayIso();
    return [
      { id: 1, title: "Draft launch checklist", due: addDays(t, 3), remind: true, done: false },
      { id: 2, title: "Book a room for the offsite", due: "", remind: false, done: false },
      { id: 3, title: "Set up the project board", due: addDays(t, -2), remind: false, done: true },
    ];
  }

  class NorthwindApp {
    constructor(mount) {
      this.mount = mount;
      this.server = new Server();
      this.server.seed(fixture());
      this.view = [];
      this.fixed = false;
      this.mountApp();
    }
    get version() { return this.fixed ? "v1.4.1" : "v1.4.0"; }
    get today() { return todayIso(); }
    setFixed(v) { this.fixed = !!v; this.server.fixed = this.fixed; }
    resetFixture() { this.server.seed(fixture()); this.mountApp(); }
    /* page.reload(): throw away the view state and re-read everything from the server */
    reload(blankMs) {
      return new Promise((res) => {
        const blank = document.createElement("div");
        blank.className = "nw-blank"; blank.textContent = "loading…";
        this.root && this.root.appendChild(blank);
        setTimeout(() => { this.mountApp(); res(); }, blankMs || 0);
      });
    }
    mountApp() {
      this.view = this.server.list();
      const t = this.today;
      this.mount.innerHTML = `
<div class="nw" data-build="${this.version}">
  <div class="nw-top"><span class="nw-logo" aria-hidden="true">N</span><span class="nw-brand">Northwind Tasks</span><span class="nw-proj">Launch week</span><span class="nw-ver">${this.version}</span><span class="nw-ava" aria-label="Signed in as Mira">MI</span></div>
  <div class="nw-body">
    <form class="nw-form" data-test="new-task" novalidate autocomplete="off">
      <input class="nw-in" data-test="title" name="title" placeholder="What needs doing?" aria-label="Task title" maxlength="80">
      <div class="nw-row">
        <input class="nw-in nw-date" data-test="due" name="due" type="date" aria-label="Due date"${this.fixed ? ` min="${t}"` : ""}>
        <label class="nw-sw"><input type="checkbox" data-test="remind" name="remind" disabled><span>Remind me</span></label>
        <button class="nw-add" data-test="add-task" type="submit">Add task</button>
      </div>
      <p class="nw-err" data-test="form-error" role="alert"></p>
    </form>
    <div class="nw-h">Open <b data-test="open-count">0</b></div>
    <ul class="nw-list" data-test="open-list"></ul>
    <div class="nw-h">Done <b data-test="done-count">0</b></div>
    <ul class="nw-list" data-test="done-list"></ul>
  </div>
</div>`;
      this.root = this.mount.firstElementChild;
      this.form = this.root.querySelector("[data-test=new-task]");
      this.$title = this.root.querySelector("[data-test=title]");
      this.$due = this.root.querySelector("[data-test=due]");
      this.$remind = this.root.querySelector("[data-test=remind]");
      this.$err = this.root.querySelector("[data-test=form-error]");
      this.form.addEventListener("submit", (e) => { e.preventDefault(); this.add(); });
      const syncRemind = () => {
        const has = !!this.$due.value;
        this.$remind.disabled = !has;
        if (!has) this.$remind.checked = false;
      };
      this.$due.addEventListener("input", syncRemind);
      this.$due.addEventListener("change", syncRemind);
      this.$title.addEventListener("input", () => { if (this.$err.textContent) this.$err.textContent = ""; });
      this.root.addEventListener("change", (e) => {
        const c = e.target.closest("[data-test=task-check]");
        if (!c) return;
        const id = Number(c.closest("[data-id]").dataset.id);
        const task = this.view.find((x) => x.id === id);
        if (!task) return;
        task.done = c.checked;
        this.server.update(task);
        this.renderLists();
      });
      this.renderLists();
    }
    add() {
      const title = this.$title.value.trim();
      const due = this.$due.value;
      if (!title) { this.$err.textContent = "Title is required"; return; }
      // bug 1: v1.4.0 never compares the due date with today
      if (this.fixed && due && due < this.today) { this.$err.textContent = "Due date can't be in the past"; return; }
      this.$err.textContent = "";
      const task = { title, due, remind: !!(due && this.$remind.checked), done: false };
      this.server.insert(task);
      // optimistic UI keeps the full object, which is why bug 2 only shows after a reload
      this.view.unshift(Object.assign({}, task));
      this.form.reset();
      this.$remind.disabled = true;
      this.renderLists(task.id);
    }
    renderLists(newId) {
      const t = this.today;
      const row = (x) => {
        let due = "";
        if (x.due) {
          const cls = x.due === t ? " is-today" : x.due < t && !x.done ? " is-late" : "";
          due = `<span class="nw-due${cls}" data-test="task-due">${x.due === t ? "Today" : "Due " + fmtDue(x.due)}</span>`;
        }
        return `<li class="nw-task${x.done ? " is-done" : ""}${x.id === newId ? " is-new" : ""}" data-test="task" data-id="${x.id}">
<input type="checkbox" class="nw-chk" data-test="task-check" aria-label="Mark ${esc(x.title)} done"${x.done ? " checked" : ""}>
<span class="nw-title" data-test="task-title">${esc(x.title)}</span>${x.remind ? BELL : ""}${due}</li>`;
      };
      const open = this.view.filter((x) => !x.done);
      const done = this.view.filter((x) => x.done);
      this.root.querySelector("[data-test=open-list]").innerHTML = open.map(row).join("");
      this.root.querySelector("[data-test=done-list]").innerHTML = done.map(row).join("");
      this.root.querySelector("[data-test=open-count]").textContent = open.length;
      this.root.querySelector("[data-test=done-count]").textContent = done.length;
    }
  }

  window.Northwind = { NorthwindApp, APP_CSS, todayIso, addDays, fmtDue, esc };
})();
