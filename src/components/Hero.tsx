import { motion, useReducedMotion } from "motion/react";
import { ReelName } from "./ReelName";
import { EMAIL, LINKS, NAME, PROFILE } from "../data/site";
import { useApp } from "../lib/app";

export function EmailCommand({ big = false }: { big?: boolean }) {
  const { copyEmail } = useApp();
  return (
    <button
      type="button"
      onClick={copyEmail}
      className={`group flex w-full max-w-full items-center gap-3 rounded-2xl border border-line bg-surface text-left transition-colors hover:border-line-strong ${big ? "px-5 py-4" : "px-4 py-3"}`}
      aria-label={`Copy my email address, ${EMAIL}`}
    >
      <span className="select-none font-mono text-faint">$</span>
      <span className={`min-w-0 flex-1 truncate font-mono ${big ? "text-[15px] sm:text-[17px]" : "text-[14px] sm:text-[15px]"}`}>
        <span className="text-muted">mail </span>{EMAIL}
      </span>
      <span className="flex items-center gap-1.5 rounded-lg bg-raise px-2.5 py-1 text-[12px] font-semibold text-muted transition-colors group-hover:text-fg">
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true"><rect x="5" y="5" width="8.5" height="8.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M3 10.5V4a1.5 1.5 0 0 1 1.5-1.5H11" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
        Copy
      </span>
    </button>
  );
}

export function Hero() {
  const reduce = useReducedMotion();
  const enter = (d: number) => reduce ? {} : {
    initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay: d, ease: [0.22, 1, 0.36, 1] as const },
  };
  return (
    <section id="top" className="wrap pt-28 pb-6 sm:pt-32 md:pb-8">
      <ReelName words={["IRFAN", "LONE"]} />
      <div className="mt-8 grid gap-8 md:mt-10 md:grid-cols-12 md:gap-10">
        <motion.p {...enter(1.1)} className="t-lede max-w-[38ch] text-muted md:col-span-7">
          <span className="text-fg">{NAME}.</span> {PROFILE}
        </motion.p>
        <motion.div {...enter(1.25)} className="flex flex-col gap-3 md:col-span-5 md:pt-1">
          <EmailCommand />
          <div className="flex flex-wrap gap-2">
            <a href="#work" className="rounded-full bg-fg px-5 py-2.5 text-[14px] font-semibold text-bg transition-opacity hover:opacity-85">See the work</a>
            <a href={LINKS.resume} className="rounded-full border border-line px-5 py-2.5 text-[14px] font-semibold transition-colors hover:border-line-strong">Résumé</a>
            <a href={LINKS.github} rel="noopener" className="rounded-full border border-line px-5 py-2.5 text-[14px] font-semibold transition-colors hover:border-line-strong">GitHub</a>
            <a href={LINKS.linkedin} rel="noopener" className="rounded-full border border-line px-5 py-2.5 text-[14px] font-semibold transition-colors hover:border-line-strong">LinkedIn</a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
