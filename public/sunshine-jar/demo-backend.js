/* sunshine jar — public demo backend.

   The live app is a zero-dependency Node server that commits every write to a
   GitHub repo. This file runs the *same route functions* (spliced in verbatim
   from server.js at build time, below) inside the browser, with the git store
   swapped for localStorage. Nothing leaves this tab.

   Everything between "BEGIN server.js" and "END server.js" is the real code. */

(() => {
  "use strict";

  /* ── node shims: just enough of crypto/Buffer for the route code ─────── */

  function sha1(str) {
    const msg = new TextEncoder().encode(str);
    const ml = msg.length * 8;
    const len = (((msg.length + 8) >> 6) + 1) * 16;
    const w = new Uint32Array(len);
    for (let i = 0; i < msg.length; i++) w[i >> 2] |= msg[i] << (24 - (i % 4) * 8);
    w[msg.length >> 2] |= 0x80 << (24 - (msg.length % 4) * 8);
    w[len - 1] = ml;
    let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
    const W = new Uint32Array(80);
    for (let b = 0; b < len; b += 16) {
      for (let t = 0; t < 16; t++) W[t] = w[b + t];
      for (let t = 16; t < 80; t++) { const x = W[t-3] ^ W[t-8] ^ W[t-14] ^ W[t-16]; W[t] = (x << 1) | (x >>> 31); }
      let a = h0, bb = h1, c = h2, d = h3, e = h4;
      for (let t = 0; t < 80; t++) {
        const f = t < 20 ? (bb & c) | (~bb & d) : t < 40 ? bb ^ c ^ d : t < 60 ? (bb & c) | (bb & d) | (c & d) : bb ^ c ^ d;
        const k = t < 20 ? 0x5a827999 : t < 40 ? 0x6ed9eba1 : t < 60 ? 0x8f1bbcdc : 0xca62c1d6;
        const tmp = (((a << 5) | (a >>> 27)) + f + e + k + W[t]) >>> 0;
        e = d; d = c; c = (bb << 30) | (bb >>> 2); bb = a; a = tmp;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + bb) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
    }
    const out = new Uint8Array(20);
    [h0, h1, h2, h3, h4].forEach((h, i) => { out[i*4] = h >>> 24; out[i*4+1] = (h >>> 16) & 255; out[i*4+2] = (h >>> 8) & 255; out[i*4+3] = h & 255; });
    return out;
  }

  const crypto = {
    createHash: () => { let s = ""; const o = { update: (v) => { s += v; return o; }, digest: () => sha1(s) }; return o; },
    randomBytes: (n) => {
      const b = window.crypto.getRandomValues(new Uint8Array(n));
      return { toString: () => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("") };
    },
  };
  const Buffer = { from: (b64) => ({ b64, length: Math.floor(String(b64).length * 3 / 4) }) };

  /* ── the store: localStorage instead of the GitHub Contents API ─────── */

  const KEY = "sjdemo.v1.";
  const BOARD_PATH = "data/board.json", BOARD_FILE = KEY + "board";
  const SUBS_PATH = "data/subs.json", SUBS_FILE = KEY + "subs";
  const PHOTOS = KEY + "photos";
  const mem = {};
  const ls = {
    get(k) { try { const v = localStorage.getItem(k); return v == null ? mem[k] : v; } catch { return mem[k]; } },
    set(k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch { /* quota or private mode: memory only */ } },
    del(k) { delete mem[k]; try { localStorage.removeItem(k); } catch {} },
  };

  function readStore(store) {
    try { return store.normalize(JSON.parse(ls.get(store.file))); }
    catch { return store.empty(); }
  }
  function writeStore(store, data) { ls.set(store.file, JSON.stringify(data)); }

  /* same contract as the real one: apply() mutates or returns {error}. the
     real one retries a lost sha race against GitHub; one tab can't race. */
  async function mutate(apply, store = BOARD_STORE) {
    const board = readStore(store);
    const out = apply(board) || {};
    if (!out.error) writeStore(store, board);
    await new Promise((r) => setTimeout(r, 120 + Math.random() * 160));   // a commit isn't instant
    return out;
  }
  const readLocal = () => readStore(BOARD_STORE);

  function photoMap() { try { return JSON.parse(ls.get(PHOTOS)) || {}; } catch { return {}; } }
  async function putPhoto(file, buf) {
    const ext = file.split(".").pop();
    const m = photoMap();
    m[file] = `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${buf.b64}`;
    ls.set(PHOTOS, JSON.stringify(m));
  }
  async function dropPhoto(file) { const m = photoMap(); delete m[file]; ls.set(PHOTOS, JSON.stringify(m)); }

  /* ════════════════════════ BEGIN server.js ════════════════════════ */
  const LIMIT = { title: 120, blurb: 500, note: 600, feel: 600, caption: 140, cat: 28 };
const MAX_CATS = 24;

function clean(s, max, keepBreaks) {
  let out = String(s == null ? "" : s).replace(/\r/g, "");
  out = keepBreaks ? out.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n")
                   : out.replace(/\s+/g, " ");
  return out.trim().slice(0, max);
}

const who = (w) => (w === "i" ? "i" : w === "a" ? "a" : null);
const name = (w) => (w === "i" ? "theo" : "maya");
const now = () => new Date().toISOString();
const newId = () => Date.now().toString(36) + crypto.randomBytes(3).toString("hex");

/* every note gets the same crooked angle every time it's drawn. deriving it
   from the id means the board doesn't reshuffle itself on every render, and
   the server doesn't have to remember anything extra. */
function tilt(id) {
  const h = crypto.createHash("sha1").update(id).digest()[0];
  return Math.round(((h / 255) * 7 - 3.5) * 10) / 10;
}

/* a category's colour comes from its id the same way, out of a set chosen to
   sit on a corkboard. free hue picking gives you a muddy olive eventually. */
const HUES = [34, 6, 340, 286, 216, 168, 96, 52];
function hue(id) {
  return HUES[crypto.createHash("sha1").update(id).digest()[1] % HUES.length];
}

/* status is whatever the events say it is. keeping it as a derived value means
   deleting a "crossed out" from the middle of a thread can't leave an idea
   stranded on the wall. */
function restatus(idea) {
  let s = "jar";
  for (const e of idea.events) {
    if (e.k === "pick") s = "picked";
    else if (e.k === "back") s = "jar";
    else if (e.k === "done") s = "done";
    else if (e.k === "undone") s = "picked";
  }
  idea.status = s;
  if (s === "done") {
    const last = [...idea.events].reverse().find((e) => e.k === "done");
    idea.doneAt = last ? last.at : idea.at;
  } else {
    delete idea.doneAt;
  }
}


const empty = () => ({ categories: [], ideas: [] });

/* boards written before categories existed have no categories array, and a
   half-written one shouldn't take the site down. every read goes through here. */
function normalize(board) {
  if (!board || typeof board !== "object") return empty();
  if (!Array.isArray(board.ideas)) board.ideas = [];
  if (!Array.isArray(board.categories)) board.categories = [];
  return board;
}

/* two things live in the repo now — the board, and which phones want to be
   told about it. they want identical treatment (read-modify-write, retry the
   sha race, mirror to disk), so they're described rather than duplicated. */
const BOARD_STORE = {
  repoPath: BOARD_PATH, file: BOARD_FILE, empty, normalize,
  fallback: "the board moved",
};

const SUBS_STORE = {
  repoPath: SUBS_PATH, file: SUBS_FILE,
  empty: () => ({ subs: [] }),
  normalize: (o) => (o && Array.isArray(o.subs) ? o : { subs: [] }),
  fallback: "a phone changed its mind",
};


const find = (board, id) => board.ideas.find((i) => i.id === id);

async function addIdea(body) {
  const w = who(body.who);
  const title = clean(body.title, LIMIT.title);
  const blurb = clean(body.blurb, LIMIT.blurb, true);
  const cat = body.cat ? String(body.cat) : "";
  if (!w) return { error: "who?" };
  if (!title) return { error: "it needs a name" };

  const id = newId();
  const at = now();
  const idea = {
    id, title, blurb, who: w, at,
    status: "jar",                 // jar → picked → done
    tilt: tilt(id),
    events: [{ k: "add", who: w, at, text: title }],
  };
  if (blurb) idea.events.push({ k: "note", who: w, at, text: blurb });

  return mutate((board) => {
    const dupe = board.ideas.find(
      (i) => i.title.toLowerCase() === title.toLowerCase() && i.status !== "done"
    );
    if (dupe) return { error: "that one's already up there", data: { id: dupe.id } };

    const c = cat ? board.categories.find((x) => x.id === cat) : null;
    if (c) idea.cat = c.id;

    board.ideas.push(idea);
    return {
      message: `${name(w)} pinned "${title}" to the board` + (c ? ` under ${c.name}` : ""),
      data: { idea },
    };
  });
}

async function editIdea(body) {
  const w = who(body.who);
  const id = String(body.id || "");
  const title = clean(body.title, LIMIT.title);
  const blurb = clean(body.blurb, LIMIT.blurb, true);
  if (!w) return { error: "who?" };
  if (!title) return { error: "it needs a name" };

  return mutate((board) => {
    const idea = find(board, id);
    if (!idea) return { error: "that idea's gone" };
    if (idea.title === title && (idea.blurb || "") === blurb) return { error: "nothing changed" };

    const was = idea.title;
    const renamed = was !== title;
    idea.title = title;
    idea.blurb = blurb;
    idea.events.push({
      k: "edit", who: w, at: now(),
      text: renamed ? `renamed it — it was “${was}”` : "rewrote the details",
    });
    return {
      message: renamed ? `${name(w)} renamed "${was}" to "${title}"`
                       : `${name(w)} rewrote the notes on "${title}"`,
      data: {},
    };
  });
}

/* the board stops pointing at the idea first; the photo files go after. */
async function deleteIdea(body) {
  const w = who(body.who);
  const id = String(body.id || "");
  if (!w) return { error: "who?" };

  let shots = [];
  const out = await mutate((board) => {
    const n = board.ideas.findIndex((i) => i.id === id);
    if (n < 0) return { error: "that one's already gone" };
    const [idea] = board.ideas.splice(n, 1);
    shots = idea.events.filter((e) => e.k === "photo" && e.src).map((e) => e.src);
    return { message: `${name(w)} took "${idea.title}" off the board`, data: { photos: shots.length } };
  });
  if (out.error) return out;

  for (const file of shots) await dropPhoto(file).catch(() => {});
  return out;
}

/* one line out of a thread. identified by position *and* timestamp, because
   the other phone may have added something since this page drew the list. */
async function deleteEvent(body) {
  const w = who(body.who);
  const id = String(body.id || "");
  const n = Number(body.n);
  const at = String(body.at || "");
  if (!w) return { error: "who?" };
  if (!Number.isInteger(n) || n < 0) return { error: "which one?" };

  let shot = null;
  const out = await mutate((board) => {
    const idea = find(board, id);
    if (!idea) return { error: "that idea's gone" };

    const ev = idea.events[n];
    if (!ev) return { error: "that one's already gone" };
    if (at && ev.at !== at) return { error: "the thread moved — close it and open it again" };
    if (ev.k === "add") return { error: "that's the idea itself — delete the whole thing instead" };

    idea.events.splice(n, 1);
    restatus(idea);                       // in case that was a crossing-out
    if (ev.k === "photo") shot = ev.src;
    return {
      message: `${name(w)} deleted a ${ev.k === "photo" ? "photo" : "line"} from "${idea.title}"`,
      data: { status: idea.status },
    };
  });
  if (out.error) return out;

  if (shot) await dropPhoto(shot).catch(() => {});
  return out;
}

/* ── categories ────────────────────────────────────────────────────────── */

async function addCategory(body) {
  const w = who(body.who);
  const label = clean(body.name, LIMIT.cat);
  if (!w) return { error: "who?" };
  if (!label) return { error: "it needs a name" };

  return mutate((board) => {
    if (board.categories.some((c) => c.name.toLowerCase() === label.toLowerCase())) {
      return { error: "you already have that one" };
    }
    if (board.categories.length >= MAX_CATS) return { error: "that's a lot of categories" };

    const id = newId();
    const cat = { id, name: label, who: w, at: now(), hue: hue(id) };
    board.categories.push(cat);
    return { message: `${name(w)} made a new category: ${label}`, data: { category: cat } };
  });
}

/* removing a category never removes what's in it — the ideas just come
   untagged and go back to being plain notes on the board. */
async function deleteCategory(body) {
  const w = who(body.who);
  const id = String(body.id || "");
  if (!w) return { error: "who?" };

  return mutate((board) => {
    const n = board.categories.findIndex((c) => c.id === id);
    if (n < 0) return { error: "that one's already gone" };
    const [cat] = board.categories.splice(n, 1);

    let freed = 0;
    board.ideas.forEach((i) => { if (i.cat === id) { delete i.cat; freed++; } });
    return { message: `${name(w)} removed the ${cat.name} category`, data: { freed } };
  });
}

async function fileIdea(body) {
  const w = who(body.who);
  const id = String(body.id || "");
  const cat = body.cat ? String(body.cat) : "";
  if (!w) return { error: "who?" };

  return mutate((board) => {
    const idea = find(board, id);
    if (!idea) return { error: "that idea's gone" };
    const c = cat ? board.categories.find((x) => x.id === cat) : null;
    if (cat && !c) return { error: "no such category" };
    if ((idea.cat || "") === cat) return { error: "it's already there" };

    if (c) idea.cat = c.id; else delete idea.cat;
    idea.events.push({ k: "file", who: w, at: now(), text: c ? c.name : "nothing" });
    return {
      message: c ? `${name(w)} filed "${idea.title}" under ${c.name}`
                 : `${name(w)} took "${idea.title}" out of its category`,
      data: {},
    };
  });
}

const VERBS = {
  note: (n, t) => `${n} added a note to "${t}"`,
  feel: (n, t) => `${n} said how "${t}" felt`,
  did:  (n, t) => `${n} wrote down what we actually did on "${t}"`,
  pick: (n, t) => `${n} pulled "${t}" out of the jar`,
  back: (n, t) => `${n} put "${t}" back in the jar`,
  done: (n, t) => `${n} crossed out "${t}"`,
  undone: (n, t) => `${n} put "${t}" back on the board`,
};

async function addEvent(body) {
  const w = who(body.who);
  const id = String(body.id || "");
  const k = String(body.kind || "");
  if (!w) return { error: "who?" };
  if (!VERBS[k]) return { error: "not a thing you can do" };

  const wordy = k === "note" || k === "feel" || k === "did";
  const text = clean(body.text, k === "note" ? LIMIT.note : LIMIT.feel, true);
  const mood = clean(body.mood, 8);
  if (wordy && !text) return { error: "say something" };

  return mutate((board) => {
    const idea = find(board, id);
    if (!idea) return { error: "that idea's gone" };
    if (idea.events.length > 500) return { error: "that's a lot of conversation" };

    const ev = { k, who: w, at: now() };
    if (text) ev.text = text;
    if (mood) ev.mood = mood;
    idea.events.push(ev);

    if (k === "pick")   idea.status = "picked";
    if (k === "back")   idea.status = "jar";
    if (k === "done")   { idea.status = "done"; idea.doneAt = ev.at; }
    if (k === "undone") { idea.status = "picked"; delete idea.doneAt; }

    return { message: VERBS[k](name(w), idea.title), data: { event: ev, status: idea.status } };
  });
}

/* the client hands over a data url it has already shrunk on a canvas, so what
   lands here is a few hundred kb rather than whatever the phone shot. */
async function addPhoto(body) {
  const w = who(body.who);
  const id = String(body.id || "");
  const caption = clean(body.caption, LIMIT.caption);
  if (!w) return { error: "who?" };

  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(body.data || ""));
  if (!m) return { error: "that isn't an image i can take" };
  const buf = Buffer.from(m[2], "base64");
  if (!buf.length) return { error: "the image came through empty" };
  if (buf.length > 4.5e6) return { error: "still too big — try one photo at a time" };

  const ext = m[1] === "jpeg" ? "jpg" : m[1];
  const file = `${id}-${crypto.randomBytes(4).toString("hex")}.${ext}`;

  // the file lands first: a photo in the repo with no event pointing at it is
  // just an orphan, but an event pointing at a file that was never written is
  // a broken picture on the wall forever.
  let title = "an idea";
  const peek = find(readLocal(), id);
  if (peek) title = peek.title;
  await putPhoto(file, buf, `${name(w)} pinned a photo to "${title}"`);

  return mutate((board) => {
    const idea = find(board, id);
    if (!idea) return { error: "that idea's gone" };
    const ev = { k: "photo", who: w, at: now(), src: file };
    if (caption) ev.text = caption;
    idea.events.push(ev);
    return { message: `${name(w)} pinned a photo to "${idea.title}"`, data: { event: ev } };
  });
}

/* ── which phones want telling ─────────────────────────────────────────── */

/* a subscription is device state, not board content, but it goes in the repo
   for the same reason everything else does: this container's disk is wiped on
   every deploy, and every write is a deploy. on disk alone you'd be tapping
   the bell again several times a day. */
async function subscribe(body) {
  const w = who(body.who);
  const sub = body.sub || {};
  const keys = sub.keys || {};
  const endpoint = String(sub.endpoint || "");
  const p256dh = String(keys.p256dh || "");
  const auth = String(keys.auth || "");

  if (!w) return { error: "who?" };
  if (!/^https:\/\/[^\s]+$/.test(endpoint) || endpoint.length > 700) {
    return { error: "that isn't a push endpoint" };
  }
  if (!p256dh || !auth) return { error: "the subscription came without its keys" };

  return mutate((store) => {
    const at = now();
    const rec = { endpoint, p256dh, auth, who: w, at };
    const had = store.subs.findIndex((s) => s.endpoint === endpoint);
    // re-subscribing on the same device replaces rather than duplicates
    if (had >= 0) store.subs[had] = rec; else store.subs.push(rec);
    if (store.subs.length > 20) store.subs.splice(0, store.subs.length - 20);
    return { message: `${name(w)} turned notifications on`, data: { count: store.subs.length } };
  }, SUBS_STORE);
}

async function unsubscribe(body) {
  const endpoint = String(body.endpoint || "");
  if (!endpoint) return { error: "which one?" };

  return mutate((store) => {
    const n = store.subs.findIndex((s) => s.endpoint === endpoint);
    if (n < 0) return { error: "that one's already gone" };
    const [gone] = store.subs.splice(n, 1);
    return { message: `${name(gone.who)} turned notifications off`, data: {} };
  }, SUBS_STORE);
}

/* ── routes ────────────────────────────────────────────────────────────── */

const ROUTES = {
  "/api/idea":            addIdea,
  "/api/idea/edit":       editIdea,
  "/api/idea/delete":     deleteIdea,
  "/api/idea/file":       fileIdea,
  "/api/event":           addEvent,
  "/api/event/delete":    deleteEvent,
  "/api/photo":           addPhoto,
  "/api/category":        addCategory,
  "/api/category/delete": deleteCategory,
  "/api/push/subscribe":   subscribe,
  "/api/push/unsubscribe": unsubscribe,
};

  /* ═════════════════════════ END server.js ═════════════════════════ */

  /* ── seed: a sample board so there's something to poke at ─────────── */
  function makeSeed() {
  const H = 3600e3, D = 24 * H;
  const t0 = Date.now();
  const at = (ago) => new Date(t0 - ago).toISOString();
  let n = 0;
  const id = () => (t0 - 40 * D + (n++) * 7919).toString(36) + (0xa1b2c3 + n * 4099).toString(16).slice(-6);

  const svg = (body, bg) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="${bg}"/>${body}</svg>`);

  const photos = {
    "ridge-0001.svg": svg(`
      <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb26b"/><stop offset=".55" stop-color="#ffd9a0"/><stop offset="1" stop-color="#fff1d6"/></linearGradient></defs>
      <rect width="400" height="400" fill="url(#s)"/>
      <circle cx="250" cy="215" r="46" fill="#fff4c2"/>
      <path d="M0 260 L90 170 L160 230 L240 150 L330 240 L400 190 L400 400 L0 400Z" fill="#7a6a8f"/>
      <path d="M0 310 L70 250 L150 300 L260 230 L340 300 L400 270 L400 400 L0 400Z" fill="#4e4766"/>
      <path d="M118 300 q8 -18 16 0" stroke="#2c2840" stroke-width="5" fill="none"/>
      <path d="M140 302 q8 -18 16 0" stroke="#2c2840" stroke-width="5" fill="none"/>`, "#ffd9a0"),
    "dumpling-0002.svg": svg(`
      <circle cx="200" cy="210" r="150" fill="#e9dcc7"/><circle cx="200" cy="210" r="128" fill="#f6efe3"/>
      ${[[150,180],[235,170],[190,250],[265,245],[130,255]].map(([x,y]) =>
        `<g transform="translate(${x} ${y})"><path d="M-34 8 Q0 -40 34 8 Q0 26 -34 8Z" fill="#fffaf0" stroke="#d8c7a8" stroke-width="3"/>
         <path d="M-18 -6 q4 8 8 0 q4 8 8 0 q4 8 8 0" stroke="#d8c7a8" stroke-width="3" fill="none"/></g>`).join("")}
      <path d="M300 90 l60 -60" stroke="#8a5a32" stroke-width="8" stroke-linecap="round"/>
      <path d="M318 104 l60 -56" stroke="#8a5a32" stroke-width="8" stroke-linecap="round"/>`, "#c9e4de"),
    "lake-0003.svg": svg(`
      <defs><linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f1a3a"/><stop offset="1" stop-color="#2b3c6e"/></linearGradient></defs>
      <rect width="400" height="400" fill="url(#n)"/>
      ${Array.from({ length: 70 }, (_, i) => `<circle cx="${(i * 97) % 400}" cy="${(i * 53) % 230}" r="${1 + (i % 3) * .7}" fill="#fff" opacity="${.4 + (i % 5) * .12}"/>`).join("")}
      <path d="M40 60 l120 70" stroke="#fff" stroke-width="2" opacity=".8"/>
      <path d="M0 250 Q100 220 200 245 T400 240 L400 400 L0 400Z" fill="#162447"/>
      <rect x="0" y="262" width="400" height="140" fill="#1c2f5c" opacity=".7"/>
      <circle cx="320" cy="90" r="22" fill="#f8f3d6"/>`, "#0f1a3a"),
  };

  const cats = [
    { name: "outdoors", who: "i", ago: 38 * D },
    { name: "food", who: "a", ago: 38 * D },
    { name: "cozy", who: "a", ago: 37 * D },
    { name: "new things", who: "i", ago: 30 * D },
  ].map((c) => { const cid = id(); return { id: cid, name: c.name, who: c.who, at: at(c.ago), hue: hue(cid) }; });
  const C = Object.fromEntries(cats.map((c) => [c.name, c.id]));

  /* each idea is a little script of events, oldest first */
  const spec = [
    { title: "sunrise hike up the ridge", who: "i", ago: 33 * D, cat: "outdoors",
      blurb: "leave at 4:30, thermos of chai, headlamps.\nthe east trail is shorter but steeper.",
      ev: [["note", "a", 32 * D, "only if we stop for pancakes on the way back"],
           ["pick", "a", 12 * D], ["photo", "i", 9 * D, "made it with four minutes to spare", "ridge-0001.svg"],
           ["done", "i", 9 * D], ["feel", "a", 9 * D - 2 * H, "cold, tired, completely worth it", "🥹"],
           ["did", "i", 9 * D - 3 * H, "took the steep trail by accident. pancakes were earned."]] },
    { title: "make dumplings from scratch", who: "a", ago: 29 * D, cat: "food",
      blurb: "pork + chive and a veggie one. we are folding them ourselves, no cheating.",
      ev: [["pick", "i", 6 * D], ["photo", "a", 5 * D, "the pleats got better around #30", "dumpling-0002.svg"],
           ["done", "a", 5 * D], ["feel", "i", 5 * D - H, "flour everywhere. would do again.", "😌"]] },
    { title: "blanket fort + movie marathon", who: "a", ago: 21 * D, cat: "cozy",
      blurb: "three movies, one each and one we both haven't seen.",
      ev: [["note", "i", 20 * D, "i'm bringing the fairy lights"], ["pick", "i", 2 * D],
           ["note", "a", 2 * D - 4 * H, "saturday? i'll do popcorn"]] },
    { title: "stargazing at the lake", who: "i", ago: 18 * D, cat: "outdoors",
      blurb: "meteor shower peaks mid-month. bring the big blanket.",
      ev: [["note", "a", 17 * D, "and hot chocolate in the good flask"],
           ["photo", "i", 16 * D, "scouted the spot — no streetlights", "lake-0003.svg"]] },
    { title: "farmers market, then a picnic", who: "a", ago: 15 * D, cat: "food",
      blurb: "buy only things we've never tried. eat them in the park.", ev: [] },
    { title: "learn three chords on the ukulele", who: "i", ago: 13 * D, cat: "new things",
      blurb: "C, G, Am. then we're a band.", ev: [["note", "a", 12 * D, "F is also allowed"]] },
    { title: "pottery class", who: "a", ago: 11 * D, cat: "new things",
      blurb: "there's a saturday taster session downtown.", ev: [] },
    { title: "bookshop crawl — pick a book for each other", who: "i", ago: 8 * D, cat: "cozy",
      blurb: "budget: one book each. no reading the back cover.", ev: [] },
    { title: "paint each other, badly", who: "a", ago: 26 * D, cat: "cozy",
      blurb: "ten minutes, no erasing.",
      ev: [["pick", "a", 20 * D], ["done", "i", 19 * D], ["feel", "a", 19 * D - H, "framed it. it's terrible. i love it.", "😂"]] },
    { title: "cook something from a country neither of us has been to", who: "i", ago: 4 * D, cat: "food",
      blurb: "spin the globe, cook whatever's there.", ev: [] },
    { title: "night bike ride", who: "a", ago: 2 * D, cat: "",
      blurb: "lights on, loop the river path.", ev: [] },
    { title: "write letters to open in a year", who: "i", ago: 6 * H, cat: "",
      blurb: "", ev: [] },
  ];

  const ideas = spec.map((s) => {
    const iid = id();
    const idea = { id: iid, title: s.title, blurb: s.blurb, who: s.who, at: at(s.ago),
      status: "jar", tilt: tilt(iid), events: [{ k: "add", who: s.who, at: at(s.ago), text: s.title }] };
    if (s.cat) idea.cat = C[s.cat];
    if (s.blurb) idea.events.push({ k: "note", who: s.who, at: at(s.ago), text: s.blurb });
    for (const [k, w, ago, text, extra] of s.ev) {
      const ev = { k, who: w, at: at(ago) };
      if (text) ev.text = text;
      if (k === "photo") ev.src = extra;
      else if (extra) ev.mood = extra;
      idea.events.push(ev);
    }
    restatus(idea);
    return idea;
  });

  ideas.sort((x, y) => x.at < y.at ? -1 : 1);
  return { board: { categories: cats, ideas }, photos };
}


  function ensureSeed(force) {
    if (!force && ls.get(BOARD_FILE)) return;
    const { board, photos } = makeSeed();
    writeStore(BOARD_STORE, board);
    ls.set(PHOTOS, JSON.stringify(photos));
    writeStore(SUBS_STORE, { subs: [] });
  }
  ensureSeed(false);

  window.sunDemo = {
    reset() { ls.del(BOARD_FILE); ls.del(PHOTOS); ls.del("sun.me"); ensureSeed(true); location.reload(); },
    photo(file) { return photoMap()[file] || ""; },
  };

  /* ── the "network": answer /api/* exactly like handleApi() would ───── */

  const reply = (code, body) => new Response(JSON.stringify(body), {
    status: code, headers: { "Content-Type": "application/json" },
  });

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url, location.href);
    const route = url.pathname.replace(/^.*?(\/api\/)/, "/api/");
    if (!/\/api\//.test(url.pathname)) return realFetch(input, init);

    if (route === "/api/unlock") return reply(200, { ok: true });
    if (route === "/api/board") {
      const b = readLocal();
      return reply(200, { ideas: b.ideas, categories: b.categories, writable: true });
    }
    if (route === "/api/push/key") return reply(200, { key: "" });

    const run = ROUTES[route];
    if (!run) return reply(404, { error: "no such thing" });
    let body;
    try { body = JSON.parse(init.body || "{}"); } catch { return reply(400, { error: "that didn't arrive in one piece" }); }
    try {
      const out = await run(body);
      if (out.error) return reply(400, { error: out.error, ...(out.data || {}) });
      if (out.message) window.dispatchEvent(new CustomEvent("sun:commit", { detail: out.message }));
      return reply(200, { ok: true, ...(out.data || {}) });
    } catch (e) {
      return reply(502, { error: "that didn't save", detail: String(e.message || e) });
    }
  };

  /* web push needs a real server and a VAPID key; the demo hides the bell */
  if (navigator.serviceWorker) {
    try { navigator.serviceWorker.register = () => Promise.reject(new Error("demo")); } catch {}
  }
})();
