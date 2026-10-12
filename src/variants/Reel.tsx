import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  EDUCATION, EMAIL, LINKS, NAME, PRINCIPLES, PROFILE, PROJECTS, ROLES, STACK,
  type Project,
} from "../data/site";
import { useApp } from "../lib/app";

/** Reel — media first. The argument for the creative-developer job: the work is
 *  visual, so give it the whole screen and let the visitor handle it. One
 *  draggable rail, the centred frame plays, everything else gets out of the way. */

function Frame({
  p, active, onOpen,
}: { p: Project; active: boolean; onOpen: () => void }) {
  const reduce = useReducedMotion();
  const vid = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState(false);
  const [playing, setPlaying] = useState(false);

  // mount first, play in a second effect: play() in the same tick that flips
  // `live` finds vid.current still null and the rejection is swallowed
  useEffect(() => {
    if (!p.video || reduce) return;
    if (active) { setLive(true); return; }
    vid.current?.pause();
    setPlaying(false);
  }, [active, p.video, reduce]);

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
      className="shrink-0 basis-[78vw] transition-opacity duration-500 sm:basis-[56vw] lg:basis-[42vw] xl:basis-[34vw]"
      style={{ opacity: reduce || active ? 1 : 0.42 }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="group block w-full text-left"
        aria-label={`${p.name}. ${p.pitch} Open details`}
      >
        <motion.div
          animate={reduce ? undefined : { scale: active ? 1 : 0.93 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface sm:aspect-[16/11]"
        >
          <img
            src={p.poster}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 size-full object-cover"
          />
          {live && p.video && (
            <video
              ref={vid}
              src={p.video}
              muted
              loop
              playsInline
              preload="auto"
              className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${playing ? "opacity-100" : "opacity-0"}`}
            />
          )}
          <span className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/70 to-transparent" aria-hidden="true" />
          <span className="absolute bottom-3 left-4 text-[12px] font-semibold tracking-wide text-white/85 uppercase">
            {p.external ? "Live site" : "Live demo"} · {p.kind}
          </span>
        </motion.div>
        <div className="mt-4 flex items-baseline justify-between gap-4">
          <h3 className="text-[clamp(1.3rem,2.2vw,1.9rem)] leading-none font-extrabold [font-stretch:70%]">{p.name}</h3>
          <span className="console-cell shrink-0 text-[12px] text-faint">{p.year}</span>
        </div>
        <p className="mt-2 max-w-[44ch] text-[14px] leading-snug text-muted">{p.pitch}</p>
      </button>
    </li>
  );
}

function Rail({ onOpen }: { onOpen: (slug: string) => void }) {
  const reduce = useReducedMotion();
  const rail = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: 0 });

  // the badge that follows the pointer across the rail
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 520, damping: 42, mass: 0.35 });
  const sy = useSpring(my, { stiffness: 520, damping: 42, mass: 0.35 });

  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let dist = Infinity;
    for (let i = 0; i < el.children.length; i++) {
      const c = el.children[i] as HTMLElement;
      const centre = c.offsetLeft + c.offsetWidth / 2;
      const d = Math.abs(centre - mid);
      if (d < dist) { dist = d; best = i; }
    }
    setActive(best);
  }, []);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    measure();
    let frame = 0;
    const on = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    el.addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", on);
      removeEventListener("resize", on);
    };
  }, [measure]);

  // releasing outside the rail still has to end the drag, or the grabbing
  // cursor and the text-selection lock stay on
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
    const c = el.children[Math.min(Math.max(active + d, 0), el.children.length - 1)] as HTMLElement | undefined;
    c?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", inline: "center", block: "nearest" });
  };

  return (
    <div
      className="relative"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        mx.set(e.clientX);
        my.set(e.clientY);
      }}
    >
      {!reduce && (
        <motion.div
          aria-hidden="true"
          style={{ left: sx, top: sy, opacity: hovering ? 1 : 0 }}
          className="pointer-events-none fixed z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line-strong bg-bg/80 px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase backdrop-blur-md transition-opacity duration-200"
        >
          Drag
        </motion.div>
      )}

      <ul
        ref={rail}
        className="reel-rail flex cursor-grab gap-5 overflow-x-auto px-[11vw] pb-2 sm:px-[22vw] lg:px-[29vw] xl:px-[33vw]"
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
        onPointerUp={(e) => {
          if (drag.current.moved > 6) {
            e.preventDefault();
            e.stopPropagation();
          }
          drag.current.down = false;
          document.body.classList.remove("reel-grabbing");
        }}
        onPointerCancel={() => {
          drag.current.down = false;
          document.body.classList.remove("reel-grabbing");
        }}
        onClickCapture={(e) => {
          // a drag that ended on a card must not open it
          if (drag.current.moved > 6) {
            e.preventDefault();
            e.stopPropagation();
            drag.current.moved = 0;
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
        }}
      >
        {PROJECTS.map((p, i) => (
          <Frame key={p.slug} p={p} active={i === active} onOpen={() => onOpen(p.slug)} />
        ))}
      </ul>

      <div className="wrap mt-6 flex items-center justify-between gap-4">
        <p className="console-cell text-[13px] text-faint">
          <span className="text-fg">{String(active + 1).padStart(2, "0")}</span> / {String(PROJECTS.length).padStart(2, "0")}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={active === 0}
            className="grid size-9 place-items-center rounded-full border border-line text-muted transition-colors hover:text-fg disabled:opacity-35"
            aria-label="Previous project"
          >
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true"><path d="M12 4.5L6.5 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={active === PROJECTS.length - 1}
            className="grid size-9 place-items-center rounded-full border border-line text-muted transition-colors hover:text-fg disabled:opacity-35"
            aria-label="Next project"
          >
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true"><path d="M8 4.5L13.5 10 8 15.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export function Reel() {
  const { openProject, copyEmail, toggleTheme, theme } = useApp();
  const marquee = [...STACK, ...STACK];

  return (
    <div className="min-h-dvh overflow-x-clip pb-24">
      <header className="wrap flex items-center justify-between gap-4 py-5 text-[13px]">
        <a href="#top" className="font-extrabold tracking-wide uppercase [font-stretch:70%]">Irfan Lone</a>
        <div className="flex items-center gap-5">
          <a href={LINKS.resume} className="text-muted transition-colors hover:text-fg">Résumé</a>
          <button type="button" onClick={toggleTheme} className="text-muted transition-colors hover:text-fg" aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </header>

      <section id="top" className="wrap pt-10 pb-12 md:pt-16 md:pb-16">
        <h1 className="text-[clamp(3.4rem,15.5vw,13rem)] leading-[0.8] font-black [font-stretch:62%] uppercase">
          Irfan
          <br />
          Lone
        </h1>
        <div className="mt-10 grid gap-8 md:grid-cols-[1fr_1fr] md:gap-16">
          <p className="max-w-[46ch] text-[clamp(1.05rem,1.6vw,1.3rem)] leading-relaxed text-muted">
            <span className="text-fg">{NAME}.</span> {PROFILE}
          </p>
          <div className="flex flex-col items-start gap-5 md:pt-1">
            <p className="max-w-[34ch] text-[14px] leading-relaxed text-faint">
              Eleven things that run in your browser. Drag the reel, or open one for the launch video and what is
              real inside it.
            </p>
            <button type="button" onClick={copyEmail} className="rounded-full bg-fg px-5 py-2.5 text-[14px] font-semibold text-bg transition-opacity hover:opacity-85">
              Copy my email
            </button>
          </div>
        </div>
      </section>

      <section id="work" className="scroll-mt-10 py-6">
        <Rail onOpen={openProject} />
      </section>

      <section className="marquee-host mt-10 overflow-hidden border-y border-line py-6">
        <ul className="marquee flex w-max text-[clamp(1.1rem,2.4vw,1.8rem)] font-extrabold text-faint [font-stretch:66%] uppercase motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:gap-y-1 motion-reduce:px-4">
          {marquee.map((s, i) => (
            <li
              key={i}
              aria-hidden={i >= STACK.length || undefined}
              className={`flex items-center gap-8 whitespace-nowrap pr-8 ${i >= STACK.length ? "motion-reduce:hidden" : ""}`}
            >
              <span>{s}</span>
              <span className="size-1 rounded-full bg-line-strong" aria-hidden="true" />
            </li>
          ))}
        </ul>
      </section>

      <section className="wrap py-16 md:py-24">
        <ol className="grid gap-12 md:grid-cols-3 md:gap-10">
          {PRINCIPLES.map((p) => (
            <li key={p.title}>
              <h3 className="text-[clamp(1.6rem,3vw,2.2rem)] leading-[0.95] font-extrabold [font-stretch:68%]">{p.title}</h3>
              <p className="mt-4 max-w-[38ch] text-[15px] leading-relaxed text-muted">{p.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="experience" className="wrap scroll-mt-10 border-t border-line py-16 md:py-20">
        <h2 className="text-[clamp(2rem,5vw,3.6rem)] leading-none font-extrabold [font-stretch:66%] uppercase">Experience</h2>
        <ol className="mt-10 grid gap-px bg-line">
          {ROLES.map((r) => (
            <li key={r.org} className="grid gap-3 bg-bg py-7 sm:grid-cols-[11rem_1fr] sm:gap-8">
              <p className="console-cell text-[13px] text-faint">
                <time>{r.start}</time> — <time>{r.end}</time>
              </p>
              <div>
                <h3 className="text-[1.25rem] leading-tight font-bold [font-stretch:78%]">{r.title}</h3>
                <p className="mt-1 text-[14px] text-muted">{r.org}, {r.place}</p>
                <ul className="mt-4 grid gap-2.5">
                  {r.points.map((pt) => (
                    <li key={pt} className="max-w-[72ch] text-[15px] leading-relaxed text-muted">{pt}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
          <li className="grid gap-3 bg-bg py-7 sm:grid-cols-[11rem_1fr] sm:gap-8">
            <p className="console-cell text-[13px] text-faint">{EDUCATION.year}</p>
            <div>
              <h3 className="text-[1.25rem] leading-tight font-bold [font-stretch:78%]">{EDUCATION.degree}</h3>
              <p className="mt-1 text-[14px] text-muted">{EDUCATION.school}</p>
              <p className="mt-4 max-w-[72ch] text-[15px] leading-relaxed text-muted">{EDUCATION.detail}</p>
            </div>
          </li>
        </ol>
      </section>

      <section id="contact" className="wrap scroll-mt-10 border-t border-line pt-16 md:pt-20">
        <h2 className="max-w-[18ch] text-[clamp(2rem,6vw,4.4rem)] leading-[0.92] font-extrabold [font-stretch:66%]">
          Have something that needs building and someone to own it?
        </h2>
        <button type="button" onClick={copyEmail} className="group mt-10 block max-w-full text-left" aria-label={`Copy my email address, ${EMAIL}`}>
          <span className="block break-all text-[clamp(1.7rem,7vw,6rem)] leading-[0.95] font-black [font-stretch:62%] transition-[font-stretch] duration-500 ease-out-quint group-hover:[font-stretch:84%]">
            {EMAIL}
          </span>
          <span className="mt-3 inline-block text-[14px] text-muted transition-colors group-hover:text-fg">Click to copy.</span>
        </button>
        <div className="mt-10 flex flex-wrap gap-2">
          {[
            { label: "LinkedIn", href: LINKS.linkedin },
            { label: "GitHub", href: LINKS.github },
            { label: "Certificates", href: LINKS.credly },
            { label: "Résumé PDF", href: LINKS.resume },
          ].map((l) => (
            <a key={l.label} href={l.href} rel="noopener" className="rounded-full border border-line px-5 py-2.5 text-[14px] font-semibold transition-colors hover:border-line-strong">
              {l.label}
            </a>
          ))}
        </div>
        <footer className="mt-16 border-t border-line pt-6 text-[13px] text-faint">
          <p>
            {NAME}, {new Date().getFullYear()}. React, TypeScript, Tailwind and Motion, hosted on Hostinger. No
            trackers. The demos use invented data.
          </p>
        </footer>
      </section>
    </div>
  );
}
