import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  EDUCATION, EMAIL, LINKS, LOCATION, NAME, PRINCIPLES, PROFILE, PROJECTS, ROLES, STACK,
  type Project,
} from "../data/site";
import { isMac, useApp } from "../lib/app";

/** Console — the operator's readout. The argument: this person runs the work
 *  and built the machine, so show the machine. Monospace, tabular, sortable,
 *  keyboard first. Colour is one signal green and nothing else. */

type SortKey = "n" | "name" | "kind" | "year";
type Dir = "asc" | "desc";

const COLS: { key: SortKey; label: string; className: string }[] = [
  { key: "n", label: "#", className: "w-10 text-left" },
  { key: "name", label: "project", className: "text-left" },
  { key: "kind", label: "kind", className: "hidden md:table-cell text-left" },
  { key: "year", label: "yr", className: "hidden sm:table-cell text-right w-14" },
];

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const t = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour12: false });
  return (
    <span className="console-cell text-faint">
      PKT {t}
    </span>
  );
}

function Field({ k, v, accent = false }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-baseline gap-3 border-t border-line py-2 text-[13px] sm:grid-cols-[8rem_1fr]">
      <span className="text-faint uppercase">{k}</span>
      <span className={accent ? "text-accent" : "text-fg"}>{v}</span>
    </div>
  );
}

function Preview({ p }: { p: Project | null }) {
  const reduce = useReducedMotion();
  return (
    <div className="sticky top-6 hidden lg:block">
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2 text-[11px] text-faint">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
          preview
        </div>
        <div className="relative aspect-[16/10] bg-raise">
          <AnimatePresence initial={false} mode="wait">
            {p ? (
              <motion.img
                key={p.slug}
                src={p.poster}
                alt=""
                loading="lazy"
                decoding="async"
                initial={reduce ? undefined : { opacity: 0 }}
                animate={reduce ? undefined : { opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <motion.div key="idle" className="absolute inset-0 grid place-items-center text-[12px] text-faint">
                hover a row
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="min-h-[9.5rem] px-3 py-3">
          {p ? (
            <>
              <p className="text-[13px] text-fg">{p.name}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{p.pitch}</p>
              <p className="mt-3 text-[11px] leading-relaxed text-faint">{p.stack.join(" / ")}</p>
            </>
          ) : (
            <p className="text-[12px] text-faint">—</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function Console() {
  const { openProject, copyEmail, setPaletteOpen, toggleTheme, theme } = useApp();
  const [sort, setSort] = useState<SortKey>("n");
  const [dir, setDir] = useState<Dir>("asc");
  const [hover, setHover] = useState<Project | null>(null);
  const [filter, setFilter] = useState<"all" | "creative" | "automation">("all");

  const rows = useMemo(() => {
    const base = PROJECTS.map((p, i) => ({ p, n: i + 1 })).filter(
      (r) => filter === "all" || r.p.group === filter,
    );
    const by = (r: { p: Project; n: number }) =>
      sort === "n" ? r.n : sort === "name" ? r.p.name.toLowerCase() : sort === "kind" ? r.p.kind.toLowerCase() : r.p.year;
    return [...base].sort((a, b) => {
      const x = by(a), y = by(b);
      const c = x < y ? -1 : x > y ? 1 : 0;
      return dir === "asc" ? c : -c;
    });
  }, [sort, dir, filter]);

  const click = (k: SortKey) => {
    if (k === sort) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSort(k); setDir("asc"); }
  };

  return (
    <div className="min-h-dvh font-mono text-[14px]">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/88 backdrop-blur-md">
        <div className="wrap flex items-center justify-between gap-4 py-2.5 text-[12px]">
          <div className="flex items-center gap-3">
            <span className="text-fg">irfanlone</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap text-accent">
              <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              open to work
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block"><Clock /></span>
            <button type="button" onClick={toggleTheme} className="text-muted transition-colors hover:text-fg" aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
              {theme === "dark" ? "[light]" : "[dark]"}
            </button>
            <button type="button" onClick={() => setPaletteOpen(true)} className="whitespace-nowrap text-muted transition-colors hover:text-fg">
              <span className="hidden sm:inline">search </span>
              <span className="text-faint">{isMac ? "⌘K" : "^K"}</span>
            </button>
          </div>
        </div>
      </header>

      <section id="top" className="relative border-b border-line">
        {/* the grid is its own layer: masking the section would mask the text too */}
        <div className="console-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="wrap relative grid gap-10 py-14 md:grid-cols-[1.25fr_1fr] md:gap-14 md:py-20">
          <div>
            <p className="text-[13px] text-faint">
              <span className="text-accent">$</span> whoami
            </p>
            <h1 className="mt-3 text-[clamp(2rem,5.6vw,4rem)] leading-[1.02] font-bold tracking-tight text-fg">
              {NAME}
              <span className="console-caret ml-1 inline-block text-accent" aria-hidden="true">_</span>
            </h1>
            <p className="mt-6 max-w-[58ch] leading-relaxed text-muted">{PROFILE}</p>
            <div className="mt-8 flex flex-wrap gap-2 text-[13px]">
              <a href="#work" className="rounded-sm bg-accent px-4 py-2 font-semibold text-bg transition-opacity hover:opacity-85">
                ls ./work
              </a>
              <button type="button" onClick={copyEmail} className="rounded-sm border border-line px-4 py-2 text-muted transition-colors hover:border-line-strong hover:text-fg">
                mail {EMAIL}
              </button>
              <a href={LINKS.resume} className="rounded-sm border border-line px-4 py-2 text-muted transition-colors hover:border-line-strong hover:text-fg">
                cat resume.pdf
              </a>
            </div>
          </div>
          <div className="self-start md:pt-9">
            <Field k="role" v="Software Operations Manager" accent />
            <Field k="also" v="Creative developer, TypeScript / React / Three.js" />
            <Field k="location" v={LOCATION} />
            <Field k="demos" v={`${PROJECTS.length} live, all in-browser`} />
            <Field k="education" v={`${EDUCATION.degree}, CGPA 3.94`} />
            <div className="border-t border-line" />
          </div>
        </div>
      </section>

      <section id="work" className="wrap scroll-mt-14 py-12 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-tight">./work</h2>
            <p className="mt-2 max-w-[56ch] text-[13px] leading-relaxed text-muted">
              Click a row for details and the launch video. Sort by any column. The automation demos run the real
              logic, moved from the server into the page, on invented data.
            </p>
          </div>
          <div className="flex gap-1 text-[12px]">
            {(["all", "creative", "automation"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`rounded-sm border px-3 py-1.5 transition-colors ${
                  filter === f ? "border-accent text-accent" : "border-line text-muted hover:text-fg"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem] lg:gap-10">
          <div className="min-w-0 overflow-x-auto" onPointerLeave={() => setHover(null)}>
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Projects, sortable by number, name, kind or year</caption>
              <thead>
                <tr className="border-y border-line text-[11px] text-faint uppercase">
                  {COLS.map((c) => (
                    <th key={c.key} scope="col" className={`${c.className} py-2 font-normal`}>
                      <button
                        type="button"
                        onClick={() => click(c.key)}
                        aria-sort={sort === c.key ? (dir === "asc" ? "ascending" : "descending") : "none"}
                        className={`inline-flex items-center gap-1 transition-colors hover:text-fg ${sort === c.key ? "text-accent" : ""}`}
                      >
                        {c.label}
                        <span aria-hidden="true" className={sort === c.key ? "" : "opacity-0"}>
                          {dir === "asc" ? "↑" : "↓"}
                        </span>
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="w-24 py-2 text-right font-normal">open</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p, n }) => (
                  <tr
                    key={p.slug}
                    onPointerEnter={() => setHover(p)}
                    onFocus={() => setHover(p)}
                    className="group border-b border-line transition-colors hover:bg-surface focus-within:bg-surface"
                  >
                    <td className="console-cell py-3 align-top text-[12px] text-faint">{String(n).padStart(2, "0")}</td>
                    <td className="py-3 align-top">
                      <button type="button" onClick={() => openProject(p.slug)} className="text-left">
                        <span className="text-fg underline decoration-transparent underline-offset-4 transition-colors group-hover:decoration-line-strong">
                          {p.name}
                        </span>
                        <span className="mt-1 block max-w-[46ch] text-[12px] leading-snug text-muted md:hidden">{p.pitch}</span>
                      </button>
                    </td>
                    <td className="hidden py-3 align-top text-[12px] text-muted md:table-cell">{p.kind}</td>
                    <td className="console-cell hidden py-3 text-right align-top text-[12px] text-faint sm:table-cell">{p.year}</td>
                    <td className="py-3 text-right align-top">
                      <a
                        href={p.href}
                        {...(p.external ? { rel: "noopener", target: "_blank" } : {})}
                        className="text-[12px] text-accent transition-opacity hover:opacity-75"
                      >
                        {p.external ? "live ↗" : "run →"}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[11px] text-faint">
              {rows.length} of {PROJECTS.length} shown · sorted by {sort} {dir}
            </p>
          </div>
          <Preview p={hover} />
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="wrap grid gap-8 py-12 md:grid-cols-3 md:py-16">
          {PRINCIPLES.map((p, i) => (
            <div key={p.title}>
              <p className="text-[11px] text-accent">policy/{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 text-[1.05rem] leading-snug font-bold text-fg">{p.title}</h3>
              <p className="mt-2.5 max-w-[40ch] text-[13px] leading-relaxed text-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="experience" className="wrap scroll-mt-14 py-12 md:py-16">
        <h2 className="text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-tight">./experience</h2>
        <ol className="mt-8">
          {ROLES.map((r) => (
            <li key={r.org} className="border-t border-line py-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-[1rem] font-bold text-fg">
                  {r.title} <span className="text-accent">@ {r.org}</span>
                </h3>
                <p className="console-cell text-[12px] text-faint">
                  <time>{r.start}</time> → <time>{r.end}</time>
                </p>
              </div>
              <p className="mt-1 text-[12px] text-faint">{r.place} · {r.type.toLowerCase()}</p>
              <ul className="mt-4 grid gap-2">
                {r.points.map((pt) => (
                  <li key={pt} className="grid grid-cols-[1.1rem_1fr] gap-1 text-[13px] leading-relaxed text-muted">
                    <span aria-hidden="true" className="text-accent">·</span>
                    <span className="max-w-[78ch]">{pt}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
          <li className="border-y border-line py-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-[1rem] font-bold text-fg">
                {EDUCATION.degree} <span className="text-accent">@ {EDUCATION.school}</span>
              </h3>
              <p className="console-cell text-[12px] text-faint">{EDUCATION.year}</p>
            </div>
            <p className="mt-3 max-w-[78ch] text-[13px] leading-relaxed text-muted">{EDUCATION.detail}</p>
          </li>
        </ol>
        <p className="mt-8 max-w-[90ch] text-[12px] leading-relaxed text-muted">
          <span className="text-faint">$ </span>
          {STACK.join(" ")}
        </p>
      </section>

      <section id="contact" className="wrap scroll-mt-14 border-t border-line py-14 md:py-20">
        <h2 className="max-w-[26ch] text-[clamp(1.4rem,3vw,2.2rem)] leading-tight font-bold tracking-tight">
          Have something that needs building and someone to own it?
        </h2>
        <button type="button" onClick={copyEmail} className="group mt-8 flex max-w-full items-center gap-3 rounded-sm border border-line bg-surface px-4 py-3.5 text-left transition-colors hover:border-line-strong" aria-label={`Copy my email address, ${EMAIL}`}>
          <span className="text-accent">$</span>
          <span className="min-w-0 flex-1 truncate">
            <span className="text-muted">mail </span>
            {EMAIL}
          </span>
          <span className="shrink-0 rounded-sm bg-raise px-2 py-1 text-[11px] text-muted transition-colors group-hover:text-fg">copy</span>
        </button>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
          {[
            { label: "github", href: LINKS.github },
            { label: "linkedin", href: LINKS.linkedin },
            { label: "credly", href: LINKS.credly },
            { label: "resume.pdf", href: LINKS.resume },
          ].map((l) => (
            <a key={l.label} href={l.href} rel="noopener" className="text-muted transition-colors hover:text-accent">
              {l.label}
            </a>
          ))}
        </div>
        <footer className="mt-14 border-t border-line pt-6 text-[11px] leading-relaxed text-faint">
          <p>
            {NAME} · {new Date().getFullYear()} · React, TypeScript, Tailwind, Motion on Hostinger · no
            trackers · demo data is invented
          </p>
        </footer>
      </section>
    </div>
  );
}
