/* sunshine jar — the page.

   One board object comes down from /api/board and everything on screen is
   drawn from it. Every write posts, then re-renders from what came back, so
   the two phones never disagree for longer than one refresh. */

(() => {
  "use strict";

  const $  = (id) => document.getElementById(id);
  const el = (sel, root) => (root || document).querySelector(sel);

  const state = {
    ideas: [],
    cats: [],
    me: localStorage.getItem("sun.me") || "",
    filter: "",          // category id the board is filtered to, "" = everything
    open: null,          // id of the idea whose sheet is up
    pulled: null,        // id showing in the jar sheet
    editing: null,       // id being edited, when the add sheet is in edit mode
    addCat: "",          // category picked in the add form, before it's saved
    busy: false,
  };

  /* ── words and time ──────────────────────────────────────────────────── */

  const NAME = { a: "maya", i: "theo" };
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const nm = (w) => `<b class="nm-${w}">${NAME[w] || "someone"}</b>`;

  const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun",
                  "jul", "aug", "sep", "oct", "nov", "dec"];

  function clock(d) {
    let h = d.getHours();
    const ampm = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    return `${h}:${String(d.getMinutes()).padStart(2, "0")}${ampm}`;
  }

  function stamp(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${clock(d)}`;
  }

  /* "2 hours ago" only stays useful for about a day; past that the date is
     what you actually want to know. */
  function ago(iso) {
    const then = new Date(iso).getTime();
    const mins = Math.round((Date.now() - then) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
    return stamp(iso);
  }

  function dayKey(iso) {
    const d = new Date(iso);
    const today = new Date();
    const same = (a, b) => a.toDateString() === b.toDateString();
    const yest = new Date(today.getTime() - 86400e3);
    if (same(d, today)) return "today";
    if (same(d, yest)) return "yesterday";
    return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }

  /* ── talking to the server ───────────────────────────────────────────── */

  async function api(path, body) {
    const res = await fetch(path, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    });
    let out = {};
    try { out = await res.json(); } catch { /* nothing useful came back */ }
    if (!res.ok) {
      const e = new Error(out.error || `something went wrong (${res.status})`);
      e.status = res.status;
      e.detail = out.detail;
      throw e;
    }
    return out;
  }

  async function refresh(prefetched) {
    const out = prefetched || await api("/api/board");
    state.ideas = out.ideas || [];
    state.cats = out.categories || [];
    // a category can be deleted on the other phone while this one is filtered by it
    if (state.filter && !state.cats.some((c) => c.id === state.filter)) state.filter = "";
    render();
  }

  /* ── the lock ────────────────────────────────────────────────────────── */

  $("lockForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("lockMsg");
    msg.textContent = "";
    try {
      await api("/api/unlock", { pass: $("lockIn").value });
      await enter();
    } catch (err) {
      msg.textContent = err.status === 401 ? "that's not it." : err.message;
      $("lockIn").select();
    }
  });

  async function enter(prefetched) {
    document.body.classList.remove("is-locked");
    document.body.classList.add("is-open");
    await refresh(prefetched);
    bellSetup();
    openFromHash();
    if (!state.me) openSheet("whoSheet");
  }

  /* ── who am i ────────────────────────────────────────────────────────── */

  function setMe(w) {
    state.me = w;
    localStorage.setItem("sun.me", w);
    paintMe();
  }

  function paintMe() {
    document.body.dataset.me = state.me || "";
    $("meName").textContent = state.me ? `you're ${NAME[state.me]}` : "who's this?";
    document.querySelectorAll(".who__opt").forEach((b) =>
      b.classList.toggle("is-on", b.dataset.me === state.me));
  }

  $("meToggle").addEventListener("click", () => openSheet("whoSheet"));
  document.querySelectorAll(".who__opt").forEach((b) =>
    b.addEventListener("click", () => { setMe(b.dataset.me); closeSheets(); }));

  /* nothing gets written without a signature on it */
  function needMe() {
    if (state.me) return true;
    openSheet("whoSheet");
    return false;
  }

  /* ── mood ────────────────────────────────────────────────────────────── */

  const mood = localStorage.getItem("sun.mood");
  document.body.dataset.mood = mood || (new Date().getHours() >= 19 || new Date().getHours() < 6 ? "dusk" : "sun");
  $("moodToggle").addEventListener("click", () => {
    const next = document.body.dataset.mood === "dusk" ? "sun" : "dusk";
    document.body.dataset.mood = next;
    localStorage.setItem("sun.mood", next);
  });

  /* ── sheets ──────────────────────────────────────────────────────────── */

  function openSheet(id) { $(id).hidden = false; }

  /* sheets stack — the category sheet opens over the add sheet — so closing
     one closes only that one. half-typed text behind it survives. */
  function closeOne(id) {
    $(id).hidden = true;
    if (id === "ideaSheet") state.open = null;
    if (id === "pullSheet") state.pulled = null;
    if (id === "addSheet") state.editing = null;
  }

  function closeSheets() {
    document.querySelectorAll(".sheet").forEach((s) => closeOne(s.id));
  }

  const topSheet = () =>
    [...document.querySelectorAll(".sheet")].filter((s) => !s.hidden).pop();

  document.addEventListener("click", (e) => {
    const hit = e.target.closest("[data-close]");
    if (!hit) return;
    const sheet = hit.closest(".sheet");
    if (sheet) closeOne(sheet.id);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("photoView").hidden) { $("photoView").hidden = true; return; }
    const top = topSheet();
    if (top) closeOne(top.id);
  });
  $("photoView").addEventListener("click", () => { $("photoView").hidden = true; });

  /* ── tabs ────────────────────────────────────────────────────────────── */

  $("tabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("is-on", t === tab));
    document.querySelectorAll(".view").forEach((v) =>
      v.classList.toggle("is-on", v.id === "view-" + tab.dataset.view));
  });

  /* ── drawing the board ───────────────────────────────────────────────── */

  const byNewest = (a, b) => (a.at < b.at ? 1 : -1);

  function render() {
    paintMe();
    const open = state.ideas.filter((i) => i.status !== "done");
    const done = state.ideas.filter((i) => i.status === "done");

    /* picked first — those are the ones we actually said yes to */
    open.sort((a, b) => {
      if ((a.status === "picked") !== (b.status === "picked")) return a.status === "picked" ? -1 : 1;
      return byNewest(a, b);
    });

    drawCats();
    drawCork(state.filter ? open.filter((i) => i.cat === state.filter) : open);
    drawWall(done.sort((a, b) => ((a.doneAt || a.at) < (b.doneAt || b.at) ? 1 : -1)));
    drawLog();

    const inJar = open.filter((i) => i.status === "jar").length;
    $("pullBtn").disabled = inJar === 0;
    $("jarCount").textContent = inJar === 0
      ? "nothing in the jar yet"
      : `${inJar} ${inJar === 1 ? "idea" : "ideas"} waiting${done.length ? ` · ${done.length} done` : ""}`;

    if (state.open) drawThread(state.open);
  }

  const catOf = (id) => state.cats.find((c) => c.id === id) || null;

  /* the filter bar. always drawn, even with no categories yet — the ＋ is how
     you find out categories exist at all. */
  function drawCats() {
    const counts = {};
    state.ideas.forEach((i) => {
      if (i.status !== "done" && i.cat) counts[i.cat] = (counts[i.cat] || 0) + 1;
    });
    const loose = state.ideas.filter((i) => i.status !== "done").length;

    $("cats").innerHTML =
      `<button class="cchip ${state.filter ? "" : "is-on"}" data-pick="" type="button">
         everything <i>${loose}</i></button>` +
      state.cats.map((c) => `
        <button class="cchip ${state.filter === c.id ? "is-on" : ""}" style="--hue:${c.hue}"
                data-pick="${esc(c.id)}" type="button">
          ${esc(c.name)} <i>${counts[c.id] || 0}</i></button>`).join("") +
      `<button class="cchip cchip--new" data-pick="+" type="button" aria-label="manage categories">＋</button>`;
  }

  $("cats").addEventListener("click", (e) => {
    const b = e.target.closest("[data-pick]");
    if (!b) return;
    if (b.dataset.pick === "+") return openCatSheet();
    state.filter = b.dataset.pick;
    render();
  });

  function drawCork(list) {
    const cork = $("cork");
    const none = list.length === 0;
    $("boardEmpty").hidden = !none;
    $("boardEmpty").textContent = none && state.filter
      ? "nothing filed under that one yet."
      : "the jar's empty. throw something in. ↓";

    cork.innerHTML = list.map((i) => {
      const chat = i.events.filter((e) => e.k !== "add").length;
      const c = catOf(i.cat);
      return `
      <button class="note note--${i.who} ${i.status === "picked" ? "note--picked" : ""}"
              style="--tilt:${i.tilt || 0}deg" data-idea="${esc(i.id)}" type="button">
        <span class="note__pin"></span>
        ${i.status === "picked" ? '<span class="note__ribbon">this one</span>' : ""}
        ${c ? `<span class="note__tag" style="--hue:${c.hue}">${esc(c.name)}</span>` : ""}
        <h3 class="note__title">${esc(i.title)}</h3>
        ${i.blurb ? `<p class="note__blurb">${esc(i.blurb)}</p>` : ""}
        <span class="note__foot">
          <span class="note__who">${NAME[i.who]}</span>
          <span class="note__chat">${chat ? `💬 ${chat}` : stampShort(i.at)}</span>
        </span>
      </button>`;
    }).join("");
  }

  /* the chip row used inside the add form and the idea sheet. `zero` is what
     the no-category chip says, which differs by where it's being shown. */
  function pickers(host, selected, zero, onPick) {
    host.innerHTML =
      `<button class="cchip ${selected ? "" : "is-on"}" data-pick="" type="button">${zero}</button>` +
      state.cats.map((c) => `
        <button class="cchip ${selected === c.id ? "is-on" : ""}" style="--hue:${c.hue}"
                data-pick="${esc(c.id)}" type="button">${esc(c.name)}</button>`).join("") +
      `<button class="cchip cchip--new" data-pick="+" type="button" aria-label="new category">＋</button>`;

    host.onclick = (e) => {
      const b = e.target.closest("[data-pick]");
      if (!b) return;
      if (b.dataset.pick === "+") return openCatSheet();
      onPick(b.dataset.pick);
    };
  }

  function stampShort(iso) {
    const d = new Date(iso);
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }

  function drawWall(list) {
    const wall = $("wall");
    $("wallEmpty").hidden = list.length > 0;
    wall.innerHTML = list.map((i) => {
      const shot = [...i.events].reverse().find((e) => e.k === "photo");
      const felt = [...i.events].reverse().find((e) => e.k === "feel");
      return `
      <button class="pola" style="--tilt:${(i.tilt || 0) * -1}deg"
              data-idea="${esc(i.id)}" type="button">
        ${shot
          ? `<img class="pola__shot" src="${esc(window.sunDemo.photo(shot.src))}" alt="" loading="lazy">`
          : `<div class="pola__none">${document.body.dataset.mood === "dusk" ? "🌙" : "🌞"}</div>`}
        <div class="pola__cap">${esc(felt ? felt.text : i.title)}</div>
        <div class="pola__sub">${stampShort(i.doneAt || i.at)} · ${NAME[i.who]}'s idea</div>
      </button>`;
    }).join("");
  }

  /* every event from every idea, newest first, grouped by day. this is the
     whole history of the thing in one column. */
  function drawLog() {
    const rows = [];
    state.ideas.forEach((i) => i.events.forEach((e) => rows.push({ e, i })));
    rows.sort((a, b) => (a.e.at < b.e.at ? 1 : -1));

    $("logEmpty").hidden = rows.length > 0;
    let day = "";
    $("log").innerHTML = rows.map(({ e, i }) => {
      const k = dayKey(e.at);
      const head = k === day ? "" : `<li class="log__day">${k}</li>`;
      day = k;
      return head + `
      <li><button class="log__row log__row--${e.who}" data-idea="${esc(i.id)}" type="button">
        <span class="log__ic">${ICON[e.k] || "·"}</span>
        <span>
          <span class="log__what">${line(e, i)}</span>
          <span class="log__when">${clock(new Date(e.at))}</span>
          ${e.text && e.k !== "add" ? `<span class="log__quote">${esc(trim(e.text))}</span>` : ""}
        </span>
      </button></li>`;
    }).join("");
  }

  const trim = (s) => (s.length > 180 ? s.slice(0, 180).trimEnd() + "…" : s);

  const ICON = {
    add: "💡", note: "💬", photo: "📷", pick: "🫙",
    back: "↩️", done: "✅", undone: "↩️", feel: "💛", did: "📝",
    edit: "✏️", file: "🏷️",
  };

  function line(e, i) {
    const t = `<i>“${esc(i.title)}”</i>`;
    switch (e.k) {
      case "add":    return `${nm(e.who)} threw ${t} in the jar`;
      case "note":   return `${nm(e.who)} added a note to ${t}`;
      case "photo":  return `${nm(e.who)} pinned a photo to ${t}`;
      case "pick":   return `${nm(e.who)} pulled ${t} out of the jar`;
      case "back":   return `${nm(e.who)} put ${t} back in the jar`;
      case "done":   return `${nm(e.who)} crossed out ${t}`;
      case "undone": return `${nm(e.who)} put ${t} back on the board`;
      case "feel":   return `${nm(e.who)} on how ${t} felt`;
      case "did":    return `${nm(e.who)} wrote down what we actually did on ${t}`;
      case "edit":   return `${nm(e.who)} edited ${t}`;
      case "file":   return e.text && e.text !== "nothing"
                          ? `${nm(e.who)} filed ${t} under <b>${esc(e.text)}</b>`
                          : `${nm(e.who)} took ${t} out of its category`;
      default:       return t;
    }
  }

  /* one click handler for every card on the page */
  document.addEventListener("click", (e) => {
    const hit = e.target.closest("[data-idea]");
    if (hit) return openIdea(hit.dataset.idea);
    const shot = e.target.closest(".ev__shot");
    if (shot) {
      $("photoBig").src = el("img", shot).src;
      $("photoView").hidden = false;
    }
  });

  /* ── one idea, opened up ─────────────────────────────────────────────── */

  function openIdea(id) {
    state.open = id;
    drawThread(id);
    openSheet("ideaSheet");
    $("sayText").value = "";
    $("sayMsg").textContent = "";
  }

  function drawThread(id) {
    const idea = state.ideas.find((i) => i.id === id);
    if (!idea) return closeSheets();

    $("ideaTitle").textContent = idea.title;
    $("ideaMeta").innerHTML =
      `${nm(idea.who)}'s idea · ${stamp(idea.at)}` +
      (idea.status === "done" ? " · <b>done</b>"
       : idea.status === "picked" ? " · <b>we said yes to this</b>" : "");

    pickers($("ideaCats"), idea.cat || "", "no category", (cat) => file(idea.id, cat));

    $("thread").innerHTML = idea.events.map((e, n) => `
      <li class="ev ev--${e.who} ev--${e.k}">
        <span class="ev__ic">${ICON[e.k] || "·"}</span>
        <span>
          <span class="ev__head">${nm(e.who)} ${verb(e.k)} · ${ago(e.at)}</span>
          ${e.k === "photo"
            ? `<span class="ev__shot"><img src="${esc(window.sunDemo.photo(e.src))}" alt="" loading="lazy">
                 ${e.text ? `<span>${esc(e.text)}</span>` : ""}</span>`
            : e.text ? `<span class="ev__text">${esc(e.text)}</span>` : ""}
        </span>
        ${e.k === "add" ? "" : `
          <button class="ev__x" type="button" data-drop="${n}" data-at="${esc(e.at)}"
                  aria-label="delete this line">×</button>`}
      </li>`).join("");

    const done = idea.status === "done";
    const btn = $("sayDone");
    btn.textContent = done ? "put it back on the board" : "cross it out";
    btn.classList.toggle("pill--undo", done);
    btn.dataset.kind = done ? "undone" : "done";

    // keep the newest thing in view — that's what you came back for
    $("thread").lastElementChild?.scrollIntoView({ block: "nearest" });
  }

  const verb = (k) => ({
    add: "started this", note: "said", photo: "pinned a photo",
    pick: "pulled this out", back: "put it back", done: "crossed it out",
    undone: "put it back on the board", feel: "felt", did: "wrote down what we did",
    edit: "edited it", file: "filed it",
  }[k] || "");

  /* ── deleting things ─────────────────────────────────────────────────── */

  /* destructive buttons arm on the first tap and fire on the second, then
     disarm themselves. no modal, no native confirm() breaking the spell. */
  const armed = new WeakMap();
  function twoTap(btn, ready, go) {
    if (armed.has(btn)) {
      clearTimeout(armed.get(btn));
      armed.delete(btn);
      btn.textContent = btn.dataset.was;
      btn.classList.remove("is-armed");
      return go();
    }
    btn.dataset.was = btn.textContent;
    btn.textContent = ready;
    btn.classList.add("is-armed");
    armed.set(btn, setTimeout(() => {
      armed.delete(btn);
      btn.textContent = btn.dataset.was;
      btn.classList.remove("is-armed");
    }, 4000));
  }

  async function write(path, body, msgEl, done) {
    if (!needMe() || state.busy) return;
    state.busy = true;
    if (msgEl) { msgEl.className = "msg"; msgEl.textContent = "saving…"; }
    try {
      await api(path, Object.assign({ who: state.me }, body));
      await refresh();
      if (msgEl) { msgEl.className = "msg is-ok"; msgEl.textContent = "done."; }
      if (done) done();
    } catch (err) {
      if (msgEl) msgEl.textContent = err.detail ? `${err.message} — ${err.detail}` : err.message;
    } finally {
      state.busy = false;
    }
  }

  /* one line out of the thread. the timestamp goes along so the server can
     tell if the other phone changed the list since this one drew it. */
  $("thread").addEventListener("click", (e) => {
    const x = e.target.closest("[data-drop]");
    if (!x) return;
    e.stopPropagation();
    twoTap(x, "×?", () =>
      write("/api/event/delete", { id: state.open, n: Number(x.dataset.drop), at: x.dataset.at },
        $("sayMsg")));
  });

  $("ideaDelete").addEventListener("click", (e) => {
    const btn = e.currentTarget;
    twoTap(btn, "really?", () =>
      write("/api/idea/delete", { id: state.open }, $("sayMsg"), closeSheets));
  });

  const file = (id, cat) => write("/api/idea/file", { id, cat }, $("sayMsg"));

  /* ── saying something ────────────────────────────────────────────────── */

  async function say(kind, text) {
    if (!needMe() || state.busy) return;
    const msg = $("sayMsg");
    state.busy = true;
    msg.className = "msg";
    msg.textContent = "saving…";
    try {
      await api("/api/event", { id: state.open, who: state.me, kind, text });
      $("sayText").value = "";
      await refresh();
      msg.className = "msg is-ok";
      msg.textContent = "saved.";
    } catch (err) {
      msg.textContent = err.detail ? `${err.message} — ${err.detail}` : err.message;
    } finally {
      state.busy = false;
    }
  }

  [["sayNote", "note"], ["sayDid", "did"], ["sayFeel", "feel"]].forEach(([id, kind]) => {
    $(id).addEventListener("click", () => {
      const text = $("sayText").value.trim();
      if (!text) { $("sayText").focus(); return; }
      say(kind, text);
    });
  });

  $("sayDone").addEventListener("click", (e) => say(e.currentTarget.dataset.kind, ""));

  /* ── a photo ─────────────────────────────────────────────────────────── */

  /* phones shoot 4000px files. nothing here is ever displayed bigger than a
     polaroid, and every one of these becomes a permanent commit — so shrink it
     in the browser and send a few hundred kb instead of twelve megabytes. */
  function shrink(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const max = 1600;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("couldn't read that image")); };
      img.src = url;
    });
  }

  $("sayPhoto").addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file || !needMe() || state.busy) return;

    const msg = $("sayMsg");
    state.busy = true;
    msg.className = "msg";
    msg.textContent = "shrinking it…";
    try {
      const data = await shrink(file);
      msg.textContent = "pinning it up…";
      await api("/api/photo", {
        id: state.open, who: state.me, data,
        caption: $("sayText").value.trim(),
      });
      $("sayText").value = "";
      await refresh();
      msg.className = "msg is-ok";
      msg.textContent = "up on the wall.";
    } catch (err) {
      msg.textContent = err.detail ? `${err.message} — ${err.detail}` : err.message;
    } finally {
      state.busy = false;
    }
  });

  /* ── throwing one in ─────────────────────────────────────────────────── */

  function drawAddCats() {
    pickers($("addCats"), state.addCat, "nothing", (cat) => {
      state.addCat = cat;
      drawAddCats();
    });
  }

  /* one sheet, two jobs. pass an idea to edit it, nothing to start a new one. */
  function openAdd(idea) {
    if (!needMe()) return;
    state.editing = idea ? idea.id : null;
    // a new idea lands in whatever the board is filtered to — that's almost
    // always the one you meant
    state.addCat = idea ? (idea.cat || "") : state.filter;

    $("addTitle").textContent = idea ? "fix it up" : "into the jar";
    $("addGo").textContent = idea ? "save it" : "throw it in";
    $("addName").value = idea ? idea.title : "";
    $("addBlurb").value = idea ? (idea.blurb || "") : "";
    $("addMsg").textContent = "";

    // filing an existing idea is done from the chips in its own thread, so the
    // picker only shows when something new is being made
    el("#addSheet .form__label").hidden = Boolean(idea);
    $("addCats").hidden = Boolean(idea);
    if (!idea) drawAddCats();

    openSheet("addSheet");
    setTimeout(() => $("addName").focus(), 60);
  }

  $("addOpen").addEventListener("click", () => openAdd(null));

  $("ideaEdit").addEventListener("click", () => {
    const idea = state.ideas.find((i) => i.id === state.open);
    if (!idea) return;
    closeOne("ideaSheet");          // or the two sheets stack on top of each other
    openAdd(idea);
  });

  $("addForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!needMe() || state.busy) return;
    const msg = $("addMsg");
    const title = $("addName").value.trim();
    if (!title) return;
    const blurb = $("addBlurb").value.trim();
    const back = state.editing;

    state.busy = true;
    msg.className = "msg";
    msg.textContent = back ? "saving…" : "into the jar…";
    try {
      if (back) await api("/api/idea/edit", { who: state.me, id: back, title, blurb });
      else await api("/api/idea", { who: state.me, title, blurb, cat: state.addCat });

      $("addName").value = "";
      $("addBlurb").value = "";
      await refresh();
      closeOne("addSheet");
      if (back) openIdea(back);      // straight back to the thread you came from
    } catch (err) {
      msg.textContent = err.detail ? `${err.message} — ${err.detail}` : err.message;
    } finally {
      state.busy = false;
    }
  });

  /* ── categories ──────────────────────────────────────────────────────── */

  function openCatSheet() {
    if (!needMe()) return;
    $("catMsg").textContent = "";
    $("catName").value = "";
    drawCatList();
    openSheet("catSheet");
    setTimeout(() => $("catName").focus(), 60);
  }

  function drawCatList() {
    const counts = {};
    state.ideas.forEach((i) => { if (i.cat) counts[i.cat] = (counts[i.cat] || 0) + 1; });

    $("catList").innerHTML = state.cats.length
      ? state.cats.map((c) => `
        <li class="catrow">
          <span class="cchip is-on" style="--hue:${c.hue}">${esc(c.name)}</span>
          <span class="catrow__n">${counts[c.id] || 0} on the board</span>
          <button class="pill pill--sm pill--danger" data-delcat="${esc(c.id)}" type="button">delete</button>
        </li>`).join("")
      : `<li class="catrow catrow--none">none yet — name one above.</li>`;
  }

  $("catForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const label = $("catName").value.trim();
    if (!label) return;
    write("/api/category", { name: label }, $("catMsg"), () => {
      $("catName").value = "";
      drawCatList();
      drawAddCats();
    });
  });

  /* deleting a category doesn't touch what's in it — those just come untagged */
  $("catList").addEventListener("click", (e) => {
    const b = e.target.closest("[data-delcat]");
    if (!b) return;
    twoTap(b, "really?", () =>
      write("/api/category/delete", { id: b.dataset.delcat }, $("catMsg"), () => {
        drawCatList();
        drawAddCats();
      }));
  });

  /* ── pulling one out ─────────────────────────────────────────────────── */

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  $("pullBtn").addEventListener("click", () => {
    const jar = state.ideas.filter((i) => i.status === "jar");
    if (!jar.length) return;
    $("jar").classList.add("is-shaking");
    setTimeout(() => $("jar").classList.remove("is-shaking"), 900);
    $("pullMsg").textContent = "";
    openSheet("pullSheet");
    roll(jar);
  });

  /* flick through the jar for a second before landing, so it feels like a
     draw rather than a database query */
  function roll(jar) {
    const card = $("pullCard");
    card.classList.add("is-rolling");
    let ticks = 0;
    const spin = setInterval(() => {
      drawPull(pick(jar), true);
      if (++ticks > 11) {
        clearInterval(spin);
        card.classList.remove("is-rolling");
        const winner = pick(jar);
        state.pulled = winner.id;
        drawPull(winner, false);
      }
    }, 85);
  }

  function drawPull(idea, rolling) {
    $("pullCard").innerHTML = `
      <h3 class="pull__name">${esc(idea.title)}</h3>
      ${rolling ? "" : `
        ${idea.blurb ? `<p class="pull__blurb">${esc(idea.blurb)}</p>` : ""}
        <p class="pull__by">${nm(idea.who)} threw this in on ${stamp(idea.at)}</p>`}`;
  }

  $("pullAgain").addEventListener("click", () => {
    const jar = state.ideas.filter((i) => i.status === "jar");
    if (jar.length > 1) return roll(jar);
    closeSheets();
  });

  $("pullTake").addEventListener("click", async () => {
    if (!needMe() || !state.pulled || state.busy) return;
    const msg = $("pullMsg");
    state.busy = true;
    msg.textContent = "…";
    try {
      const id = state.pulled;
      await api("/api/event", { id, who: state.me, kind: "pick", text: "" });
      await refresh();
      closeSheets();
      openIdea(id);
    } catch (err) {
      msg.textContent = err.message;
    } finally {
      state.busy = false;
    }
  });

  /* ── a passing word ──────────────────────────────────────────────────── */

  let toastTimer;
  function toast(text) {
    const el = $("toast");
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 4600);
  }

  /* ── the bell ────────────────────────────────────────────────────────── */

  const bell = $("bell");
  let worker = null;

  /* the browser wants the vapid key as raw bytes, and hands it to us as
     base64url, which atob doesn't speak. */
  function keyBytes(b64url) {
    const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
    const raw = atob((b64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  }

  function paintBell(where) {
    bell.dataset.push = where;
    bell.hidden = where === "unsupported";
    bell.setAttribute("aria-label",
      where === "on" ? "notifications are on for this phone"
      : where === "blocked" ? "notifications are blocked in your browser settings"
      : "turn notifications on for this phone");
  }

  async function bellSetup() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return paintBell("unsupported");
    }
    try {
      worker = await navigator.serviceWorker.register("/sw.js");
      const sub = await worker.pushManager.getSubscription();
      paintBell(sub ? "on" : Notification.permission === "denied" ? "blocked" : "off");
    } catch {
      paintBell("unsupported");           // http, private mode, or no worker
    }
  }

  async function bellOn() {
    /* the permission prompt has to come from a tap — chrome ignores one that
       isn't, and silently, which looks exactly like a bug. */
    const answer = await Notification.requestPermission();
    if (answer !== "granted") {
      paintBell(answer === "denied" ? "blocked" : "off");
      return toast(answer === "denied"
        ? "the browser will remember that no — you'd have to undo it in site settings"
        : "left it alone.");
    }

    const { key } = await api("/api/push/key");
    if (!key) return toast("push isn't set up on the server yet");

    const sub = await worker.pushManager.subscribe({
      userVisibleOnly: true,                       // required; chrome rejects silent push
      applicationServerKey: keyBytes(key),
    });
    await api("/api/push/subscribe", { who: state.me, sub: sub.toJSON() });
    paintBell("on");
    toast(`this phone will buzz when ${state.me === "a" ? "theo" : "maya"} adds something 🔔`);
  }

  async function bellOff() {
    const sub = await worker.pushManager.getSubscription();
    if (sub) {
      // tell the server first: a subscription it still holds but the browser
      // has dropped just becomes a dead endpoint it retries forever
      await api("/api/push/unsubscribe", { endpoint: sub.endpoint }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
    paintBell("off");
    toast("quiet again.");
  }

  bell.addEventListener("click", async () => {
    if (state.busy) return;
    if (bell.dataset.push === "blocked") {
      return toast("blocked in the browser — tap the padlock by the address bar to allow it");
    }
    if (!needMe()) return;

    state.busy = true;
    try {
      await (bell.dataset.push === "on" ? bellOff() : bellOn());
    } catch (err) {
      toast(err.message || "that didn't work");
    } finally {
      state.busy = false;
    }
  });

  /* tapping a notification lands on /#idea=<id>; open it and tidy the url so a
     refresh doesn't reopen it forever */
  function openFromHash() {
    const hit = /#idea=([a-z0-9]+)/i.exec(location.hash);
    if (!hit) return;
    history.replaceState(null, "", location.pathname);
    if (state.ideas.some((i) => i.id === hit[1])) openIdea(hit[1]);
  }

  window.addEventListener("hashchange", () => {
    if (document.body.classList.contains("is-open")) refresh().then(openFromHash).catch(() => {});
  });

  /* ── staying in sync ─────────────────────────────────────────────────── */

  /* two phones, one board. a quiet poll is enough — nobody is adding notes
     faster than this, and it costs one small json every minute. */
  setInterval(() => {
    if (document.hidden || state.busy || document.body.classList.contains("is-locked")) return;
    refresh().catch(() => {});
  }, 60e3);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && document.body.classList.contains("is-open")) refresh().catch(() => {});
  });

  /* ── in ──────────────────────────────────────────────────────────────── */

  /* if the cookie is still good, or the site has no passphrase at all, skip
     the lock entirely rather than asking someone to type it twice a day */
  api("/api/board")
    .then((out) => enter(out))
    .catch(() => { $("lockIn").focus(); });
})();
