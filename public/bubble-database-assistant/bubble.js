/* A stand-in for Bubble's Data API (/api/1.1/...), run in the browser over the
   Northwind seed data. It parses the real request URL (so whatever the MCP
   layer encodes is exactly what gets decoded here), checks the bearer token,
   applies Bubble's constraint semantics, then pages with cursor/limit and
   answers in Bubble's { response: { cursor, results, count, remaining } } shape. */
(function (root) {
  "use strict";

  const isEmpty = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
  const asCmp = (v) => {
    if (typeof v === "number") return v;
    if (typeof v === "boolean") return v ? 1 : 0;
    const n = Number(v);
    if (v !== "" && !isNaN(n) && !/[-:T]/.test(String(v))) return n;
    const t = Date.parse(v);
    return isNaN(t) ? String(v) : t;
  };
  const same = (a, b) => (typeof a === "boolean" || typeof b === "boolean" ? String(a) === String(b) : a === b || String(a) === String(b));

  class ConstraintError extends Error {}

  /* one constraint against one record, the way Bubble evaluates it */
  function matches(rec, c) {
    if (!c || typeof c.key !== "string" || typeof c.constraint_type !== "string") throw new ConstraintError("Each constraint needs a key and a constraint_type");
    const v = rec[c.key];
    const val = c.value;
    switch (c.constraint_type) {
      case "equals": return !isEmpty(v) && same(v, val);
      case "not equal": return isEmpty(v) || !same(v, val);
      case "is_empty": return isEmpty(v);
      case "is_not_empty": return !isEmpty(v);
      case "greater than": return !isEmpty(v) && asCmp(v) > asCmp(val);
      case "less than": return !isEmpty(v) && asCmp(v) < asCmp(val);
      case "in":
        if (!Array.isArray(val)) throw new ConstraintError("'in' needs a list value");
        return !isEmpty(v) && val.some((x) => same(v, x));
      case "not in":
        if (!Array.isArray(val)) throw new ConstraintError("'not in' needs a list value");
        return isEmpty(v) || !val.some((x) => same(v, x));
      case "text contains": return !isEmpty(v) && String(v).toLowerCase().includes(String(val).toLowerCase());
      case "not text contains": return isEmpty(v) || !String(v).toLowerCase().includes(String(val).toLowerCase());
      default: throw new ConstraintError("Unrecognized constraint_type: " + c.constraint_type);
    }
  }

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const err = (status, code, message) => ({ status, body: { statusCode: status, body: { status: code, message } } });

  function createServer({ db, meta, token, base }) {
    function handle({ method, url, headers }) {
      const res = route(method, url, headers || {});
      res.ms = 70 + (hash(method + url) % 190) + (res.body && res.body.response && res.body.response.results ? res.body.response.results.length : 0);
      res.statusText = { 200: "OK", 400: "Bad Request", 401: "Unauthorized", 404: "Not Found", 405: "Method Not Allowed" }[res.status] || "";
      return res;
    }
    function route(method, url, headers) {
      if (!url.startsWith(base)) return err(404, "NOT_FOUND", "Unknown app");
      if (headers.Authorization !== "Bearer " + token) return err(401, "UNAUTHORIZED", "Invalid or missing API token");
      const u = new URL(url);
      const path = u.pathname.replace(new URL(base).pathname, "");
      if (method !== "GET") return err(405, "METHOD_NOT_ALLOWED", "Only GET is simulated in this demo");
      if (path === "/api/1.1/meta") return { status: 200, body: meta };
      const m = path.match(/^\/api\/1\.1\/obj\/([a-z0-9_]+)(?:\/([0-9]+x[0-9]+))?$/);
      if (!m) return err(404, "NOT_FOUND", "No such endpoint");
      const type = m[1];
      if (!db[type]) return err(404, "NOT_FOUND", "Type " + type + " is not exposed on the Data API");
      const rows = db[type];
      if (m[2]) {
        const row = rows.find((x) => x._id === m[2]);
        return row ? { status: 200, body: { response: row } } : err(404, "NOT_FOUND", "Missing object of type " + type + ": object with id " + m[2] + " does not exist");
      }
      const q = u.searchParams; // decodes %XX exactly like Bubble does
      let constraints = [];
      if (q.has("constraints")) {
        try { constraints = JSON.parse(q.get("constraints")); } catch (e) { return err(400, "INVALID_DATA", "constraints is not valid JSON"); }
        if (!Array.isArray(constraints)) return err(400, "INVALID_DATA", "constraints must be a list");
      }
      const limit = Math.max(1, Math.min(100, parseInt(q.get("limit") || "100", 10) || 100)); // Bubble caps pages at 100
      const cursor = Math.max(0, parseInt(q.get("cursor") || "0", 10) || 0);
      let hits;
      try { hits = rows.filter((row) => constraints.every((c) => matches(row, c))); }
      catch (e) { if (e instanceof ConstraintError) return err(400, "INVALID_DATA", e.message); throw e; }
      const sortField = q.get("sort_field");
      if (sortField) {
        const desc = q.get("descending") === "true";
        hits = hits.slice().sort((a, b) => {
          const x = asCmp(a[sortField]), y = asCmp(b[sortField]);
          return (x < y ? -1 : x > y ? 1 : 0) * (desc ? -1 : 1);
        });
      }
      const results = hits.slice(cursor, cursor + limit);
      return { status: 200, body: { response: { cursor, results, count: results.length, remaining: Math.max(0, hits.length - cursor - results.length) } } };
    }
    return { handle };
  }

  root.BubbleSim = { createServer, matches, isEmpty };
})(typeof window !== "undefined" ? window : globalThis);
