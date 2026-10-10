import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { PROJECTS } from "../data/site";
import { useApp } from "../lib/app";

export function ProjectSheet() {
  const { openSlug, openProject } = useApp();
  const reduce = useReducedMotion();
  const p = PROJECTS.find((x) => x.slug === openSlug) ?? null;
  const panel = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const idx = p ? PROJECTS.indexOf(p) : -1;

  useEffect(() => {
    if (!p) return;
    lastFocus.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true }), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") openProject(null);
      if (e.key === "ArrowRight" && !(e.target instanceof HTMLVideoElement)) openProject(PROJECTS[(idx + 1) % PROJECTS.length].slug);
      if (e.key === "ArrowLeft" && !(e.target instanceof HTMLVideoElement)) openProject(PROJECTS[(idx - 1 + PROJECTS.length) % PROJECTS.length].slug);
      if (e.key === "Tab" && panel.current) {
        const f = [...panel.current.querySelectorAll<HTMLElement>("a,button,video,[tabindex]:not([tabindex='-1'])")];
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    addEventListener("keydown", onKey);
    return () => { clearTimeout(t); removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, [p, idx, openProject]);

  useEffect(() => { if (!p) lastFocus.current?.focus?.({ preventScroll: true }); }, [p]);

  return (
    <AnimatePresence>
      {p && (
        <motion.div
          key="sheet"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
        >
          <button type="button" aria-label="Close" tabIndex={-1} onClick={() => openProject(null)}
            className="absolute inset-0 cursor-default bg-[var(--scrim)] backdrop-blur-sm" />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-title"
            initial={reduce ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="relative max-h-[92dvh] w-full max-w-[1080px] overflow-y-auto rounded-t-[28px] border border-line bg-bg sm:rounded-[28px]"
          >
            <motion.div layoutId={reduce ? undefined : `media-${p.slug}`} className="relative h-[min(56dvh,calc((100vw-48px)*0.5625))] overflow-hidden bg-black sm:m-3 sm:h-[min(56dvh,calc((min(100vw,1080px)-72px)*0.5625))] sm:rounded-[20px]">
              {p.video ? (
                <video key={p.slug} src={p.video} poster={p.poster} controls playsInline autoPlay={!reduce}
                  className="absolute inset-0 size-full object-contain" aria-label={`${p.name} launch video`} />
              ) : (
                <img src={p.poster} alt={`${p.name} screenshot`} className="absolute inset-0 size-full object-contain" />
              )}
            </motion.div>

            <div className="grid gap-8 p-5 sm:p-8 md:grid-cols-12">
              <div className="md:col-span-7">
                <p className="text-[13px] text-faint">{p.kind}, {p.year}</p>
                <h2 id="sheet-title" className="mt-1 text-[clamp(2rem,5vw,3.2rem)] font-extrabold leading-[0.95] [font-stretch:75%]">{p.name}</h2>
                <p className="t-lede mt-4 max-w-[46ch]">{p.pitch}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <a data-autofocus href={p.href} rel={p.external ? "noopener" : undefined}
                    className="rounded-full bg-fg px-5 py-3 text-[15px] font-semibold text-bg transition-opacity hover:opacity-85">
                    {p.external ? "Open the site" : "Open the demo"}
                  </a>
                  {p.repo && (
                    <a href={`https://github.com/Lone2000/${p.repo}`} rel="noopener"
                      className="rounded-full border border-line px-5 py-3 text-[15px] font-semibold transition-colors hover:border-line-strong">
                      Source code
                    </a>
                  )}
                </div>
                {p.note && <p className="mt-3 text-[14px] text-muted">{p.note}.</p>}
              </div>
              <dl className="grid content-start gap-5 text-[15px] md:col-span-5">
                <div>
                  <dt className="font-semibold">Try this</dt>
                  <dd className="mt-1 text-muted">{p.tryIt}</dd>
                </div>
                <div>
                  <dt className="font-semibold">What's real</dt>
                  <dd className="mt-1 text-muted">{p.real}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Built with</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {p.stack.map((s) => <span key={s} className="rounded-full bg-surface px-3 py-1 text-[13px] text-muted">{s}</span>)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex items-center justify-between border-t border-line px-5 py-3 sm:px-8">
              <button type="button" onClick={() => openProject(PROJECTS[(idx - 1 + PROJECTS.length) % PROJECTS.length].slug)}
                className="rounded-full px-3 py-2 text-[14px] text-muted transition-colors hover:text-fg">
                Previous: {PROJECTS[(idx - 1 + PROJECTS.length) % PROJECTS.length].name}
              </button>
              <button type="button" onClick={() => openProject(PROJECTS[(idx + 1) % PROJECTS.length].slug)}
                className="rounded-full px-3 py-2 text-right text-[14px] text-muted transition-colors hover:text-fg">
                Next: {PROJECTS[(idx + 1) % PROJECTS.length].name}
              </button>
            </div>

            <button type="button" onClick={() => openProject(null)} aria-label="Close"
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80 sm:right-6 sm:top-6">
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
