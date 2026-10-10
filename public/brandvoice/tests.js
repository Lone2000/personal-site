/* A port of test_guardrails.py, run against the JavaScript port in guardrails.js.
 * Names and parametrize ids match the pytest -v output of the original suite.
 * Not ported: test_no_multi_account_or_evasion_code and
 * test_requirements_pull_in_no_browser_automation — both read the Python source files
 * and requirements.txt from disk, which don't exist in the browser.
 */
(function (root) {
  "use strict";
  const BV = root.BV;
  const { disclosure, Store, Brand, RateLimits } = BV;

  class AssertionError extends Error { constructor(m) { super(m); this.name = "AssertionError"; } }
  const assert = (cond, msg) => { if (!cond) throw new AssertionError(msg || "assertion failed"); };
  function raises(Err, pattern, fn) {
    try { fn(); } catch (e) {
      assert(e instanceof Err, `expected ${Err.name}, got ${e.name}`);
      assert(new RegExp(pattern).test(e.message), `"${pattern}" not found in: ${e.message}`);
      return;
    }
    throw new AssertionError(`DID NOT RAISE ${Err.name}`);
  }

  // fixtures
  const brand = () => new Brand({ name: "Acme Water", account: "acme_water_official",
    contact: "support@acme-water.example", relationship: "I work for Acme Water" });
  let t = 0;
  const store = () => new Store(() => 1760000000000 + (t += 1000));

  const T = [];
  const test = (name, fn) => T.push({ file: "test_guardrails.py", name, fn });
  const param = (name, values, fn) => values.forEach((v) => test(`${name}[${v}]`, () => fn(v)));

  // --- identity must be declared ---------------------------------------------
  param("test_brand_requires_every_identity_field", ["name", "account", "contact", "relationship"], (missing) => {
    const fields = { name: "Acme Water", account: "acme_water_official",
      contact: "support@acme-water.example", relationship: "I work for Acme Water" };
    fields[missing] = "";
    raises(BV.ValueError, missing, () => new Brand(fields));
  });

  test("test_account_handle_is_normalised", () => {
    const b = new Brand({ name: "A", account: "u/acme", contact: "c@x.example", relationship: "r" });
    assert(b.account === "acme", `account was ${b.account}`);
  });

  // --- disclosure cannot be dropped ------------------------------------------
  test("test_footer_is_attached", () => {
    const b = brand();
    const out = disclosure.attach("Hard water is usually a sizing problem.", b);
    assert(out.endsWith(disclosure.footer(b)));
  });

  test("test_footer_is_not_duplicated", () => {
    const b = brand();
    const once = disclosure.attach("body", b);
    const twice = disclosure.attach(once, b);
    assert(once === twice);
  });

  test("test_undisclosed_comment_fails_verification", () => {
    const [ok, reason] = disclosure.verify("Just a regular homeowner here, works great!", brand());
    assert(!ok);
    assert(reason.toLowerCase().includes("disclosure"));
  });

  test("test_stripped_footer_fails_verification", () => {
    const b = brand();
    const body = disclosure.attach("Useful answer.", b);
    const tampered = body.replace(disclosure.footer(b), "— hope that helps!");
    const [ok] = disclosure.verify(tampered, b);
    assert(!ok);
  });

  test("test_brand_name_must_survive_edits", () => {
    const body = "Answer.\n\n— I work for a water company. Happy to answer follow-ups: x@y.z";
    const [ok] = disclosure.verify(body, brand());
    assert(!ok);
  });

  test("test_whitespace_changes_do_not_break_verification", () => {
    const b = brand();
    const body = disclosure.attach("Answer.", b).replace("\n\n", "\n   \n ");
    const [ok] = disclosure.verify(body, b);
    assert(ok);
  });

  // --- a community must clear two independent gates --------------------------
  test("test_unscanned_sub_is_not_cleared", () => {
    const [cleared, reason] = store().isCleared("WaterTreatment");
    assert(!cleared);
    assert(reason.includes("check-rules"));
  });

  test("test_passing_scan_alone_does_not_clear", () => {
    const s = store();
    s.recordRuleScan("WaterTreatment", "pass", "vendors may answer with flair");
    const [cleared, reason] = s.isCleared("WaterTreatment");
    assert(!cleared, "a rule scan must never be sufficient on its own");
    assert(reason.includes("permission"));
  });

  test("test_permission_alone_does_not_clear_a_blocked_sub", () => {
    const s = store();
    s.recordRuleScan("BuyItForLife", "blocked", "no self-promotion");
    s.grantPermission("BuyItForLife", "https://example.test/modmail", "mod said ok");
    const [cleared, reason] = s.isCleared("BuyItForLife");
    assert(!cleared, "a posted rule outranks a recorded permission");
    assert(reason.includes("forbid"));
  });

  test("test_both_gates_clear_the_sub", () => {
    const s = store();
    s.recordRuleScan("WaterTreatment", "pass", "vendors may answer with flair");
    s.grantPermission("WaterTreatment", "https://example.test/modmail", "approved");
    const [cleared] = s.isCleared("WaterTreatment");
    assert(cleared);
  });

  test("test_revoking_permission_closes_the_sub", () => {
    const s = store();
    s.recordRuleScan("WaterTreatment", "pass", "ok");
    s.grantPermission("WaterTreatment", "https://example.test/m", "ok");
    s.revokePermission("WaterTreatment", "mod asked us to stop");
    const [cleared] = s.isCleared("WaterTreatment");
    assert(!cleared);
  });

  // --- the rule scan reads real prohibitions ---------------------------------
  param("test_prohibitions_are_detected", [
    "No self-promotion of any kind.",
    "Rule 3: no advertising or affiliate links.",
    "Self-promotion is prohibited without exception.",
    "Do not promote your own business here.",
    "Commercial posts are not allowed.",
  ], (ruleText) => {
    assert(BV.rules.FORBIDDING.some((p) => new RegExp(p).test(ruleText.toLowerCase())), ruleText);
  });

  param("test_conditional_language_is_detected", [
    "Vendors must disclose their affiliation and use the Industry flair.",
    "Industry professionals are welcome with mod approval.",
  ], (ruleText) => {
    assert(BV.rules.CONDITIONAL.some((p) => new RegExp(p).test(ruleText.toLowerCase())), ruleText);
  });

  // --- the audit trail actually records decisions ----------------------------
  test("test_review_decision_is_recorded_with_the_edited_text", () => {
    const s = store(); const b = brand();
    s.saveThread({ reddit_id: "abc123", subreddit: "WaterTreatment", title: "Iron staining in a new well?",
      body: "Help", permalink: "https://reddit.test/abc123", author: "someone", num_comments: 2, created_utc: 0.0 });
    const body = disclosure.attach("Get a water test first.", b);
    const draftId = s.saveDraft("abc123", body, disclosure.footer(b), false, "m");

    const edited = disclosure.attach("Get a water test before buying anything.", b);
    s.approveDraft(draftId, edited);

    const row = s.draft(draftId);
    assert(row.state === "approved");
    assert(row.reviewer_action === "approved_with_edit");
    assert(row.edited_body === edited);

    const events = s.audit.map((r) => r.event);
    assert(events.includes("drafted") && events.includes("review"));
  });

  test("test_rate_limits_are_recorded_verbatim", () => {
    const rl = new RateLimits({ replies_per_hour: 1, replies_per_day: 4, min_seconds_between_replies: 1800 });
    const record = rl.asRecord();
    assert(record.includes("1/hr") && record.includes("4/day") && record.includes("1800s"));
  });

  test("test_skip_reason_is_kept", () => {
    const s = store();
    s.saveThread({ reddit_id: "xyz", subreddit: "WaterFilter", title: "t", body: "",
      permalink: "p", author: "a", num_comments: 0, created_utc: 0.0 });
    const draftId = s.saveDraft("xyz", "b", "d", true, "m");
    s.skipDraft(draftId, "we don't actually know this");
    const row = s.draft(draftId);
    assert(row.state === "skipped");
    assert(row.skip_reason === "we don't actually know this");
  });

  // --- the drafter is told the right things ----------------------------------
  test("test_system_prompt_forbids_impersonation", () => {
    const low = BV.SYSTEM.toLowerCase();
    assert(low.includes("never claim to be a customer"));
    assert(low.includes("no personal anecdotes"));
    assert(low.includes("never invent"));
  });

  test("test_system_prompt_permits_declining_a_sale", () => {
    assert(BV.SYSTEM.includes("don't need a product") || BV.SYSTEM.includes("another company's product"));
  });

  // --- extra checks for this port (not in the original suite) ----------------
  const X = [];
  const extra = (name, fn) => X.push({ file: "port_checks.js", name, fn });
  const cfgFor = (env = {}) => BV.loadConfig({ brand: { name: "Acme Water", account: "acme_water_official",
    contact: "support@acme-water.example", relationship: "I work for Acme Water" }, rate_limits: {} }, env);
  function world() {
    let now = 1760000000000;
    const s = new Store(() => now);
    const cfg = cfgFor();
    const reddit = new BV.SimReddit({ meName: "acme_water_official", threads: s.threads });
    s.recordRuleScan("WaterTreatment", "pass", "ok");
    s.grantPermission("WaterTreatment", "https://example.test/m", "ok");
    const add = (id) => {
      s.saveThread({ reddit_id: id, subreddit: "WaterTreatment", title: `Question ${id}?`, permalink: id });
      const d = s.saveDraft(id, disclosure.attach("An answer.", cfg.brand), disclosure.footer(cfg.brand), false, "m");
      s.approveDraft(d, null); return d;
    };
    return { s, cfg, reddit, add, tick: (sec) => { now += sec * 1000; } };
  }

  extra("test_config_refuses_an_undeclared_reddit_username", () => {
    raises(BV.ValueError, "exactly one declared account", () => cfgFor({ REDDIT_USERNAME: "someone_else" }));
  });
  extra("test_connect_refuses_an_undeclared_authenticated_user", () => {
    const sim = new BV.SimReddit({ meName: "someone_else", threads: {} });
    raises(BV.RuntimeError, "Refusing to post under an undeclared account", () => BV.connect(cfgFor(), sim));
  });
  extra("test_hourly_limit_stops_a_second_reply", () => {
    const w = world(); const a = w.add("a1"), b = w.add("b1");
    assert(BV.publishOne(w.cfg, w.reddit, w.s, a).published.length === 1);
    const r = BV.publishOne(w.cfg, w.reddit, w.s, b);
    assert(r.stopped === "hourly limit reached (1/hr)", r.stopped);
    w.tick(3600);
    assert(BV.publishOne(w.cfg, w.reddit, w.s, b).published.length === 1);
  });
  extra("test_daily_limit_holds_after_four_replies", () => {
    const w = world();
    for (let i = 0; i < 4; i++) { assert(BV.publishOne(w.cfg, w.reddit, w.s, w.add(`d${i}`)).published.length === 1); w.tick(3600); }
    const r = BV.publishOne(w.cfg, w.reddit, w.s, w.add("d4"));
    assert(r.stopped === "daily limit reached (4/day)", r.stopped);
  });
  extra("test_second_reply_in_the_same_thread_is_blocked", () => {
    const w = world(); const a = w.add("t1");
    BV.publishOne(w.cfg, w.reddit, w.s, a); w.tick(3600);
    const d = w.s.saveDraft("t1", disclosure.attach("More.", w.cfg.brand), "", false, "m"); w.s.approveDraft(d, null);
    const r = BV.publishOne(w.cfg, w.reddit, w.s, d);
    assert(r.blocked[0] && r.blocked[0].reason === "already replied in this thread");
  });
  extra("test_unapproved_draft_is_never_published", () => {
    const w = world();
    w.s.saveThread({ reddit_id: "p1", subreddit: "WaterTreatment", title: "Pending?", permalink: "p" });
    const d = w.s.saveDraft("p1", disclosure.attach("x", w.cfg.brand), "", false, "m");
    const r = BV.publishOne(w.cfg, w.reddit, w.s, d);
    assert(!r.published.length && !w.s.published.length);
  });
  extra("test_edit_that_drops_the_footer_gets_it_back", () => {
    const cfg = cfgFor();
    const r = BV.review.edit(cfg, "old", "A shorter answer with the footer deleted.");
    assert(r.reattached && r.body.endsWith(disclosure.footer(cfg.brand)));
    assert(BV.disclosure.verify(r.body, cfg.brand)[0]);
  });
  extra("test_grant_permission_cannot_override_a_posted_rule", () => {
    const s = store();
    const [verdict, notes] = BV.rules.scanText("Rule 2: No self-promotion. Commercial accounts are not allowed.");
    assert(verdict === "blocked", verdict);
    s.recordRuleScan("SomeSub", verdict, notes);
    const r = BV.grantPermissionCmd(s, "SomeSub", "https://example.test/m", "ok");
    assert(!r.ok && s.clearance("SomeSub").permission === "none");
  });

  /** Run everything; returns [{file, name, ok, error, ms}]. */
  function run(which) {
    const list = which === "extra" ? X : T;
    return list.map(({ file, name, fn }) => {
      const t0 = performance.now();
      try { fn(); return { file, name, ok: true, ms: performance.now() - t0 }; }
      catch (e) { return { file, name, ok: false, error: `${e.name}: ${e.message}`, ms: performance.now() - t0 }; }
    });
  }

  root.BVTests = { run, count: () => T.length, extraCount: () => X.length };
})(typeof window !== "undefined" ? window : globalThis);
