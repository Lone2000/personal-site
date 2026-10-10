/* BrandVoice guardrails, ported from the Python source to run in the browser.
 *
 *   config.py        Brand (identity required, handle normalised), RateLimits.as_record,
 *                    RedditAuth.user_agent, the REDDIT_USERNAME == brand.account check
 *   reddit_client.py connect(): refuses an authenticated user that isn't the declared one
 *   disclosure.py    footer / attach / verify
 *   rules.py         FORBIDDING + CONDITIONAL patterns, scan() verdicts and notes
 *   discovery.py     QUESTION_MARKERS, _asks_something, _topic_match, the thread filter
 *   db.py            Store: clearance (two gates), drafts, review decisions, published, audit
 *   publisher.py     _check_pace and the per-draft gates in publish_approved
 *   review.py        approve (verify first) / edit (re-attach footer) / skip (keep reason)
 *   drafter.py       SYSTEM prompt text (the drafter's rules; drafts here are pre-written)
 *
 * The Reddit API is never called. `SimReddit` stands in for PRAW and records what would
 * have been sent.
 */
(function (root) {
  "use strict";

  class ValueError extends Error { constructor(m) { super(m); this.name = "ValueError"; } }
  class RuntimeError extends Error { constructor(m) { super(m); this.name = "RuntimeError"; } }

  // Python's repr() for the plain strings these messages quote.
  function pyRepr(s) {
    s = String(s);
    if (s.includes("'") && !s.includes('"')) return `"${s}"`;
    return `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
  }
  const pyBool = (b) => (b ? "True" : "False");
  const rstrip = (s) => String(s).replace(/\s+$/u, "");

  // ---------------------------------------------------------------- config.py
  const IDENTITY_FIELDS = ["name", "account", "contact", "relationship"];

  class Brand {
    constructor({ name, account, contact, relationship } = {}) {
      this.name = name; this.account = account; this.contact = contact; this.relationship = relationship;
      const missing = IDENTITY_FIELDS.filter((f) => !String(this[f] ?? "").trim());
      if (missing.length) {
        throw new ValueError(
          "config.yaml: brand." + missing.join(", brand.") + " must be set. " +
          "Every comment names the company; there is no anonymous mode."
        );
      }
      // self.account.lstrip("/").removeprefix("u/")
      let acc = String(this.account).replace(/^\/+/, "");
      if (acc.startsWith("u/")) acc = acc.slice(2);
      this.account = acc;
    }
  }

  class RateLimits {
    constructor({ replies_per_hour = 1, replies_per_day = 4,
                  min_seconds_between_replies = 1800, one_reply_per_thread = true } = {}) {
      Object.assign(this, { replies_per_hour, replies_per_day, min_seconds_between_replies, one_reply_per_thread });
    }
    asRecord() {
      return `${this.replies_per_hour}/hr, ${this.replies_per_day}/day, ` +
        `${this.min_seconds_between_replies}s gap, ` +
        `one_per_thread=${pyBool(this.one_reply_per_thread)}`;
    }
  }

  function userAgent(username, brand) {
    return `python:brandvoice:2.0 (by /u/${username}) - ${brand.name} community support, contact ${brand.contact}`;
  }

  /** load_config(): identity first, then the one-declared-account check. */
  function loadConfig(raw, env) {
    const brand = new Brand(raw.brand || {});
    const username = env.REDDIT_USERNAME || "";
    if (username && username.toLowerCase() !== brand.account.toLowerCase()) {
      throw new ValueError(
        `REDDIT_USERNAME (${username}) does not match ` +
        `brand.account (${brand.account}) in config.yaml. ` +
        "BrandVoice posts as exactly one declared account."
      );
    }
    return {
      brand,
      expertise: raw.expertise || {},
      subreddits: raw.subreddits || [],
      thread_filter: Object.assign({ max_age_hours: 72, max_comments: 25, min_title_length: 20,
        require_question: true, skip_flairs: [] }, raw.thread_filter || {}),
      rate_limits: new RateLimits(raw.rate_limits || {}),
      reddit: { username },
      topicsFor(sub) {
        const s = this.subreddits.find((x) => x.name.toLowerCase() === String(sub).toLowerCase());
        return s ? s.topics : [];
      },
    };
  }

  // ---------------------------------------------------------- reddit_client.py
  /** connect(): the authenticated user must be the declared brand account. */
  function connect(cfg, sim) {
    const me = sim.me();
    if (!me) throw new RuntimeError("Reddit returned no authenticated user — check credentials");
    if (me.name.toLowerCase() !== cfg.brand.account.toLowerCase()) {
      throw new RuntimeError(
        `Authenticated as u/${me.name} but config.yaml declares ` +
        `u/${cfg.brand.account}. Refusing to post under an undeclared account.`
      );
    }
    return sim;
  }

  // ------------------------------------------------------------- disclosure.py
  const disclosure = {
    footer(brand) {
      return `— ${brand.relationship}. Happy to answer follow-ups: ${brand.contact}`;
    },
    attach(body, brand) {
      body = rstrip(body);
      const f = disclosure.footer(brand);
      if (body.endsWith(f)) return body;
      return `${body}\n\n${f}`;
    },
    normalise(text) {
      return String(text).replace(/\s+/gu, " ").trim().toLowerCase();
    },
    verify(body, brand) {
      const norm = disclosure.normalise(body);
      if (!norm.includes(disclosure.normalise(disclosure.footer(brand)))) {
        return [false,
          "disclosure footer is missing or was altered. Expected the comment to " +
          `end with: ${pyRepr(disclosure.footer(brand))}`];
      }
      if (!norm.includes(disclosure.normalise(brand.name))) {
        return [false, `the brand name ${pyRepr(brand.name)} does not appear in the comment`];
      }
      return [true, "disclosure present"];
    },
  };

  // ------------------------------------------------------------------ rules.py
  const FORBIDDING = [
    "no self[- ]promo",
    "no promotion",
    "no advertis",
    "no soliciting",
    "no vendors?",
    "zero tolerance for (?:spam|promotion|advertis)",
    "(?:self[- ]promotion|advertising|promotion) (?:is )?(?:not allowed|prohibited|banned|forbidden)",
    "do not (?:promote|advertise|link to your)",
    "affiliate links? (?:are )?(?:not allowed|prohibited|banned)",
    "no business accounts?",
    "commercial (?:posts?|accounts?|content) (?:are )?(?:not allowed|prohibited|banned)",
  ];
  const CONDITIONAL = [
    "must disclose",
    "disclose (?:your )?(?:affiliation|relationship|conflict)",
    "vendors? (?:must|should|may)",
    "industry (?:professionals?|members?)",
    "flair (?:your|yourself)",
    "with (?:mod|moderator) (?:approval|permission)",
    "ask (?:the )?mods",
  ];
  const reSearch = (p, s) => new RegExp(p).exec(s);

  const rules = {
    FORBIDDING, CONDITIONAL,
    /** _rule_text(): each rule "short_name description", then the sidebar text. */
    ruleText(sub) {
      const parts = (sub.rules || []).map((r) => `${r.short_name} ${r.description || ""}`);
      if (sub.public_description) parts.push(sub.public_description);
      return parts.join("\n");
    },
    /** scan() after the fetch: (verdict, notes). Can only ever block. */
    scanText(text) {
      if (!String(text).trim()) return ["unclear", "no rules or sidebar text published"];
      const low = text.toLowerCase();
      const hits = FORBIDDING.filter((p) => reSearch(p, low));
      if (hits.length) {
        let snippet = "";
        const m = reSearch(hits[0], low);
        if (m) {
          const start = Math.max(0, m.index - 60);
          snippet = text.slice(start, m.index + m[0].length + 60).replace(/\n/g, " ").trim();
        }
        return ["blocked", `rules forbid promotion (${pyRepr(snippet)})`];
      }
      const conditional = CONDITIONAL.filter((p) => reSearch(p, low));
      if (conditional.length) {
        return ["pass",
          "rules address vendor participation with conditions " +
          `(${conditional.length} matching clauses) — read them, then get mod sign-off`];
      }
      return ["unclear",
        "rules do not mention vendors either way — ask the mods in modmail " +
        "before participating"];
    },
    /** Display helper (not in the source): where each pattern matched, for highlighting. */
    spans(text) {
      const low = text.toLowerCase(); const out = [];
      for (const [kind, list] of [["forbid", FORBIDDING], ["cond", CONDITIONAL]]) {
        for (const p of list) {
          const re = new RegExp(p, "g"); let m;
          while ((m = re.exec(low))) { out.push({ kind, start: m.index, end: m.index + m[0].length, p }); if (!m[0].length) re.lastIndex++; }
        }
      }
      return out.sort((a, b) => a.start - b.start);
    },
  };

  // -------------------------------------------------------------- discovery.py
  const QUESTION_MARKERS = new RegExp(
    "\\?|^(?:how|what|why|which|should|can|could|would|is|are|do|does|did|" +
    "any(?:one|body)|help|advice|looking for|need)\\b", "i");

  const discovery = {
    asksSomething(title, body) {
      if (QUESTION_MARKERS.test(title.trim())) return true;
      const firstLines = String(body || "").trim().split(/\r?\n/).slice(0, 6).join("\n");
      return QUESTION_MARKERS.test(firstLines);
    },
    topicMatch(title, body, topics) {
      const hay = `${title}\n${body}`.toLowerCase();
      for (const t of topics) if (hay.includes(t.toLowerCase())) return t;
      return null;
    },
    /** The body of scan()'s per-post loop. Returns { keep, reason, topic }.
     *  The source just `continue`s; the reasons are spelled out here for display. */
    filter(post, tf, topics, nowSec) {
      if (post.stickied || post.locked) return { keep: false, reason: "stickied or locked" };
      if (post.over_18) return { keep: false, reason: "marked NSFW" };
      const flair = post.link_flair_text || "";
      if (flair && tf.skip_flairs.includes(flair)) return { keep: false, reason: `flair "${flair}" is in skip_flairs` };
      const age = (nowSec - post.created_utc) / 3600;
      if (age > tf.max_age_hours) return { keep: false, reason: `${Math.round(age)}h old > max_age_hours ${tf.max_age_hours}` };
      if (post.num_comments > tf.max_comments) return { keep: false, reason: `${post.num_comments} comments > max_comments ${tf.max_comments}` };
      if (post.title.length < tf.min_title_length) return { keep: false, reason: `title is ${post.title.length} chars < min_title_length ${tf.min_title_length}` };
      const body = post.selftext || "";
      if (tf.require_question && !discovery.asksSomething(post.title, body)) return { keep: false, reason: "doesn't ask anything (require_question)" };
      const topic = discovery.topicMatch(post.title, body, topics);
      if (topics.length && !topic) return { keep: false, reason: "no configured topic matches" };
      return { keep: true, reason: "kept", topic };
    },
  };

  // --------------------------------------------------------------------- db.py
  /** In-memory Store with the same rules as db.py. `clock()` returns epoch ms, so the demo
   *  can fast-forward time. (db.py compares SQLite's "YYYY-MM-DD HH:MM:SS" against an
   *  isoformat() cutoff as text; here timestamps are compared as numbers.) */
  class Store {
    constructor(clock, data) {
      this.clock = clock || (() => Date.now());
      const d = data || {};
      this.clearances = d.clearances || {};
      this.threads = d.threads || {};
      this.drafts = d.drafts || [];
      this.published = d.published || [];
      this.audit = d.audit || [];
      this.seq = d.seq || { draft: 0, published: 0 };
    }
    toJSON() {
      const { clearances, threads, drafts, published, audit, seq } = this;
      return { clearances, threads, drafts, published, audit, seq };
    }
    now() { return this.clock(); }
    iso(ms) { return new Date(ms ?? this.now()).toISOString().replace(/\.\d{3}Z$/, "+00:00"); }

    // audit
    log(event, subject = "", detail = "") {
      this.audit.push({ at: this.now(), event, subject, detail });
    }
    exportAudit() {
      const rows = this.audit.map((r) => [r.at, r.event, r.subject, r.detail])
        .concat(this.published.map((p) => [p.published_at, "published", p.thread_id, `${p.permalink} :: ${p.final_body}`]));
      rows.sort((a, b) => a[0] - b[0]);
      return rows.map((r) => [this.iso(r[0]), r[1], r[2], r[3]]);
    }

    // clearance
    _key(name) { return String(name).toLowerCase(); }
    recordRuleScan(name, verdict, notes) {
      const k = this._key(name);
      const row = this.clearances[k] || { name, permission: "none", evidence_url: null, permission_note: null, granted_at: null };
      Object.assign(row, { rule_scan: verdict, rule_notes: notes, checked_at: this.now() });
      this.clearances[k] = row;
      this.log("rule_scan", name, `${verdict}: ${notes}`);
    }
    grantPermission(name, evidenceUrl, note) {
      const k = this._key(name);
      const row = this.clearances[k] || { name, rule_scan: "unclear", rule_notes: null, checked_at: null };
      Object.assign(row, { permission: "granted", evidence_url: evidenceUrl, permission_note: note, granted_at: this.now() });
      this.clearances[k] = row;
      this.log("permission_granted", name, `${evidenceUrl} :: ${note}`);
    }
    revokePermission(name, reason) {
      const row = this.clearances[this._key(name)];
      if (row) { row.permission = "none"; row.permission_note = reason; }
      this.log("permission_revoked", name, reason);
    }
    clearance(name) { return this.clearances[this._key(name)] || null; }
    isCleared(name) {
      const row = this.clearance(name);
      if (!row) return [false, "no rule scan yet — run check-rules"];
      if (row.rule_scan === "blocked") return [false, `rules forbid it: ${row.rule_notes}`];
      if (row.permission !== "granted") return [false, "no moderator permission on file — run grant-permission"];
      return [true, "cleared"];
    }

    // threads
    saveThread(t) {
      if (this.threads[t.reddit_id]) return false;
      this.threads[t.reddit_id] = Object.assign({ body: "", author: "", num_comments: 0, created_utc: 0 }, t,
        { found_at: this.now(), state: "found" });
      return true;
    }
    seenThread(id) { return !!this.threads[id]; }
    setThreadState(id, state) { if (this.threads[id]) this.threads[id].state = state; }
    hasRepliedTo(threadId) { return this.published.some((p) => p.thread_id === threadId); }

    // drafts
    saveDraft(threadId, body, disclosureLine, recommendsOwnProduct, model) {
      const id = ++this.seq.draft;
      this.drafts.push({ id, thread_id: threadId, body, disclosure: disclosureLine,
        recommends_own_product: recommendsOwnProduct ? 1 : 0, model, drafted_at: this.now(),
        state: "pending", reviewer_action: null, reviewed_at: null, edited_body: null, skip_reason: null });
      this.setThreadState(threadId, "drafted");
      this.log("drafted", threadId, `model=${model}`);
      return id;
    }
    draft(id) { return this.drafts.find((d) => d.id === id) || null; }
    _joined(d) {
      const t = this.threads[d.thread_id] || {};
      return Object.assign({}, d, { title: t.title, permalink: t.permalink, subreddit: t.subreddit, thread_body: t.body });
    }
    pendingDrafts() { return this.drafts.filter((d) => d.state === "pending").map((d) => this._joined(d)); }
    approvedDrafts() {
      return this.drafts.filter((d) => d.state === "approved")
        .sort((a, b) => a.reviewed_at - b.reviewed_at).map((d) => this._joined(d));
    }
    approveDraft(id, editedBody) {
      const action = editedBody ? "approved_with_edit" : "approved_as_drafted";
      Object.assign(this.draft(id), { state: "approved", reviewer_action: action, reviewed_at: this.now(), edited_body: editedBody || null });
      this.log("review", `draft:${id}`, action);
    }
    skipDraft(id, reason) {
      Object.assign(this.draft(id), { state: "skipped", reviewer_action: "skipped", reviewed_at: this.now(), skip_reason: reason });
      this.log("review", `draft:${id}`, `skipped: ${reason}`);
    }
    recordPublished({ draft_id, thread_id, comment_id, permalink, final_body, as_account, rate_limits }) {
      this.published.push({ id: ++this.seq.published, draft_id, thread_id, comment_id, permalink,
        final_body, as_account, rate_limits, published_at: this.now() });
      this.draft(draft_id).state = "published";
    }

    // pacing
    publishedSince(hours, at) {
      const cutoff = (at ?? this.now()) - hours * 3600e3;
      return this.published.filter((p) => p.published_at > cutoff).length;
    }
    secondsSinceLastPublish(at) {
      if (!this.published.length) return null;
      const last = Math.max(...this.published.map((p) => p.published_at));
      return ((at ?? this.now()) - last) / 1000;
    }
    counts() {
      const n = (s) => this.drafts.filter((d) => d.state === s).length;
      return {
        threads_found: Object.keys(this.threads).length,
        pending_review: n("pending"), approved: n("approved"), skipped: n("skipped"),
        published: this.published.length, published_24h: this.publishedSince(24),
      };
    }
  }

  // -------------------------------------------------------------- publisher.py
  function checkPace(cfg, store, at) {
    const rl = cfg.rate_limits;
    if (store.publishedSince(1, at) >= rl.replies_per_hour) return [false, `hourly limit reached (${rl.replies_per_hour}/hr)`];
    if (store.publishedSince(24, at) >= rl.replies_per_day) return [false, `daily limit reached (${rl.replies_per_day}/day)`];
    const gap = store.secondsSinceLastPublish(at);
    if (gap !== null && gap < rl.min_seconds_between_replies) {
      const wait = Math.trunc(rl.min_seconds_between_replies - gap);
      return [false, `${wait}s still to wait before the next reply`];
    }
    return [true, "within limits"];
  }

  /** Not in the source: the earliest time _check_pace would pass, found by evaluating the
   *  same check at each moment a window can open. */
  function nextAllowed(cfg, store) {
    const now = store.now();
    if (checkPace(cfg, store, now)[0]) return now;
    const cands = [];
    for (const p of store.published) {
      cands.push(p.published_at + 3600e3, p.published_at + 86400e3, p.published_at + cfg.rate_limits.min_seconds_between_replies * 1000);
    }
    for (const t of cands.filter((t) => t > now).sort((a, b) => a - b)) if (checkPace(cfg, store, t)[0]) return t;
    return null;
  }

  /** One pass of publish_approved()'s loop for one approved draft, gates in source order:
   *  pace (stops the run) → disclosure → clearance → one per thread → locked/archived → reply. */
  function publishOne(cfg, reddit, store, draftId) {
    const draft = store.approvedDrafts().find((d) => d.id === draftId);
    const result = { published: [], blocked: [], stopped: null };
    if (!draft) return result; // "Nothing approved and waiting."
    const body = draft.edited_body || draft.body;
    const threadId = draft.thread_id;

    let [ok, reason] = checkPace(cfg, store);
    if (!ok) { result.stopped = reason; return result; }

    [ok, reason] = disclosure.verify(body, cfg.brand);
    if (!ok) {
      result.blocked.push({ draft_id: draft.id, reason });
      store.log("publish_blocked", `draft:${draft.id}`, reason);
      return result;
    }

    let cleared;
    [cleared, reason] = store.isCleared(draft.subreddit);
    if (!cleared) {
      result.blocked.push({ draft_id: draft.id, reason: `r/${draft.subreddit} not cleared: ${reason}` });
      store.log("publish_blocked", `draft:${draft.id}`, reason);
      return result;
    }

    if (cfg.rate_limits.one_reply_per_thread && store.hasRepliedTo(threadId)) {
      result.blocked.push({ draft_id: draft.id, reason: "already replied in this thread" });
      store.log("publish_blocked", `draft:${draft.id}`, "duplicate thread");
      return result;
    }

    const submission = reddit.submission(threadId);
    if (submission.locked || submission.archived) {
      result.blocked.push({ draft_id: draft.id, reason: "thread is locked or archived" });
      return result;
    }
    const comment = submission.reply(body);
    const permalink = `https://www.reddit.com${comment.permalink}`;
    store.recordPublished({ draft_id: draft.id, thread_id: threadId, comment_id: comment.id, permalink,
      final_body: body, as_account: cfg.brand.account, rate_limits: cfg.rate_limits.asRecord() });
    store.log("published", threadId, permalink);
    result.published.push({ draft_id: draft.id, permalink });
    return result;
  }

  // ------------------------------------------------------------------- main.py
  /** cmd_grant_permission(): a posted rule outranks a modmail yes. */
  function grantPermissionCmd(store, sub, evidence, note) {
    const verdict = store.clearance(sub);
    if (verdict && verdict.rule_scan === "blocked") {
      return { ok: false, lines: [`r/${sub} is blocked by its own rules: ${verdict.rule_notes}`,
        "Permission cannot override a posted rule. Ask the mods to amend it, then re-run check-rules."] };
    }
    store.grantPermission(sub, evidence, note || "");
    return { ok: true, lines: [`Permission recorded for r/${sub}`, `  evidence: ${evidence}`] };
  }

  // ----------------------------------------------------------------- review.py
  const review = {
    /** "a": verify before approving; the reviewer cannot approve an undisclosed reply. */
    approve(cfg, store, draft, body) {
      const [ok, reason] = disclosure.verify(body, cfg.brand);
      if (!ok) return { ok: false, reason: `Cannot approve: ${reason}` };
      const edited = body !== draft.body ? body : null;
      store.approveDraft(draft.id, edited);
      return { ok: true, action: edited ? "approved_with_edit" : "approved_as_drafted" };
    },
    /** "e": whatever came back from the editor gets the footer re-attached. */
    edit(cfg, body, newBody) {
      if (!newBody || !newBody.trim()) return { body, reattached: false };
      const trimmed = newBody.trim();
      const out = disclosure.attach(trimmed, cfg.brand);
      return { body: out, reattached: out !== rstrip(trimmed) };
    },
    skip(store, draft, reason) {
      store.skipDraft(draft.id, (reason || "").trim() || "no reason given");
    },
  };

  // ---------------------------------------------------------------- drafter.py
  const SYSTEM = `You are writing a Reddit comment on behalf of {brand_name}, posting from the company's own clearly-labelled account u/{brand_account}. Readers can see you are the company. Write accordingly.

What you know:
{expertise_summary}

You can speak to:
{can_speak_to}

You must NOT answer on:
{must_not_speak_to}
For anything in that list, say it is outside what you can advise on and point to the right kind of professional.

Hard rules:
1. Never claim to be a customer, a homeowner, a hobbyist, or any private individual. You have no personal anecdotes. "We've seen this in the field" is fine; "I had this problem in my basement" is a lie.
2. Never invent a number, a test result, a price, or a spec. If a figure would help and you don't have it, say what you'd need to know instead.
3. Answer the question that was asked before mentioning anything you sell. If the honest answer is that they don't need a product, or that a cheaper fix or another company's product suits them better, say that plainly.
4. Mention your own product only when it is a direct answer to what they asked. No links unless they asked for one.
5. No pressure, no urgency, no discount codes, no "DM me".
6. Under {max_words} words. Plain sentences. No marketing voice.
7. Don't repeat advice already given in the thread — add to it or correct it.

Return JSON only:
{{
  "reply": "the comment text, without any sign-off or disclosure line",
  "recommends_own_product": true | false,
  "basis": "one sentence on what you grounded the answer in",
  "declined": true | false,
  "declined_reason": "if declined, why this thread isn't ours to answer"
}}

Set "declined": true rather than writing something thin. A skipped thread costs nothing; a wrong or empty answer from a company account costs trust.
`;

  // ------------------------------------------------------- simulated Reddit API
  /** Stands in for PRAW. Nothing leaves the page; each call is recorded for the log. */
  class SimReddit {
    constructor({ meName, threads, onCall }) {
      this.meName = meName; this.threads = threads; this.onCall = onCall || (() => {});
    }
    me() { this.onCall({ method: "GET", path: "/api/v1/me", status: 200, res: { name: this.meName } }); return { name: this.meName }; }
    submission(id) {
      const t = this.threads[id] || {};
      const self = this;
      return {
        id, locked: !!t.locked, archived: !!t.archived,
        reply(text) {
          const cid = SimReddit.commentId(id, text);
          const slug = String(t.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
          const permalink = `/r/${t.subreddit}/comments/${id}/${slug}/${cid}/`;
          self.onCall({ method: "POST", path: "/api/comment", status: 200,
            form: { api_type: "json", thing_id: `t3_${id}`, text }, res: { id: `t1_${cid}`, permalink } });
          return { id: cid, permalink };
        },
      };
    }
    static commentId(id, text) {
      let h = 2166136261;
      for (const c of id + "|" + text) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
      return ("o" + h.toString(36)).slice(0, 7);
    }
  }

  root.BV = { ValueError, RuntimeError, pyRepr, Brand, RateLimits, userAgent, loadConfig, connect,
    disclosure, rules, discovery, Store, checkPace, grantPermissionCmd, nextAllowed, publishOne, review, SYSTEM, SimReddit };
})(typeof window !== "undefined" ? window : globalThis);
