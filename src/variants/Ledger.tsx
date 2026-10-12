import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  EDUCATION, EMAIL, LINKS, LOCATION, NAME, PRINCIPLES, PROFILE, PROJECTS, ROLES, ROLE_LINE, STACK,
  type Project,
} from "../data/site";
import { useApp } from "../lib/app";

/** Ledger — warm ink on paper, lifted from resume/build_resume.py (ink #1B1915,
 *  ochre #9A6210). The argument: a printed record. No cards, no grid; the work
 *  is a numbered index and a row unfolds to show itself. Nothing moves unless
 *  you ask it to. */

const rule = "border-t border-line";

function Contact() {
  const { copyEmail } = useApp();
  const items: { label: string; href?: string; onClick?: () => void }[] = [
    { label: EMAIL, onClick: copyEmail },
    { label: "github.com/Lone2000", href: LINKS.github },
    { label: "linkedin.com/in/muhammad-irfan-lone", href: LINKS.linkedin },
    { label: LOCATION },
  ];
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
      {items.map((it, i) => (
        <span key={it.label} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden="true" className="text-faint">·</span>}
          {it.href ? (
            <a href={it.href} rel="noopener" className="underline decoration-line underline-offset-4 transition-colors hover:text-fg hover:decoration-accent">
              {it.label}
            </a>
          ) : it.onClick ? (
            <button type="button" onClick={it.onClick} className="underline decoration-line underline-offset-4 transition-colors hover:text-fg hover:decoration-accent">
              {it.label}
            </button>
          ) : (
            <span>{it.label}</span>
          )}
        </span>
      ))}
    </p>
  );
}

/** The strip under the hero. The index below it is calm and rewards reading,
 *  which costs a click before anything moves — so the work gets to play first.
 *  The centred frame runs its launch film; the rest wait. */
function Strip({ onOpen }: { onOpen: (slug: string) => void }) {
  const reduce = useReducedMotion();
  const rail = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: 0 });

  // the leading frame is the leftmost one still on screen, not the centred one
  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    const edge = el.scrollLeft + pad + 8;
    let best = el.children.length - 1;
    for (let i = 0; i < el.children.length; i++) {
      const c = el.children[i] as HTMLElement;
      if (c.offsetLeft + c.offsetWidth > edge) { best = i; break; }
    }
    setActive(best);
  }, []);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    measure();
    let frame = 0;
    const on = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    el.addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", on);
      removeEventListener("resize", on);
    };
  }, [measure]);

  // a release outside the rail still has to end the drag
  useEffect(() => {
    const end = () => {
      if (!drag.current.down) return;
      drag.current.down = false;
      document.body.classList.remove("reel-grabbing");
    };
    addEventListener("pointerup", end);
    addEventListener("pointercancel", end);
    addEventListener("blur", end);
    return () => {
      removeEventListener("pointerup", end);
      removeEventListener("pointercancel", end);
      removeEventListener("blur", end);
      document.body.classList.remove("reel-grabbing");
    };
  }, []);

  const step = (d: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const i = Math.min(Math.max(active + d, 0), el.children.length - 1);
    (el.children[i] as HTMLElement | undefined)?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth", inline: "start", block: "nearest",
    });
  };

  return (
    <section aria-label="The work, playing" className="border-y border-line bg-surface py-8 md:py-10">
      <ul
        ref={rail}
        className="ledger-rail flex cursor-grab gap-4 overflow-x-auto pb-1 sm:gap-5"
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse") return;
          const el = rail.current;
          if (!el) return;
          drag.current = { down: true, startX: e.clientX, startLeft: el.scrollLeft, moved: 0 };
          document.body.classList.add("reel-grabbing");
        }}
        onPointerMove={(e) => {
          const el = rail.current;
          if (!drag.current.down || !el) return;
          const dx = e.clientX - drag.current.startX;
          drag.current.moved = Math.max(drag.current.moved, Math.abs(dx));
          el.scrollLeft = drag.current.startLeft - dx;
        }}
        onClickCapture={(e) => {
          if (drag.current.moved > 6) { e.preventDefault(); e.stopPropagation(); drag.current.moved = 0; }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
        }}
      >
        {PROJECTS.map((p, i) => (
          <StripFrame key={p.slug} p={p} n={i + 1} active={i === active} onOpen={() => onOpen(p.slug)} />
        ))}
      </ul>

      <div className="wrap mt-5 flex items-center justify-between gap-4">
        <p className="console-cell text-[13px] text-muted">
          <span className="font-semibold text-accent">{String(active + 1).padStart(2, "0")}</span>
          <span className="text-faint"> / {String(PROJECTS.length).padStart(2, "0")}</span>
          <span className="ml-3 hidden text-faint sm:inline">Drag, or use the arrows</span>
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => step(-1)} disabled={active === 0}
            className="grid size-9 place-items-center rounded-sm border border-line text-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-30"
            aria-label="Previous project">
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true"><path d="M12 4.5L6.5 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
          <button type="button" onClick={() => step(1)} disabled={active === PROJECTS.length - 1}
            className="grid size-9 place-items-center rounded-sm border border-line text-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-30"
            aria-label="Next project">
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true"><path d="M8 4.5L13.5 10 8 15.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>
    </section>
  );
}

function StripFrame({ p, n, active, onOpen }: { p: Project; n: number; active: boolean; onOpen: () => void }) {
  const reduce = useReducedMotion();
  const vid = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState(false);
  const [playing, setPlaying] = useState(false);
  // the launch film is the one made to be watched; fall back to the walkthrough
  const src = p.video ?? p.demoVideo;

  // mount the element first; playing it is a separate effect, because calling
  // play() in the same tick that flips `live` finds vid.current still null
  useEffect(() => {
    if (!src || reduce) return;
    if (active) { setLive(true); return; }
    vid.current?.pause();
    setPlaying(false);
  }, [active, src, reduce]);

  useEffect(() => {
    if (!live || !active || reduce) return;
    const v = vid.current;
    if (!v) return;
    let gone = false;
    v.play().then(() => { if (!gone) setPlaying(true); }).catch(() => {});
    return () => { gone = true; };
  }, [live, active, reduce]);

  return (
    <li
      className="shrink-0 basis-[82vw] transition-opacity duration-500 sm:basis-[46vw] lg:basis-[32vw]"
      style={{ opacity: reduce || active ? 1 : 0.5 }}
    >
      <button type="button" onClick={onOpen} className="group block w-full text-left"
        aria-label={`${p.name}. ${p.pitch} Open details`}>
        <div className="relative aspect-[16/10] overflow-hidden rounded-sm border border-line bg-raise">
          <img src={p.poster} alt="" loading="lazy" decoding="async" draggable={false}
            className="absolute inset-0 size-full object-cover" />
          {live && src && (
            <video ref={vid} src={src} muted loop playsInline preload="auto"
              className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${playing ? "opacity-100" : "opacity-0"}`} />
          )}
        </div>
        <div className="mt-3 flex items-baseline gap-2.5 px-0.5">
          <span className="console-cell text-[12px] font-semibold text-accent">{String(n).padStart(2, "0")}</span>
          <span className="truncate text-[15px] font-bold [font-stretch:84%]">{p.name}</span>
          <span className="ml-auto shrink-0 text-[12px] text-faint">{p.kind}</span>
        </div>
      </button>
    </li>
  );
}

/** The media in an opened row. Projects that have both a plain walkthrough and
 *  a launch film get a toggle; the walkthrough leads, because it explains the
 *  thing faster. Projects with one video or none fall back without a control. */
function RowMedia({ p }: { p: Project }) {
  const reduce = useReducedMotion();
  const both = !!p.demoVideo && !!p.video;
  const [cut, setCut] = useState<"demo" | "film">(p.demoVideo ? "demo" : "film");

  const src = cut === "demo" ? p.demoVideo : p.video;
  const poster = cut === "demo" ? (p.demoPoster ?? p.poster) : p.poster;

  return (
    <div>
      <div className="overflow-hidden rounded-sm border border-line bg-raise">
        {src ? (
          <video
            // remount on cut so the browser loads the other file and shows its poster
            key={src}
            src={src}
            poster={poster}
            controls
            muted
            loop
            playsInline
            preload="none"
            autoPlay={!reduce}
            className="block aspect-[16/9] w-full bg-black object-cover"
          />
        ) : (
          <img src={poster} alt="" loading="lazy" decoding="async" className="block aspect-[16/10] w-full object-cover" />
        )}
      </div>

      {both ? (
        <div role="tablist" aria-label={`${p.name} video`} className="mt-3 flex items-center gap-4 text-[13px]">
          {([["demo", "Demo"], ["film", "Launch film"]] as const).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={cut === id}
              onClick={() => setCut(id)}
              className={`border-b pb-0.5 transition-colors ${
                cut === id ? "border-accent text-accent" : "border-transparent text-muted hover:text-fg"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto text-[12px] text-faint">
            {cut === "demo" ? "A walkthrough of the real thing" : "Made for the launch post"}
          </span>
        </div>
      ) : (
        src && (
          <p className="mt-3 text-[12px] text-faint">
            {p.demoVideo ? "A walkthrough of the real thing" : "Made for the launch post"}
          </p>
        )
      )}
    </div>
  );
}

function Row({ p, n, onOpen }: { p: Project; n: number; onOpen: () => void }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);

  return (
    <li className={`${rule} ledger-row ${open ? "bg-surface" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group grid w-full grid-cols-[2.1rem_1fr_auto] items-baseline gap-x-3 gap-y-1 px-2 py-4 text-left sm:grid-cols-[2.6rem_1fr_11rem_4rem] sm:px-3 sm:py-5"
      >
        <span className="console-cell text-[13px] font-semibold text-accent">{String(n).padStart(2, "0")}</span>
        <span className="min-w-0">
          <span className="block text-[1.3rem] font-bold leading-tight [font-stretch:82%] sm:text-[1.5rem]">{p.name}</span>
          <span className="mt-1 block max-w-[52ch] text-[14px] leading-snug text-muted sm:hidden">{p.pitch}</span>
        </span>
        <span className="hidden text-[13px] text-muted sm:block">{p.kind}</span>
        <span className="console-cell justify-self-end text-[13px] text-faint">{p.year}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? undefined : { height: 0, opacity: 0 }}
            animate={reduce ? undefined : { height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="grid gap-6 px-2 pb-7 sm:grid-cols-[1.1fr_1fr] sm:gap-8 sm:px-3">
              <RowMedia p={p} />
              <div className="flex flex-col items-start">
                <p className="hidden max-w-[46ch] text-[17px] leading-relaxed sm:block">{p.pitch}</p>
                <p className="mt-0 max-w-[46ch] text-[15px] leading-relaxed text-muted sm:mt-4">
                  <span className="font-semibold text-fg">What is real. </span>{p.real}
                </p>
                <ul className="mt-4 flex flex-wrap gap-x-2 gap-y-1 text-[12px] text-muted">
                  {p.stack.map((s, i) => (
                    <li key={s} className="flex items-center gap-2">
                      {i > 0 && <span aria-hidden="true" className="text-faint">·</span>}
                      {s}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] font-semibold">
                  <a
                    href={p.href}
                    {...(p.external ? { rel: "noopener", target: "_blank" } : {})}
                    className="text-accent underline decoration-accent/40 underline-offset-[5px] transition-colors hover:decoration-accent"
                  >
                    {p.external ? "Open the live site" : "Open the demo"}
                  </a>
                  <button type="button" onClick={onOpen} className="text-muted underline decoration-line underline-offset-[5px] transition-colors hover:text-fg">
                    Details and video
                  </button>
                  {p.repo && (
                    <a href={`${LINKS.github}/${p.repo}`} rel="noopener" className="text-muted underline decoration-line underline-offset-[5px] transition-colors hover:text-fg">
                      Source
                    </a>
                  )}
                </div>
                {p.note && <p className="mt-4 text-[13px] text-faint">{p.note}</p>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function Section({ label, title, children }: { label: string; title?: string; children: React.ReactNode }) {
  return (
    <section className="wrap py-14 md:py-20">
      <p className="text-[11px] font-bold tracking-[0.18em] text-accent uppercase">{label}</p>
      {title && <h2 className="t-ledger-h2 mt-3 max-w-[22ch]">{title}</h2>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

export function Ledger() {
  const { openProject, copyEmail, toggleTheme, theme } = useApp();
  const automation = PROJECTS.filter((p) => p.group === "automation");
  const creative = PROJECTS.filter((p) => p.group === "creative");
  // numbering comes from the shared order in site.ts, not from position in a group
  const num = (p: Project) => PROJECTS.indexOf(p) + 1;

  return (
    <div className="min-h-dvh pb-24">
      <header className="wrap flex items-center justify-between gap-4 py-5">
        <a href="#top" className="text-[13px] font-bold tracking-[0.14em] uppercase">
          Irfan Lone
        </a>
        <div className="flex items-center gap-5 text-[13px]">
          <nav className="hidden items-center gap-5 sm:flex" aria-label="Sections">
            <a href="#work" className="text-muted transition-colors hover:text-fg">Work</a>
            <a href="#experience" className="text-muted transition-colors hover:text-fg">Experience</a>
            <a href={LINKS.resume} className="text-muted transition-colors hover:text-fg">Résumé</a>
          </nav>
          <button type="button" onClick={toggleTheme} className="text-muted transition-colors hover:text-fg" aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </header>

      <div className="h-px bg-accent" />

      <section id="top" className="wrap pt-8 pb-9 md:pt-12 md:pb-11">
        <h1 className="t-ledger-display max-w-[14ch] uppercase">{NAME}</h1>
        <p className="mt-5 max-w-[44ch] text-[15px] font-semibold text-accent">{ROLE_LINE}</p>
        <div className="mt-7 grid gap-7 md:grid-cols-[1.35fr_1fr] md:gap-14">
          <p className="max-w-[56ch] text-[clamp(1.05rem,1.5vw,1.25rem)] leading-relaxed">{PROFILE}</p>
          <div className="md:pt-1.5">
            <Contact />
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[14px] font-semibold">
              <a href="#work" className="text-accent underline decoration-accent/40 underline-offset-[5px] transition-colors hover:decoration-accent">
                Eleven live demos
              </a>
              <a href={LINKS.resume} className="text-muted underline decoration-line underline-offset-[5px] transition-colors hover:text-fg">
                Résumé PDF
              </a>
            </div>
          </div>
        </div>
      </section>

      <Strip onOpen={openProject} />

      <section id="work" className="wrap scroll-mt-10 pt-12 md:pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="t-ledger-h2">Selected work</h2>
          <p className="max-w-[40ch] text-[14px] text-muted">
            Open a row to see it. Every demo runs in your browser on invented data.
          </p>
        </div>

        <p className="mt-12 text-[11px] font-bold tracking-[0.18em] text-accent uppercase">Automation and AI agents</p>
        <ol className="mt-3">
          {automation.map((p) => (
            <Row key={p.slug} p={p} n={num(p)} onOpen={() => openProject(p.slug)} />
          ))}
        </ol>

        <p className="mt-14 text-[11px] font-bold tracking-[0.18em] text-accent uppercase">Creative web</p>
        <ol className="mt-3">
          {creative.map((p) => (
            <Row key={p.slug} p={p} n={num(p)} onOpen={() => openProject(p.slug)} />
          ))}
        </ol>
        <div className={rule} />
      </section>

      <Section label="How I work">
        <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
          {PRINCIPLES.map((p, i) => (
            <li key={p.title}>
              <p className="console-cell text-[13px] font-semibold text-accent">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 text-[1.35rem] font-bold leading-tight [font-stretch:80%]">{p.title}</h3>
              <p className="mt-3 max-w-[38ch] text-[15px] leading-relaxed text-muted">{p.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <section id="experience" className="wrap scroll-mt-10 border-t border-line py-14 md:py-20">
        <p className="text-[11px] font-bold tracking-[0.18em] text-accent uppercase">Experience</p>
        <ol className="mt-8">
          {ROLES.map((r) => (
            <li key={r.org} className={`${rule} grid gap-3 py-7 sm:grid-cols-[1fr_9rem] sm:gap-8`}>
              <div>
                <h3 className="text-[1.2rem] font-bold leading-tight [font-stretch:84%]">
                  {r.title} <span className="text-accent">· {r.org}</span>
                </h3>
                <p className="mt-1 text-[13px] italic text-muted">{r.place}</p>
                <ul className="mt-4 grid gap-2.5">
                  {r.points.map((pt) => (
                    <li key={pt} className="relative max-w-[70ch] pl-5 text-[15px] leading-relaxed before:absolute before:left-0 before:top-[0.62em] before:text-accent before:content-['•']">
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="console-cell text-[13px] text-faint sm:justify-self-end sm:text-right">
                <time>{r.start}</time> – <time>{r.end}</time>
              </p>
            </li>
          ))}
        </ol>
        <div className={`${rule} grid gap-3 py-7 sm:grid-cols-[1fr_9rem] sm:gap-8`}>
          <div>
            <h3 className="text-[1.2rem] font-bold leading-tight [font-stretch:84%]">
              {EDUCATION.degree} <span className="text-accent">· {EDUCATION.school}</span>
            </h3>
            <p className="mt-2 max-w-[70ch] text-[15px] leading-relaxed text-muted">{EDUCATION.detail}</p>
          </div>
          <p className="console-cell text-[13px] text-faint sm:justify-self-end sm:text-right">{EDUCATION.year}</p>
        </div>
        <div className={rule} />
        <p className="mt-6 max-w-[80ch] text-[13px] leading-relaxed text-muted">
          <span className="font-semibold text-fg">Tools. </span>
          {STACK.join(" · ")}
        </p>
      </section>

      <section id="contact" className="wrap scroll-mt-10 border-t border-line py-14 md:py-20">
        <p className="text-[11px] font-bold tracking-[0.18em] text-accent uppercase">Contact</p>
        <h2 className="t-ledger-h2 mt-3 max-w-[20ch]">Have something that needs building and someone to own it?</h2>
        <button type="button" onClick={copyEmail} className="group mt-8 block text-left" aria-label={`Copy my email address, ${EMAIL}`}>
          <span className="block break-all text-[clamp(1.5rem,4.4vw,3.1rem)] font-bold leading-tight [font-stretch:72%] text-accent underline decoration-accent/30 underline-offset-[7px] transition-[text-decoration-color] group-hover:decoration-accent">
            {EMAIL}
          </span>
          <span className="mt-3 block text-[14px] text-muted">Click to copy.</span>
        </button>
        <footer className="mt-14 border-t border-line pt-6 text-[13px] text-faint">
          <p>
            {NAME}, {new Date().getFullYear()}. Built with React, TypeScript, Tailwind and Motion, hosted on Hostinger.
            No trackers. The demos use invented data.
          </p>
        </footer>
      </section>
    </div>
  );
}
