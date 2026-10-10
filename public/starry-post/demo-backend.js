/* starry post — public demo backend.

   The live app is a zero-dependency Node server that stores ciphertext in a
   GitHub repo. This file runs the server's real route handlers (spliced in
   verbatim at build time) inside the browser, with the repo swapped for
   localStorage. The letters are still sealed in the page with PBKDF2 →
   AES-256-GCM before the "server" ever sees them — open devtools and look at
   localStorage: it only ever holds ciphertext.

   Demo passphrase: starlight */

(() => {
  "use strict";

  const PASSPHRASE = "starlight";
  const KEY = "spdemo.v1.";
  const mem = {};
  const ls = {
    get(k) { try { const v = localStorage.getItem(k); return v == null ? mem[k] : v; } catch { return mem[k]; } },
    set(k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch {} },
    del(k) { delete mem[k]; try { localStorage.removeItem(k); } catch {} },
  };
  const commit = (msg) => window.dispatchEvent(new CustomEvent("sp:commit", { detail: msg }));
  const pause = () => new Promise((r) => setTimeout(r, 140 + Math.random() * 180));

  /* ── node shims ── */
  const crypto = {
    randomBytes: (n) => {
      const b = window.crypto.getRandomValues(new Uint8Array(n));
      return { toString: () => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("") };
    },
  };
  const Buffer = { from: (s) => ({ toString: () => btoa(s) }) };
  const console = { error: (...a) => window.console.warn("[demo server]", ...a), log() {} };
  const readBody = async (req) => req.body || "";
  const rateOk = () => true;
  const ipOf = () => "demo";

  /* ── tools/store.js, with localStorage where the GitHub Contents API was ── */
  function jsonStore(name, empty) {
    const k = KEY + name;
    const blank = () => JSON.parse(JSON.stringify(empty));
    const read = () => { try { return JSON.parse(ls.get(k)) || blank(); } catch { return blank(); } };
    return {
      async read() { await pause(); return read(); },
      async mutate(fn, message) {
        await pause();
        const data = read();
        const out = fn(data);
        if (out === undefined) return out;             // caller decided not to write
        ls.set(k, JSON.stringify(data));
        commit(typeof message === "function" ? message(out) : message);
        return out;
      },
    };
  }
  const store = {
    letters: jsonStore("letters", { letters: [] }),
    stickers: jsonStore("stickers", { stickers: [] }),
    raw: {
      async put(rel, base64, message) { await pause(); ls.set(KEY + rel, base64); commit(message); },
      async get(rel) { const v = ls.get(KEY + rel); return v ? atob(v) : null; },
      async del(rel, message) { ls.del(KEY + rel); commit(message); },
    },
  };
  const mail = {
    told(who) { commit(`(mail) would email ${who === "i" ? "nora" : "sami"}: "a letter is waiting" — off in the demo`); return true; },
  };

  /* ════════════════════════ BEGIN server.js ════════════════════════ */
  const MAX_BODY = 512 * 1024;        // a 12-page letter, ciphertext, with room
const MAX_PAGES = 12;

function json(res, code, body) {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(payload);
}


const newId = () => Date.now().toString(36) + crypto.randomBytes(4).toString("hex");


const isLocked = (L) => Boolean(L.kept && !L.releasedAt);

async function letters(req, res) {
  const data = await store.letters.read();
  const out = (data.letters || []).map((L) =>
    isLocked(L) ? { ...L, enc: undefined, locked: true } : L);
  json(res, 200, { letters: out });
}

/* the day. releases every kept letter at once — it is one moment, not a
   filing task, so there is no per-letter unlock. */
async function release(req, res) {
  try {
    const now = new Date().toISOString();
    const freed = await store.letters.mutate((data) => {
      const waiting = (data.letters || []).filter(isLocked);
      if (!waiting.length) return undefined;
      for (const L of waiting) L.releasedAt = now;
      return waiting.length;
    }, (n) => `the day came — ${n} letter${n === 1 ? "" : "s"} opened`);
    return json(res, 200, { ok: true, released: freed || 0, at: now });
  } catch (e) {
    console.error("release failed:", e.message);
    return json(res, 502, { error: "couldn't open them", detail: String(e.message || e) });
  }
}

async function addLetter(req, res) {
  if (!rateOk(ipOf(req))) return json(res, 429, { error: "slow down" });

  let body;
  try { body = JSON.parse(await readBody(req, MAX_BODY)); }
  catch { return json(res, 400, { error: "that letter is too long to send" }); }

  const who = body.who === "i" ? "i" : body.who === "a" ? "a" : null;
  const enc = typeof body.enc === "string" ? body.enc : "";
  const pageCount = Math.max(1, Math.min(MAX_PAGES, Number(body.pageCount) || 1));

  if (!who) return json(res, 400, { error: "who wrote it?" });
  if (!enc || enc.length < 24) return json(res, 400, { error: "nothing in it" });
  if (!/^[A-Za-z0-9+/=]+$/.test(enc)) return json(res, 400, { error: "that isn't a sealed letter" });

  /* `at` comes from the browser so the timestamp is the moment she pressed
     seal, not the moment the request happened to arrive — but it is clamped,
     because a phone with a wrong clock should not be able to file a letter
     under next year. */
  let at = Date.parse(body.at);
  if (!at || Math.abs(Date.now() - at) > 864e5) at = Date.now();

  /* `at` is when it was WRITTEN, for both kinds. For a letter kept until the
     day that is the whole point — it is opened months later and still says
     the night it was written, not the night it was finally allowed out. */
  const kept = body.kept === true;

  const letter = {
    id: newId(),
    who,
    at: new Date(at).toISOString(),
    pageCount,
    readAt: null,
    ...(kept ? { kept: true, releasedAt: null } : {}),
    enc,
  };

  try {
    await store.letters.mutate(
      (data) => { data.letters.push(letter); return letter; },
      kept
        ? `${who === "i" ? "sami" : "nora"} put one away for the day`
        : `a letter from ${who === "i" ? "sami" : "nora"}`
    );
  } catch (e) {
    /* the detail goes back on purpose — everyone who gets this far has already
       proved they know the passphrase, and "github write 403" is the difference
       between a five-second fix and an afternoon */
    console.error("letter failed:", e.message);
    return json(res, 502, { error: "the post refused it", detail: String(e.message || e) });
  }

  /* fire and forget. a dead mail server can never fail a letter.
     A kept letter tells nobody: there is nothing to go and read yet, and an
     email saying otherwise would be a lie with a link on it. */
  let mailed = false;
  if (!kept) {
    try { mailed = mail.told(who); }
    catch (e) { console.error("mail: threw —", e.message); }
  }

  json(res, 200, { ok: true, letter, mailed });
}

/* ── custom stickers ───────────────────────────────────────────────────────
   The image arrives already encrypted, exactly like a letter — the server
   stores a blob it cannot open. Metadata (who, when, what it's called) stays
   readable so the drawer can list them without decrypting every one. */

const MAX_STICKERS = 120;
const MAX_STICKER_BYTES = 400 * 1024;      // base64 of a ~256px png, with room

async function listStickers(req, res) {
  const data = await store.stickers.read();
  json(res, 200, { stickers: data.stickers || [] });
}

async function addSticker(req, res) {
  if (!rateOk(ipOf(req))) return json(res, 429, { error: "slow down" });

  let body;
  try { body = JSON.parse(await readBody(req, MAX_STICKER_BYTES + 4096)); }
  catch { return json(res, 400, { error: "that image is too big" }); }

  const who = body.who === "i" ? "i" : body.who === "a" ? "a" : null;
  const enc = typeof body.enc === "string" ? body.enc : "";
  const label = String(body.label || "sticker").trim().slice(0, 40) || "sticker";

  if (!who) return json(res, 400, { error: "who added it?" });
  if (!enc || enc.length < 24) return json(res, 400, { error: "nothing in it" });
  if (!/^[A-Za-z0-9+/=]+$/.test(enc)) return json(res, 400, { error: "that isn't an encrypted image" });
  if (enc.length > MAX_STICKER_BYTES) return json(res, 400, { error: "that image is too big" });

  const id = newId();
  const rel = `stickers/${id}.enc`;

  try {
    /* the blob first: if the metadata landed first and this failed, the drawer
       would show a sticker whose image doesn't exist */
    await store.raw.put(rel, Buffer.from(enc, "utf8").toString("base64"),
      `${who === "i" ? "sami" : "nora"} added a sticker`);

    const saved = await store.stickers.mutate((data) => {
      data.stickers = data.stickers || [];
      if (data.stickers.length >= MAX_STICKERS) return undefined;
      const s = { id, who, label, at: new Date().toISOString() };
      data.stickers.push(s);
      return s;
    }, `${who === "i" ? "sami" : "nora"} added "${label}"`);

    if (!saved) {
      await store.raw.del(rel, "roll back an unlisted sticker").catch(() => {});
      return json(res, 400, { error: `that's ${MAX_STICKERS} stickers — delete one first` });
    }
    return json(res, 200, { ok: true, sticker: saved });
  } catch (e) {
    console.error("sticker failed:", e.message);
    return json(res, 502, { error: "the post refused it", detail: String(e.message || e) });
  }
}

async function delSticker(req, res) {
  let body;
  try { body = JSON.parse(await readBody(req, 2048)); }
  catch { return json(res, 400, { error: "bad body" }); }

  const id = String(body.id || "");
  if (!/^[a-z0-9]+$/.test(id)) return json(res, 400, { error: "which one?" });

  try {
    const gone = await store.stickers.mutate((data) => {
      const i = (data.stickers || []).findIndex((s) => s.id === id);
      if (i < 0) return undefined;
      return data.stickers.splice(i, 1)[0];
    }, "a sticker was peeled off");
    if (gone) await store.raw.del(`stickers/${id}.enc`, "and its image").catch(() => {});
    return json(res, 200, { ok: true });
  } catch (e) {
    console.error("sticker delete failed:", e.message);
    return json(res, 502, { error: "couldn't remove it" });
  }
}

/* the encrypted image itself. requires the cookie — the bytes are useless
   without the passphrase, but there's no reason to let anyone enumerate them */
async function serveSticker(req, res, id) {
  let buf;
  try { buf = await store.raw.get(`stickers/${id}.enc`); }
  catch (e) { console.error("sticker read failed:", e.message); buf = null; }
  if (!buf) { res.writeHead(404).end("not found"); return; }
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    /* immutable: a sticker id is never reused, so this can be cached hard —
       which matters on her connection */
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  });
  res.end(buf);
}

async function markRead(req, res) {
  let body;
  try { body = JSON.parse(await readBody(req, 2048)); }
  catch { return json(res, 400, { error: "bad body" }); }

  const id = String(body.id || "");
  if (!id) return json(res, 400, { error: "which one?" });

  try {
    /* `already` carries the existing timestamp back out, because mutate()
       returning undefined is how the store is told not to write — without it
       a second open would answer `readAt: null` and look like it failed */
    let already = null;
    const done = await store.letters.mutate((data) => {
      const L = (data.letters || []).find((x) => x.id === id);
      if (!L) return undefined;
      if (L.readAt) { already = L.readAt; return undefined; }   // nothing to write
      L.readAt = new Date().toISOString();
      return L;
    }, "a letter was opened");
    return json(res, 200, { ok: true, readAt: done ? done.readAt : already });
  } catch (e) {
    console.error("read failed:", e.message);
    return json(res, 502, { error: "couldn't note it" });
  }
}

  /* ═════════════════════════ END server.js ═════════════════════════ */

  /* ── seed: sample letters, sealed at build time with the demo passphrase ── */
  const SEED = {"builtAt":1791590356912,"letters":[{"id":"muk6n1v4ee8ebf56","who":"i","at":"2026-09-27T18:59:16.912Z","pageCount":1,"readAt":"2026-09-27T21:59:16.912Z","enc":"bo4b9MS3hqH+8+W8A+o6hDQDAaygza8kadfQIFvxbOflFmbaQXmqG9L/kfObt1NN+OFmP6NWEInu/qmw5bPWM+N1VmukNkUE1OhamyNmjz7s89VeZrjcaNiitmjqggFIphI6tg/QQ1G1sw/yHvBb5qj2NNG/Bu508TT4q4NqKA1v34Bo++GzQ3tSTmtuFwNpoeNBTlfrtLSYaLCscX/Lo3tkOKKtuPCDTmx5cekWBBrkqYamr22vNO5+BvY5rbcNADmfS3aLyE1naq5kcJqDtqJhBeewmRc0KWuhiu2NL1QXBVJgLs3xt8Vgpl7GnwdPq9SwRdkfIqh/Bo/5elKXE9TQ/bE9p/Vx8B4TKi1WzvvysXCyB0iRLaf0Zk4o8nNJKlkahdZeQeI4nBt93Kx3dD8R8o4Dn5VPW8HZZXEHXnqLo7J/f3Ej7+jU5tm+Jd+tHxeONodXMl9ObxBSiajwZp9IM5wSL6BypsZ7ydBGYJhepdsvxvay/Z6aWa9CJ9LKqBDaAr2jv1fiJNKuToNhY9VvwX00PVN6Pa/D5xwds2dBEsbnrA79Oxb78USHWhomeEqlyeUE3wpuClC4K7as98JRHqeTV5tCC4ZZavg1UH7LdEXxbnm3nkyK+Gv5lW8ytAo5XPzdaLpu2RrR+yDwIZy+MobEBWspmLIq3oCMfcNjXdQxeeFTl+HJElS0kcXpWLRTPxGWDu4sfMqfc218w3WRay6UNxct1M/jFSj7tklBTS3xNJhstB3pT+p+f5oCZktBWB2u/hZME8PrDnBPZTHPCFfAGIfkyZMxmOaAtUQdPfVMDEun69aZinNSOnF4lIBQ+GWBg7hW2C1RKFolTnpH5TabJONNtvN3uGujY7tyvuXHdrrjRg/1N6oxOvwKrqiCiqciYQiCCudM6Ek="},{"id":"muq2txv4929c5b85","who":"a","at":"2026-10-01T21:59:16.912Z","pageCount":2,"readAt":"2026-10-02T00:59:16.912Z","enc":"M+6AMHmlVwpn2y0YsmKyGDJ3WAbWjwKsuaEAUyd1Rn/lR1N5WZzIk66YxHM+Ooh3yZN7Txv10wKaRe6iTje076Qy63tLYZrtIYwHVaCKQagjs9rNeXnXIqOmCNaDQqR3je8GgnpDtp0R8stTk1f97qXu5snY9hTh2cdUgKpHkw6SmU+KCS0WZq8OA9Xz+5nTzFWE7/ZxRQlVeKUdBqDbWpgusLHgY6TKlOF+4k/1SUjHlKIESvnrYC6sKANuKshpRtZT7U2edpTdl7u7ZpYG22Nl9J9qLdJZrRL77Sesupv/Svct/UTBKRe467w4NciUj2UTI4pidk0pItVb1i+thJZGdVtzYc2j3gzZvJvrvtqDt27rb+EsTGtHuqZJD03GDyHiBkAAzmJ84Pb8yUMFM7Nx1eAl1l995BcU4umtZkaGu83icLeQsM84Wr2ynG2ZlkMKf8+5IhqGll3K3wBKsNcdM73nNH4504VFTsa4GKwfJ64jXjb9L66hc05l6HASDTgoTXFILgEMMA34Y1omEQoC3eM2ZatMgTEfMJVg3P+zYRz8QAxG/l5eTAwuKnQEMs7kNGMDf0zJU2SNemLkobFFLlRrn3MswWDIE7pdg+vM9ie+HgHt3QoKNAsRQw0rH9adLNFqwbSidDmlSfzpC8PW+PPuQa/yOB5Im5mTrzkVcZ0hODEmrapiTCPUMCLLz3000y7oQWPALy3yuG2a/U5Ksp+DU4irHLcjfcNVxrAvaQKJ2TtLx/ElNrRPr001T7odYmkKxvI7fpOc3dvb///3+ad+h84gza/QdcsDq/5T6Ri4OifoJ9Vw3RmmbA2iQCYEcc+GLGICipGRLuLYhrDlh9MvTqp91eg8ul3dTx12og/DaWkcLIZSarIwlapoK44eZaMMaSWsNFNJHZfUSCejvwJMSEba8rHKAcfK+EbEOXT1VoHuN8ClHkWW1GPJUdQiPashpXdJpYj7fvP6lkAjpQf91m82GrFfhCo4PrPc83Y5V+wkxUuTutyy4Sb/franyUVoqr/V+OzJuZkWWyE2bJ01geQXynMa9E9xoBlz6Y5TLtMeBRnODiszpm3Vpgc7uXimlkhFZMZ4HrFEnmdXztanA/Pvpg=="},{"id":"muvhvjn4aaa3f9ae","who":"i","at":"2026-10-05T16:59:16.912Z","pageCount":1,"readAt":"2026-10-05T19:59:16.912Z","enc":"cedLmXSorAOHEKIn5kHcVOeaB3nufyILLWgsybfkWMhiNiw482Y0LnSIGwoXrIUo+mw0pNSWmqqfo/IQUt2q6TEIIcm1Z3IVJZrNGbk3UkIcO5D+iXnZ89oDvAM2Qt22e8IqyQXteWAJtgQvVjK0QKHbkbyQHUOt8vkAsc5ALRzlo+U/lcZiNsompjCnkXg2JBdz5R0JuxwlYwWjuxV4M6e50iNM23GbrEteDtN2mB4G5zeFCP7CuFMFq0xMuTG2qZ7Cv8n5brAjEoTyWgN00xJbFRoV+Mfdu7PzvCRVWMM4fM1D3e5iNz6QPbuE3SCOFn3RZWqSBLXqDrT1s2RQ+RxcSuMZ4EKu7E/Zayjof3R95nvVNNolVII/b1BLIDRY/Sq/ctv41E/BzCxnIOFaXTNKwSjlVheJoTe6B5X835qWwamZT1e8Ok9DmlzicrMS34fKV3ncF99culsCG+WFkMtboqeAN9YvDV2ZkmV6V6d7gNplacwwqjjuwpLp8GwgbMcZYdzxtcQz4Wr0tcBkapnnI3ef4ykrFRrH7Kc325Ij04XtcXKzIX0R6iyQQbCtbOW81lY7bzz98v1fS3l7AO4PJxQQevcE+IGtvl/8Rqk5CjcexZIp4M3lFSAabzG2ZM9KVtrY6m6STXEt/LlyF8pMbPq6TmMwl7p7Ycsk0gjbHtBAo0675o5rNPWrzN3zfOyOnSYgZUpFpa02XxCsRw=="},{"id":"mv0bhjn4beb08d53","who":"i","at":"2026-10-09T01:59:16.912Z","pageCount":1,"readAt":null,"enc":"Ikf8sSmNQW44YBEzLQI+1c+jYM26ego925GbB/v1X/EDYupW44YtWq9M70lcLE4LjDMoUoSmtGtdxadEKoQFF3IGXYXB4AFXBUckX3/OtylDYV4ihANoeT2HOu1EX/iFfGOwfC3ObGN5G3NSYjN+78TanM08Uv473iCjglLsZXFpCUUMTo7fQrSfKCXgirkBNc7czsYUhVj3jJvcj8+yflcTymUAja5n632bXn1SMj7Z+m6wP2nRBUKr4Szr0LF0/2onLVwS2NkqybnkzLxOeVAwhIZsp3v/EAkxga2Fh2yks0X7c7nO50nxP3LJD1CN/AlAXt7yhQY1ZFkrzxGGYjRXjEaLIgjMuY96n/UzTMdYS1yfsj+9yrYQtSLelDoW3X3nPAmc2GEiNjig+nUdeYJv3mqYr8sIfaweBkN6ttW+ZMidDMwkyap59t8JbFcQeG5mJJhMgulW8PymOaobKrWyNMgVm3dvtov0A4ov6JRWIJnkSnw="},{"id":"muub0c34fbbbc87c","who":"i","at":"2026-10-04T20:59:16.912Z","pageCount":1,"readAt":null,"kept":true,"releasedAt":null,"enc":"TU2EUEj+cZeP7cPzOC/o9uLmqqfHqPf0DNE7RvCHcjOIXoqlOf/IcA0Y26nNF1bQYCa/slkkI6lcHi8L1Hiho1dvQwOQUBIVY7QzKB6ji/XOyOaS9caa5hi54HPiIVmUpJbzo+o1ha+xHaU4NjYMm6Uqc83rJXtZqC+qddLLox781apUr958cJvyz6OQ1CsXc/LL7U4ri8h5Iaym6Mdum/KlsCBa"},{"id":"muy8gxf4a7fe35dc","who":"a","at":"2026-10-07T14:59:16.912Z","pageCount":1,"readAt":null,"kept":true,"releasedAt":null,"enc":"0IwPiFkXAJ1FMB1R4oixLEzmColv4kbifmHcJnj07LN7WpRG+3HilSmCrLWAwbh/STNwboPzxBEJWSEj95ThksN3J+CPsAdon8eZdgSCV4NZGZOEXsKLlGTwhgUlz1LEblFFlX1NsP7ILA5nDfchUp2QYfQigPqsiCearDYAFLok3JrSEW7ywM71blopnGu4NAcNfJFSyXPaVRKUUsCRvJDPX7vgMx9UgWiqJLL2vWFPzl8lrDNahi00BHEuI2F0K+MeapkE8EqIR06c6Lf4PUCi5mZBE8K5h8FEEjGx1oG53pQl9tv6vPteOQ=="}]};
  function seed(force) {
    if (!force && ls.get(KEY + "letters")) return;
    const shift = Date.now() - SEED.builtAt;      // keep "3 days ago" true whenever it's opened
    const letters = SEED.letters.map((L) => ({
      ...L,
      at: new Date(Date.parse(L.at) + shift).toISOString(),
      readAt: L.readAt && new Date(Date.parse(L.readAt) + shift).toISOString(),
    }));
    ls.set(KEY + "letters", JSON.stringify({ letters }));
    ls.set(KEY + "stickers", JSON.stringify({ stickers: [] }));
  }
  seed(false);

  window.spDemo = {
    reset() {
      try {
        Object.keys(localStorage).filter((k) => k.startsWith(KEY) || k.startsWith("sp.")).forEach((k) => localStorage.removeItem(k));
        sessionStorage.removeItem("sp.k");
      } catch {}
      Object.keys(mem).forEach((k) => delete mem[k]);
      seed(true);
      location.reload();
    },
  };

  /* ── the "network": route exactly like the http.createServer block does ── */
  function fakeRes() {
    let status = 200, headers = {}, body = "";
    const res = {
      headersSent: false,
      setHeader(k, v) { headers[k] = v; },
      writeHead(c, h) { status = c; Object.assign(headers, h || {}); res.headersSent = true; return res; },
      end(b) { body = b == null ? "" : String(b); res.done(); return res; },
    };
    res.result = new Promise((r) => { res.done = () => r(new Response(body, { status, headers })); });
    return res;
  }
  const authed = () => true;      // the lock below still checks the passphrase

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url, location.href);
    const method = (init.method || "GET").toUpperCase();
    const api = url.pathname.match(/\/api\/.*$/);
    const stk = url.pathname.match(/\/stickers\/([a-z0-9]+)\.enc$/);
    if (!api && !stk) return realFetch(input, init);

    const req = { method, body: init.body || "", headers: {} };
    const res = fakeRes();
    const pathname = api ? api[0] : "";
    const run = (fn) => { Promise.resolve(fn(req, res)).catch((e) => { if (!res.headersSent) json(res, 500, { error: "server" }); }); };

    if (stk) run((q, r) => serveSticker(q, r, stk[1]));
    else if (pathname === "/api/unlock" && method === "POST") {
      let pass = ""; try { pass = JSON.parse(req.body).pass; } catch {}
      await new Promise((r) => setTimeout(r, 250));
      json(res, pass === PASSPHRASE ? 200 : 401, pass === PASSPHRASE ? { ok: true } : { error: "nope" });
    }
    else if (pathname === "/api/letters" && method === "GET") run(letters);
    else if (pathname === "/api/letter" && method === "POST") run(addLetter);
    else if (pathname === "/api/read" && method === "POST") run(markRead);
    else if (pathname === "/api/release" && method === "POST") run(release);
    else if (pathname === "/api/stickers" && method === "GET") run(listStickers);
    else if (pathname === "/api/sticker" && method === "POST") run(addSticker);
    else if (pathname === "/api/sticker/delete" && method === "POST") run(delSticker);
    else json(res, 404, { error: "no such thing" });
    return res.result;
  };
})();
