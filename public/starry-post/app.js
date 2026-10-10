(function() {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, txt) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  };
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function debounce(fn, ms) {
    let t;
    return function(...a) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, a), ms);
    };
  }
  const KDF_ITER = 15e4;
  const SALT = new TextEncoder().encode("starry-post/v1/letters");
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const Vault = {
    key: null,
    async derive(pass) {
      const base = await crypto.subtle.importKey(
        "raw",
        enc.encode(pass),
        "PBKDF2",
        false,
        ["deriveKey"]
      );
      return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: SALT, iterations: KDF_ITER, hash: "SHA-256" },
        base,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );
    },
    async seal(obj) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        this.key,
        enc.encode(JSON.stringify(obj))
      );
      const out = new Uint8Array(12 + ct.byteLength);
      out.set(iv, 0);
      out.set(new Uint8Array(ct), 12);
      return b64(out);
    },
    async open(blob) {
      const raw = unb64(blob);
      const pt = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: raw.slice(0, 12) },
        this.key,
        raw.slice(12)
      );
      return JSON.parse(dec.decode(pt));
    },
    /* the same envelope, but for an image rather than JSON — a custom sticker
       is encrypted exactly like a letter, so the server holds bytes it can't
       open */
    async sealBytes(buf) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, this.key, buf);
      const out = new Uint8Array(12 + ct.byteLength);
      out.set(iv, 0);
      out.set(new Uint8Array(ct), 12);
      return b64(out);
    },
    async openBytes(blob) {
      const raw = unb64(blob);
      const pt = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: raw.slice(0, 12) },
        this.key,
        raw.slice(12)
      );
      return new Blob([pt], { type: "image/png" });
    },
    /* the derived key is cached so a reload doesn't ask again. it is exported
       raw — anyone who can read this origin's storage could already read the
       session cookie, so this adds convenience without changing the threat. */
    async remember(persist) {
      const raw = await crypto.subtle.exportKey("raw", this.key);
      (persist ? localStorage : sessionStorage).setItem("sp.k", b64(new Uint8Array(raw)));
    },
    async recall() {
      const s = localStorage.getItem("sp.k") || sessionStorage.getItem("sp.k");
      if (!s) return false;
      try {
        this.key = await crypto.subtle.importKey(
          "raw",
          unb64(s),
          "AES-GCM",
          true,
          ["encrypt", "decrypt"]
        );
        return true;
      } catch {
        return false;
      }
    },
    forget() {
      localStorage.removeItem("sp.k");
      sessionStorage.removeItem("sp.k");
    }
  };
  const b64 = (u8) => {
    let s = "";
    for (const b of u8) s += String.fromCharCode(b);
    return btoa(s);
  };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const PKT = "Asia/Karachi";
  function parts(iso) {
    const f = new Intl.DateTimeFormat("en-GB", {
      timeZone: PKT,
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).formatToParts(new Date(iso));
    const g = {};
    for (const p of f) g[p.type] = p.value;
    return g;
  }
  function clock(iso) {
    const p = parts(iso);
    return `${p.hour}:${p.minute}${(p.dayPeriod || "").toLowerCase()}`;
  }
  function longWhen(iso) {
    const p = parts(iso);
    return `${clock(iso)} \xB7 ${p.weekday}, ${p.day} ${p.month}`;
  }
  function writtenOn(iso) {
    const d = new Date(iso);
    const f = new Intl.DateTimeFormat("en-GB", {
      timeZone: PKT,
      day: "numeric",
      month: "long",
      ...d.getUTCFullYear() !== (/* @__PURE__ */ new Date()).getUTCFullYear() ? { year: "numeric" } : {}
    });
    return f.format(d).toLowerCase();
  }
  function ago(iso) {
    const s = (Date.now() - new Date(iso)) / 1e3;
    if (s < 45) return "just now";
    if (s < 5400) return `${Math.max(1, Math.round(s / 60))} min ago`;
    if (s < 79200) return `${Math.round(s / 3600)} hours ago`;
    const d = Math.round(s / 86400);
    if (d === 1) return "yesterday";
    if (d < 7) return `${d} days ago`;
    const p = parts(iso);
    return `${p.day} ${p.month}`;
  }
  const S = {
    who: localStorage.getItem("sp.who") || "",
    letters: [],
    // { id, who, at, pageCount, readAt, enc }  + opened: {title, pages}
    draft: null,
    // the letter being written
    page: 0,
    picked: null,
    // selected sticker node in the writer
    keeping: false,
    // is this one being put away for the day?
    reading: null,
    sky: null,
    busy: false
  };
  const NAMES = { a: "nora", i: "sami" };
  const other = (w) => w === "a" ? "i" : "a";
  async function api(path, body) {
    const res = await fetch(path, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : void 0,
      body: body ? JSON.stringify(body) : void 0,
      credentials: "same-origin"
    });
    if (res.status === 401) {
      lockAgain();
      throw new Error("locked out");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `server said ${res.status}`);
    return data;
  }
  function toast(msg, ms) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("is-up");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("is-up"), ms || 2600);
  }
  function lockAgain() {
    Vault.key = null;
    Vault.forget();
    document.body.classList.add("is-locked");
    $("reader").hidden = true;
    $("writer").hidden = true;
  }
  async function unlock(pass, persist) {
    await api("/api/unlock", { pass });
    Vault.key = await Vault.derive(pass);
    await Vault.remember(persist);
    document.body.classList.remove("is-locked");
    await boot();
  }
  $("lockForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pass = $("lockIn").value;
    if (!pass) return;
    $("lockMsg").textContent = "\u2026";
    try {
      await unlock(pass, $("lockKeep").checked);
      $("lockIn").value = "";
      $("lockMsg").textContent = "";
      if (window.__spTilt) window.__spTilt();
    } catch (err) {
      $("lockMsg").textContent = /locked|401|nope/i.test(err.message) ? "nope. try again." : err.message;
      $("lock").classList.add("is-wrong");
      setTimeout(() => $("lock").classList.remove("is-wrong"), 450);
    }
  });
  function paintWho() {
    document.body.dataset.who = S.who || "a";
    $("whoName").textContent = S.who ? NAMES[S.who] : "who are you?";
  }
  let afterPick = null;
  function askWho(then) {
    afterPick = then || null;
    $("pick").hidden = false;
    document.body.classList.add("no-scroll");
  }
  $("pick").addEventListener("click", (e) => {
    const b = e.target.closest("[data-who]");
    if (!b) return;
    S.who = b.dataset.who;
    localStorage.setItem("sp.who", S.who);
    $("pick").hidden = true;
    document.body.classList.remove("no-scroll");
    paintWho();
    render();
    const go = afterPick;
    afterPick = null;
    if (go) go();
  });
  $("whoChip").addEventListener("click", () => askWho());
  const locked = (L) => Boolean(L.kept && !L.releasedAt);
  const SIFTS = [
    { id: "inbox", label: "inbox", keep: (L) => !locked(L) },
    { id: "received", label: "received", keep: (L) => !locked(L) && L.who !== S.who },
    { id: "sent", label: "sent", keep: (L) => !locked(L) && L.who === S.who },
    { id: "day", label: "the day", keep: (L) => locked(L) }
  ];
  let sift = "inbox";
  const unreadIn = (list) => list.filter((L) => L.who !== S.who && !L.readAt).length;
  function paintSift(all) {
    const nav = $("sift");
    nav.textContent = "";
    for (const t of SIFTS) {
      const mine = all.filter(t.keep);
      const b = el("button", "sift__b" + (t.id === sift ? " is-on" : ""));
      b.type = "button";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(t.id === sift));
      b.appendChild(el("span", "sift__label", t.label));
      b.appendChild(el("span", "sift__n", String(mine.length)));
      if (t.id !== "sent" && unreadIn(mine)) b.appendChild(el("span", "sift__dot"));
      b.addEventListener("click", () => {
        sift = t.id;
        render();
      });
      nav.appendChild(b);
    }
  }
  function render() {
    const desk = $("desk");
    desk.textContent = "";
    const all = S.letters.slice().sort((a, b) => a.at < b.at ? 1 : -1);
    paintSift(all);
    $("sift").hidden = all.length < 2;
    const tab = SIFTS.find((t) => t.id === sift) || SIFTS[0];
    const list = all.filter(tab.keep);
    paintVault(all.filter(locked));
    const empty = $("deskEmpty");
    empty.hidden = list.length > 0 || sift === "day";
    empty.innerHTML = !all.length ? "nothing here yet.<br><span>someone has to go first \u{1FAEA}</span>" : sift === "sent" ? "you haven't written one yet.<br><span>go on then</span>" : sift === "received" ? `nothing from ${NAMES[other(S.who)] || "them"} yet.<br><span>soon \u{1F90C}\u{1F3FB}</span>` : "nothing here yet.<br><span>someone has to go first \u{1FAEA}</span>";
    $("intro").hidden = all.length > 2 || sift === "day";
    for (const L of list) {
      const mine = L.who === S.who;
      const shut = locked(L);
      const unread = !shut && !mine && !L.readAt;
      const li = el("li", "card");
      li.dataset.id = L.id;
      li.dataset.who = L.who;
      li.classList.toggle("is-kept", shut);
      li.classList.toggle("is-new", unread);
      li.classList.toggle("is-read", !shut && !unread);
      const btn = el("button", "card__btn");
      btn.type = "button";
      btn.appendChild(el("span", "card__env"));
      const meta = el("span", "card__meta");
      const top = el("span", "card__top");
      const who = el("span", "card__who");
      who.innerHTML = mine ? `to <b>${NAMES[other(L.who)]}</b>` : `from <b>${NAMES[L.who]}</b>`;
      top.appendChild(who);
      top.appendChild(el("span", "card__when", L.kept ? writtenOn(L.at) : ago(L.at)));
      meta.appendChild(top);
      const bits = [L.pageCount === 1 ? "one page" : `${L.pageCount} pages`];
      if (shut) bits.push("sealed until the day");
      else if (L.kept) bits.push(`unsealed ${ago(L.releasedAt)}`);
      if (!shut) {
        if (unread) bits.push("still sealed");
        else if (mine && L.readAt) bits.push(`read ${ago(L.readAt)}`);
        else if (mine) bits.push("not opened yet");
      }
      meta.appendChild(el("span", "card__sub", bits.join(" \xB7 ")));
      btn.appendChild(meta);
      btn.addEventListener("click", () => openLetter(L));
      li.appendChild(btn);
      desk.appendChild(li);
    }
  }
  function paintVault(shut) {
    const v = $("vault");
    v.hidden = sift !== "day";
    if (v.hidden) return;
    const n = shut.length;
    const mine = shut.filter((L) => L.who === S.who).length;
    const theirs = n - mine;
    $("vaultSub").textContent = !n ? "nothing put away yet. write one and keep it \u2014 it stays shut until the day." : n === 1 ? "one letter, written and put away." : `${n} letters, written and put away.`;
    const note = $("vaultNote");
    if (!n) {
      note.textContent = "";
    } else {
      const bits = [];
      if (mine) bits.push(`${mine} from you`);
      if (theirs) bits.push(`${theirs} from ${NAMES[other(S.who)]}`);
      const oldest = shut.reduce((a, b) => a.at < b.at ? a : b);
      note.textContent = n === 1 ? `${bits.join(" \xB7 ")} \u2014 written ${writtenOn(oldest.at)}.` : `${bits.join(" \xB7 ")} \u2014 the oldest since ${writtenOn(oldest.at)}.`;
    }
    const go = $("vaultGo");
    go.hidden = !n;
    go.classList.toggle("is-armed", Boolean(go.dataset.armed));
    $("vaultGoLabel").textContent = go.dataset.armed ? "yes \u2014 open all of them" : "is it the day?";
  }
  $("vaultGo").addEventListener("click", async () => {
    const go = $("vaultGo");
    if (!go.dataset.armed) {
      go.dataset.armed = "1";
      paintVault(S.letters.filter(locked));
      clearTimeout(go._t);
      go._t = setTimeout(() => {
        delete go.dataset.armed;
        paintVault(S.letters.filter(locked));
      }, 5e3);
      return;
    }
    delete go.dataset.armed;
    clearTimeout(go._t);
    if (S.busy) return;
    S.busy = true;
    try {
      const r = await api("/api/release", {});
      await boot();
      sift = "inbox";
      render();
      toast(r.released === 1 ? "it's open. go and read it." : `all ${r.released} of them are open. take your time.`, 5e3);
      S.sky && S.sky.flare();
    } catch (e) {
      toast("couldn't open them \u2014 " + e.message, 4e3);
    } finally {
      S.busy = false;
    }
  });
  async function openLetter(L) {
    if (S.busy) return;
    if (locked(L)) {
      toast(L.who === S.who ? `you wrote this one on ${writtenOn(L.at)}. it waits.` : `${NAMES[L.who]} wrote this on ${writtenOn(L.at)}. not yet \u{1F90D}`, 3600);
      return;
    }
    S.reading = L;
    const mine = L.who === S.who;
    const sealed = !mine && !L.readAt;
    $("reader").hidden = false;
    document.body.classList.add("no-scroll");
    $("sheaf").hidden = true;
    $("pager").hidden = true;
    $("env").hidden = true;
    $("env").className = "env";
    let opened = null, failed = null;
    const work = Vault.open(L.enc).then((o) => {
      opened = o;
    }).catch((e) => {
      failed = e;
    });
    if (sealed) {
      $("env").hidden = false;
      $("envMeta").textContent = `from ${NAMES[L.who]} \xB7 ${longWhen(L.at)}`;
      $("envOpen").onclick = async () => {
        $("envOpen").onclick = null;
        Sound.crack();
        $("env").classList.add("is-breaking");
        await sleep(430);
        $("env").classList.add("is-open");
        await sleep(560);
        $("env").classList.add("is-gone");
        await work;
        await sleep(240);
        $("env").hidden = true;
        if (failed) return showBroken();
        showPages(opened, L);
        markRead(L);
      };
    } else {
      await work;
      if (failed) return showBroken();
      showPages(opened, L);
    }
    S.sky && S.sky.push(0, -0.35);
  }
  function showBroken() {
    $("sheaf").hidden = false;
    $("sheaf").textContent = "";
    const pg = el("div", "pg");
    const body = el("div", "pg__body");
    body.textContent = "this one won't open.\n\n\nit was written with a different secret code than the one in use now. nothing is lost \u2014 `npm run export` with the old code will get it back.";
    pg.appendChild(body);
    $("sheaf").appendChild(pg);
  }
  function showPages(opened, L) {
    const sheaf = $("sheaf");
    sheaf.hidden = false;
    sheaf.textContent = "";
    sheaf._pages = opened.pages || [];
    sheaf._letter = L;
    S.page = 0;
    const spread = matchMedia(SPREAD_AT).matches && sheaf._pages.length > 1;
    sheaf.classList.toggle("is-spread", spread);
    sheaf._spread = spread;
    paintSheaf();
    $("pager").hidden = sheaf._pages.length < 2;
    paintDots($("readDots"), sheaf._pages.length, 0, spread);
    swipeable(sheaf, () => readStep(1), () => readStep(-1));
  }
  function pageNode(p, index, total, L, side) {
    const pg = el("div", "pg" + (side ? ` pg--${side}` : ""));
    const scroll = el("div", "pg__scroll");
    const sheet = el("div", "pg__sheet");
    const body = el("div", "pg__body keep-case");
    body.textContent = p.text || "";
    sheet.appendChild(body);
    const stk = el("div", "pg__stk");
    for (const s of p.stickers || []) {
      const n = el("div", "stk");
      n.style.left = (s.x * 100).toFixed(3) + "%";
      n.style.top = (s.y * 100).toFixed(3) + "%";
      n.style.setProperty("--s", s.s || 1);
      n.style.setProperty("--r", (s.r || 0) + "deg");
      paintArt(n, s.id);
      stk.appendChild(n);
    }
    sheet.appendChild(stk);
    scroll.appendChild(sheet);
    pg.appendChild(scroll);
    const foot = el("div", "pg__foot");
    foot.appendChild(el("span", null, total > 1 ? `${index + 1} of ${total}` : longWhen(L.at)));
    const sign = el("span", "pg__sign", NAMES[L.who]);
    foot.appendChild(sign);
    pg.appendChild(foot);
    return pg;
  }
  function paintSheaf(anim) {
    const sheaf = $("sheaf");
    const pages = sheaf._pages, L = sheaf._letter;
    sheaf.textContent = "";
    if (sheaf._spread) {
      const a = pageNode(pages[S.page], S.page, pages.length, L, "left");
      sheaf.appendChild(a);
      if (pages[S.page + 1]) {
        sheaf.appendChild(pageNode(pages[S.page + 1], S.page + 1, pages.length, L, "right"));
      }
      if (anim) [...sheaf.children].forEach((n) => n.classList.add(anim));
    } else {
      const n = pageNode(pages[S.page], S.page, pages.length, L);
      if (anim) n.classList.add(anim);
      sheaf.appendChild(n);
    }
  }
  async function readStep(dir) {
    const sheaf = $("sheaf");
    const step = sheaf._spread ? 2 : 1;
    const next = S.page + dir * step;
    if (next < 0 || next >= sheaf._pages.length) return;
    const way = dir > 0 ? "next" : "prev";
    [...sheaf.children].forEach((n) => n.classList.add(`turn-out-${way}`));
    Sound.turn();
    await sleep(240);
    S.page = next;
    paintSheaf(`turn-in-${way}`);
    paintDots($("readDots"), sheaf._pages.length, S.page, sheaf._spread);
  }
  function paintDots(host, total, at, spread) {
    host.textContent = "";
    for (let i = 0; i < total; i++) {
      const d = el("span", "dot");
      if (i === at || spread && i === at + 1) d.classList.add("is-on");
      host.appendChild(d);
    }
    const prev = host === $("readDots") ? $("readPrev") : $("writePrev");
    const next = host === $("readDots") ? $("readNext") : $("writeNext");
    const step = spread ? 2 : 1;
    prev.disabled = at === 0;
    next.disabled = at + step >= total;
  }
  async function markRead(L) {
    if (L.readAt || L.who === S.who) return;
    L.readAt = (/* @__PURE__ */ new Date()).toISOString();
    render();
    try {
      await api("/api/read", { id: L.id });
    } catch {
    }
  }
  const SPREAD_AT = "(min-width: 62rem) and (min-height: 40rem)";
  let reflow;
  addEventListener("resize", () => {
    clearTimeout(reflow);
    reflow = setTimeout(() => {
      const sheaf = $("sheaf");
      if ($("reader").hidden || sheaf.hidden || !sheaf._pages) return;
      const spread = matchMedia(SPREAD_AT).matches && sheaf._pages.length > 1;
      if (spread === sheaf._spread) return;
      sheaf._spread = spread;
      sheaf.classList.toggle("is-spread", spread);
      if (spread && S.page % 2) S.page--;
      paintSheaf();
      paintDots($("readDots"), sheaf._pages.length, S.page, spread);
    }, 180);
  });
  function closeReader() {
    $("reader").hidden = true;
    document.body.classList.remove("no-scroll");
    S.reading = null;
    S.sky && S.sky.push(0, 0);
  }
  $("readerClose").addEventListener("click", closeReader);
  $("readerScrim").addEventListener("click", closeReader);
  $("readPrev").addEventListener("click", () => readStep(-1));
  $("readNext").addEventListener("click", () => readStep(1));
  const DRAFT_KEY = () => `sp.draft.${S.who || "a"}`;
  function blankPage() {
    return { text: "", stickers: [] };
  }
  function startWriting(restored) {
    if (!S.who) {
      askWho(() => startWriting(restored));
      return;
    }
    S.keeping = sift === "day";
    S.draft = restored || { pages: [blankPage()], at: (/* @__PURE__ */ new Date()).toISOString() };
    S.page = 0;
    $("writer").hidden = false;
    document.body.classList.add("no-scroll");
    paintWriter();
    setTimeout(() => {
      const t = $("writerStage").querySelector(".pg__in");
      if (t && !restored) t.focus();
    }, 320);
  }
  function paintMode() {
    const on = S.keeping;
    $("modeBtn").setAttribute("aria-pressed", String(on));
    $("modeLabel").textContent = on ? "for the day" : "sending now";
    $("sealBtn").textContent = on ? "put it away" : "seal it";
  }
  $("modeBtn").addEventListener("click", () => {
    S.keeping = !S.keeping;
    paintMode();
    toast(S.keeping ? "this one stays shut until the day \u{1F90D}" : "this one goes to them as soon as you seal it");
  });
  function paintWriter(anim) {
    const stage = $("writerStage");
    stage.textContent = "";
    stage.appendChild(writePage(S.draft.pages[S.page], anim));
    paintMode();
    paintDots($("writeDots"), S.draft.pages.length, S.page, false);
    $("sealBtn").disabled = !hasAnything();
    unpick();
  }
  function hasAnything() {
    return S.draft && S.draft.pages.some(
      (p) => (p.text || "").trim() || (p.stickers || []).length
    );
  }
  function writePage(page, anim) {
    const pg = el("div", "pg" + (anim ? " " + anim : ""));
    const wrap = el("div", "pg__write");
    const sheet = el("div", "pg__sheet");
    const mirror = el("div", "pg__mirror keep-case");
    const ta = el("textarea", "pg__in keep-case");
    ta.placeholder = S.page === 0 ? "dear\u2026" : "";
    ta.value = page.text || "";
    ta.setAttribute("aria-label", "the letter");
    ta.spellcheck = false;
    ta.autocapitalize = "off";
    ta.autocorrect = "off";
    let last = ta.value.length;
    const paintInk = (animateLast) => {
      const v = ta.value;
      const atEnd = ta.selectionStart === v.length && ta.selectionEnd === v.length;
      if (animateLast && v.length) {
        mirror.innerHTML = esc(v.slice(0, -1)) + `<span class="ink">${esc(v.slice(-1))}</span>` + (atEnd ? '<i class="nibdot"></i>' : "");
      } else {
        mirror.innerHTML = esc(v) + (atEnd ? '<i class="nibdot"></i>' : "");
      }
    };
    paintInk(false);
    const keepCaretInView = () => {
      if (ta.selectionStart !== ta.value.length) return;
      wrap.scrollTop = wrap.scrollHeight;
    };
    ta.addEventListener("input", () => {
      const grew = ta.value.length === last + 1;
      last = ta.value.length;
      page.text = ta.value;
      paintInk(grew);
      keepCaretInView();
      if (grew) {
        S.sky && S.sky.flare();
        Sound.tick();
      }
      $("sealBtn").disabled = !hasAnything();
      saveDraftLocal();
    });
    ta.addEventListener("blur", () => paintInk(false));
    ta.addEventListener("click", () => paintInk(false));
    ta.addEventListener("keyup", (e) => {
      if (e.key.startsWith("Arrow")) paintInk(false);
    });
    sheet.appendChild(mirror);
    sheet.appendChild(ta);
    const stk = el("div", "pg__stk");
    for (const s of page.stickers || []) stk.appendChild(stickerNode(s, page));
    sheet.appendChild(stk);
    wrap.appendChild(sheet);
    pg.appendChild(wrap);
    const foot = el("div", "pg__foot");
    foot.appendChild(el("span", null, clock(S.draft.at)));
    foot.appendChild(el("span", "pg__sign", NAMES[S.who]));
    pg.appendChild(foot);
    pg.addEventListener("pointerdown", (e) => {
      if (!e.target.closest(".stk")) unpick();
    });
    return pg;
  }
  function paintArt(node, id) {
    if (Stickers.has(id)) {
      node.innerHTML = Stickers.markup(id);
      return;
    }
    node.innerHTML = '<span class="stk__load"></span>';
    OURS.src(id).then((url) => {
      node.innerHTML = `<img class="stk__art" src="${url}" alt="">`;
    }).catch(() => {
      node.innerHTML = `<span class="stk__bad" title="this one won't open">?</span>`;
    });
  }
  function stickerNode(s, page) {
    const n = el("div", "stk");
    n.style.left = (s.x * 100).toFixed(3) + "%";
    n.style.top = (s.y * 100).toFixed(3) + "%";
    n.style.setProperty("--s", s.s);
    n.style.setProperty("--r", s.r + "deg");
    paintArt(n, s.id);
    n._data = s;
    n._page = page;
    let dragging = false, moved = false, box = null;
    n.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      pick(n);
      box = n.closest(".pg__sheet").getBoundingClientRect();
      dragging = true;
      moved = false;
      n.setPointerCapture(e.pointerId);
      n.classList.add("is-held");
    });
    n.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      moved = true;
      s.x = clamp((e.clientX - box.left) / box.width, 0.04, 0.96);
      s.y = clamp((e.clientY - box.top) / box.height, 0.04, 0.96);
      n.style.left = (s.x * 100).toFixed(3) + "%";
      n.style.top = (s.y * 100).toFixed(3) + "%";
    });
    const drop = () => {
      if (!dragging) return;
      dragging = false;
      n.classList.remove("is-held");
      if (moved) saveDraftLocal();
    };
    n.addEventListener("pointerup", drop);
    n.addEventListener("pointercancel", drop);
    return n;
  }
  function pick(n) {
    unpick();
    S.picked = n;
    n.classList.add("is-picked");
    $("stkBar").hidden = false;
  }
  function unpick() {
    if (S.picked) S.picked.classList.remove("is-picked");
    S.picked = null;
    $("stkBar").hidden = true;
  }
  $("stkBar").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || !S.picked) return;
    const n = S.picked, s = n._data;
    switch (b.dataset.act) {
      case "rot-":
        s.r = Math.round(s.r - 15);
        break;
      case "rot+":
        s.r = Math.round(s.r + 15);
        break;
      case "small":
        s.s = Math.max(0.45, +(s.s - 0.15).toFixed(2));
        break;
      case "big":
        s.s = Math.min(2.6, +(s.s + 0.15).toFixed(2));
        break;
      case "del": {
        const page = n._page;
        page.stickers.splice(page.stickers.indexOf(s), 1);
        n.remove();
        unpick();
        saveDraftLocal();
        $("sealBtn").disabled = !hasAnything();
        return;
      }
    }
    n.style.setProperty("--s", s.s);
    n.style.setProperty("--r", s.r + "deg");
    saveDraftLocal();
  });
  const OURS = {
    list: [],
    // metadata from the server
    url: /* @__PURE__ */ Object.create(null),
    // id -> blob: url, once decrypted
    async load() {
      try {
        const d = await api("/api/stickers");
        this.list = d.stickers || [];
      } catch {
        this.list = [];
      }
    },
    /* decrypt on demand and cache. a sticker id is never reused, so the bytes
       are immutable and both caches can be kept forever. */
    async src(id) {
      if (this.url[id]) return this.url[id];
      const res = await fetch(`/stickers/${id}.enc`, { credentials: "same-origin" });
      if (!res.ok) throw new Error("missing");
      const blob = await Vault.openBytes(await res.text());
      return this.url[id] = URL.createObjectURL(blob);
    },
    has(id) {
      return this.list.some((s) => s.id === id);
    },
    meta(id) {
      return this.list.find((s) => s.id === id);
    }
  };
  function shrink(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const max = 256;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        c.toBlob(
          (b) => b ? resolve(b) : reject(new Error("couldn't read that image")),
          "image/png"
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("that isn't an image"));
      };
      img.src = url;
    });
  }
  async function uploadSticker(file) {
    if (!S.who) {
      askWho();
      return;
    }
    if (!/^image\//.test(file.type)) return toast("that isn't an image \u{1FAEA}");
    toast("adding it\u2026", 8e3);
    try {
      const small = await shrink(file);
      const enc2 = await Vault.sealBytes(await small.arrayBuffer());
      const label = (file.name || "sticker").replace(/\.[^.]+$/, "").slice(0, 40) || "sticker";
      const saved = await api("/api/sticker", { who: S.who, label, enc: enc2 });
      OURS.list.push(saved.sticker);
      drawerCat = "ours";
      stkQuery = "";
      $("stkSearch").value = "";
      paintDrawer();
      toast("added. it's in \u201Cours\u201D.");
    } catch (e) {
      toast(e.message || "couldn't add that one", 4e3);
      console.error("sticker upload:", e);
    }
  }
  async function removeSticker(id) {
    try {
      await api("/api/sticker/delete", { id });
      OURS.list = OURS.list.filter((s) => s.id !== id);
      if (OURS.url[id]) {
        URL.revokeObjectURL(OURS.url[id]);
        delete OURS.url[id];
      }
      paintDrawer();
      toast("peeled off");
    } catch {
      toast("couldn't remove it");
    }
  }
  let drawerCat = "all";
  let stkQuery = "";
  function paintDrawer() {
    const tabs = $("drawerTabs");
    tabs.textContent = "";
    for (const c of Stickers.CATS) {
      const n = c.id === "ours" ? OURS.list.length : 0;
      const on = c.id === drawerCat;
      const t = el(
        "button",
        "tab" + (on ? " is-on" : ""),
        c.id === "ours" && n ? `${c.label} ${n}` : c.label
      );
      t.type = "button";
      t.addEventListener("click", () => {
        drawerCat = c.id;
        paintDrawer();
      });
      tabs.appendChild(t);
      if (on) requestAnimationFrame(() => t.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }));
    }
    const grid = $("drawerGrid");
    grid.textContent = "";
    if (drawerCat === "ours" || !stkQuery && drawerCat === "all") {
      const add = el("button", "stkpick stkpick--add");
      add.type = "button";
      add.setAttribute("aria-label", "add a sticker of your own");
      add.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg><span>add one</span>`;
      add.addEventListener("click", () => $("stkFile").click());
      grid.appendChild(add);
    }
    const q = stkQuery.toLowerCase().trim();
    const mine = drawerCat === "ours" || drawerCat === "all" ? OURS.list.filter((s) => !q || s.label.toLowerCase().includes(q)) : [];
    for (const s of mine.slice().reverse()) grid.appendChild(ourTile(s));
    const built = drawerCat === "ours" ? [] : Stickers.search(stkQuery, drawerCat);
    for (const s of built) {
      const b = el("button", "stkpick");
      b.type = "button";
      b.title = s.label;
      b.setAttribute("aria-label", s.label);
      b.innerHTML = Stickers.markup(s.id);
      b.addEventListener("click", () => dropSticker(s.id));
      grid.appendChild(b);
    }
    const total = mine.length + built.length;
    const tip = $("drawerTip");
    if (q && !total) {
      tip.textContent = `nothing matches \u201C${stkQuery}\u201D \u{1FAEA}`;
    } else if (q) {
      tip.textContent = `${total} match${total === 1 ? "" : "es"}`;
    } else if (drawerCat === "ours" && !OURS.list.length) {
      tip.textContent = "none of your own yet \u2014 tap + and pick a picture.";
    } else {
      tip.textContent = "tap one to drop it on the page. then drag it about.";
    }
    $("stkClear").hidden = !stkQuery;
  }
  function ourTile(s) {
    const b = el("button", "stkpick stkpick--ours");
    b.type = "button";
    b.title = s.label;
    b.setAttribute("aria-label", s.label);
    b.innerHTML = `<span class="stkpick__load"></span>`;
    OURS.src(s.id).then((url) => {
      b.innerHTML = `<img class="stk__art" src="${url}" alt="">`;
    }).catch(() => {
      b.innerHTML = `<span class="stkpick__bad">?</span>`;
      b.title = s.label + " \u2014 won't open";
    });
    b.addEventListener("click", () => dropSticker(s.id));
    const x = el("button", "stkpick__x");
    x.type = "button";
    x.setAttribute("aria-label", "peel this one off");
    x.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
    x.addEventListener("click", (e) => {
      e.stopPropagation();
      if (x.dataset.armed) return removeSticker(s.id);
      x.dataset.armed = "1";
      x.classList.add("is-armed");
      setTimeout(() => {
        delete x.dataset.armed;
        x.classList.remove("is-armed");
      }, 2600);
    });
    b.appendChild(x);
    return b;
  }
  $("stkFile").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (f) uploadSticker(f);
  });
  $("stkSearch").addEventListener("input", (e) => {
    stkQuery = e.target.value;
    if (stkQuery && drawerCat !== "ours") drawerCat = "all";
    paintDrawer();
  });
  $("stkClear").addEventListener("click", () => {
    stkQuery = "";
    $("stkSearch").value = "";
    $("stkSearch").focus();
    paintDrawer();
  });
  function dropSticker(id) {
    const page = S.draft.pages[S.page];
    page.stickers = page.stickers || [];
    if (page.stickers.length >= 14) return toast("that page is quite full \u{1FAEA}");
    const wrap = $("writerStage").querySelector(".pg__write");
    const sheet = $("writerStage").querySelector(".pg__sheet");
    const paperH = sheet && sheet.offsetHeight || 1;
    const midY = wrap ? (wrap.scrollTop + wrap.clientHeight * 0.45) / paperH : 0.42;
    const band = wrap ? Math.min(0.5, wrap.clientHeight * 0.5 / paperH) : 0.4;
    const n = page.stickers.length;
    const s = {
      id,
      x: clamp(0.5 + (n % 3 - 1) * 0.13 + (Math.random() - 0.5) * 0.06, 0.1, 0.9),
      y: clamp(midY + (Math.floor(n / 3) % 3 - 1) * band * 0.4 + (Math.random() - 0.5) * band * 0.2, 0.04, 0.96),
      s: 1,
      r: Math.round((Math.random() - 0.5) * 22)
    };
    page.stickers.push(s);
    const node = stickerNode(s, page);
    $("writerStage").querySelector(".pg__stk").appendChild(node);
    closeDrawer();
    pick(node);
    Sound.stick();
    saveDraftLocal();
    $("sealBtn").disabled = false;
  }
  const openDrawer = () => {
    paintDrawer();
    $("drawer").hidden = false;
  };
  const closeDrawer = () => {
    $("drawer").hidden = true;
  };
  $("stkOpen").addEventListener("click", openDrawer);
  $("drawerScrim").addEventListener("click", closeDrawer);
  async function writeStep(dir) {
    const next = S.page + dir;
    if (next < 0 || next >= S.draft.pages.length) return;
    const way = dir > 0 ? "next" : "prev";
    $("writerStage").firstChild.classList.add(`turn-out-${way}`);
    Sound.turn();
    await sleep(230);
    S.page = next;
    paintWriter(`turn-in-${way}`);
  }
  $("writePrev").addEventListener("click", () => writeStep(-1));
  $("writeNext").addEventListener("click", () => writeStep(1));
  $("pageAdd").addEventListener("click", async () => {
    if (S.draft.pages.length >= 12) return toast("twelve pages is plenty \u{1F62D}");
    S.draft.pages.push(blankPage());
    S.page = S.draft.pages.length - 1;
    $("writerStage").firstChild.classList.add("turn-out-next");
    Sound.turn();
    await sleep(230);
    paintWriter("turn-in-next");
    setTimeout(() => $("writerStage").querySelector(".pg__in").focus(), 260);
    saveDraftLocal();
  });
  const saveDraftLocal = debounce(() => {
    if (!S.draft) return;
    try {
      localStorage.setItem(DRAFT_KEY(), JSON.stringify(S.draft));
    } catch {
    }
  }, 260);
  function loadDraftLocal() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY());
      if (!raw) return null;
      const d = JSON.parse(raw);
      return d && Array.isArray(d.pages) && d.pages.length ? d : null;
    } catch {
      return null;
    }
  }
  const dropDraftLocal = () => localStorage.removeItem(DRAFT_KEY());
  function closeWriter() {
    if (hasAnything()) {
      saveDraftLocal.flush ? saveDraftLocal.flush() : null;
      try {
        localStorage.setItem(DRAFT_KEY(), JSON.stringify(S.draft));
      } catch {
      }
      toast("kept. it'll be here when you come back.");
    } else {
      dropDraftLocal();
    }
    $("writer").hidden = true;
    closeDrawer();
    unpick();
    document.body.classList.remove("no-scroll");
    S.draft = null;
  }
  $("writerBack").addEventListener("click", closeWriter);
  $("sealBtn").addEventListener("click", async () => {
    if (S.busy || !hasAnything()) return;
    S.busy = true;
    $("sealBtn").disabled = true;
    unpick();
    const pages = S.draft.pages.slice();
    while (pages.length > 1) {
      const p = pages[pages.length - 1];
      if ((p.text || "").trim() || (p.stickers || []).length) break;
      pages.pop();
    }
    const at = (/* @__PURE__ */ new Date()).toISOString();
    try {
      const blob = await Vault.seal({ pages });
      wax();
      $("writer").classList.add("is-sealing");
      Sound.seal();
      await sleep(760);
      const keeping = S.keeping;
      const saved = await api("/api/letter", {
        who: S.who,
        at,
        pageCount: pages.length,
        enc: blob,
        ...keeping ? { kept: true } : {}
      });
      S.letters.push(saved.letter);
      dropDraftLocal();
      $("writer").classList.remove("is-sealing");
      $("writer").hidden = true;
      document.body.classList.remove("no-scroll");
      S.draft = null;
      if (keeping) sift = "day";
      render();
      toast(keeping ? "put away. it keeps the date you wrote it \u{1F90D}" : saved.mailed ? `sealed. ${NAMES[other(S.who)]} has been told.` : "sealed.");
    } catch (err) {
      $("writer").classList.remove("is-sealing");
      $("sealBtn").disabled = false;
      toast("couldn't send it \u2014 it's kept here. try again in a bit.", 4200);
      console.error("seal failed:", err);
    } finally {
      S.busy = false;
    }
  });
  function wax() {
    const d = el("div", "waxdrop");
    d.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 6c2 0 3 2 5 2.6s4-.4 5.6 1 .4 4 1 5.6S39 18 39 20s-2 3-2.6 5 .4 4-1 5.6-4 .4-5.6 1S26 36 24 36s-3-2-5-2.6-4 .4-5.6-1-.4-4-1-5.6S9 24 9 22s2-3 2.6-5-.4-4 1-5.6 4-.4 5.6-1S22 6 24 6z"/></svg>`;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1e3);
  }
  $("writeBtn").addEventListener("click", () => {
    const kept = loadDraftLocal();
    if (kept) {
      startWriting(kept);
      toast("picking up where you left off");
    } else {
      startWriting();
    }
  });
  function swipeable(node, next, prev) {
    let x0 = 0, y0 = 0, on = false;
    node.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".pg__in, .stk")) return;
      x0 = e.clientX;
      y0 = e.clientY;
      on = true;
    });
    node.addEventListener("pointerup", (e) => {
      if (!on) return;
      on = false;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (Math.abs(dx) < 52 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
      dx < 0 ? next() : prev();
    });
    node.addEventListener("pointercancel", () => {
      on = false;
    });
  }
  addEventListener("keydown", (e) => {
    if (!$("reader").hidden) {
      if (e.key === "Escape") closeReader();
      if (e.key === "ArrowRight") readStep(1);
      if (e.key === "ArrowLeft") readStep(-1);
      return;
    }
    if (!$("writer").hidden) {
      if (e.key === "Escape") {
        if (!$("drawer").hidden) return closeDrawer();
        if (S.picked) return unpick();
        closeWriter();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") $("sealBtn").click();
      return;
    }
    if (e.key === "w" && !e.metaKey && !e.ctrlKey && document.activeElement === document.body) {
      $("writeBtn").click();
    }
  });
  function bindToggle(btn, key, onChange) {
    const on = localStorage.getItem(key) === "1";
    btn.setAttribute("aria-pressed", String(on));
    onChange(on);
    btn.addEventListener("click", () => {
      const now = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", String(now));
      localStorage.setItem(key, now ? "1" : "0");
      onChange(now);
    });
  }
  bindToggle($("dimBtn"), "sp.dim", (on) => {
    document.documentElement.dataset.dim = on ? "1" : "0";
    $("dimBtn").setAttribute("aria-label", on ? "back to full brightness" : "dim it for reading in the dark");
  });
  bindToggle($("soundBtn"), "sp.snd", (on) => {
    Sound.enabled = on;
    if (on) Sound.arm();
    $("soundBtn").setAttribute("aria-label", on ? "turn the sound off" : "turn the sound on");
  });
  async function boot() {
    try {
      const data = await api("/api/letters");
      S.letters = data.letters || [];
      await OURS.load();
      render();
      if (!S.who) askWho();
    } catch (err) {
      if (!/locked/.test(err.message)) toast("couldn't reach the post. " + err.message, 4e3);
    }
  }
  async function start() {
    paintWho();
    S.sky = Sky($("sky"));
    if (await Vault.recall()) {
      try {
        await api("/api/letters");
        document.body.classList.remove("is-locked");
        await boot();
        return;
      } catch {
        Vault.forget();
      }
    }
    setTimeout(() => $("lockIn").focus(), 400);
  }
  let poll = 0;
  function watch() {
    clearInterval(poll);
    poll = setInterval(() => {
      if (document.hidden || document.body.classList.contains("is-locked")) return;
      if (!$("writer").hidden || !$("reader").hidden) return;
      boot();
    }, 9e4);
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !document.body.classList.contains("is-locked") && $("writer").hidden && $("reader").hidden) boot();
  });
  if ("serviceWorker" in navigator) {
    addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {
    }));
  }
  watch();
  start();
})();
