import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useApp } from "../lib/app";
import { LINKS } from "../data/site";

function useKarachiTime() {
  const fmt = () => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" }).format(new Date());
  const [t, setT] = useState(fmt);
  useEffect(() => { const id = setInterval(() => setT(fmt()), 20_000); return () => clearInterval(id); }, []);
  return t;
}

/** The status pill at the top. It opens to show how to reach me, and it's where confirmations appear. */
export function Island() {
  const { notice, copyEmail } = useApp();
  const [open, setOpen] = useState(false);
  const time = useKarachiTime();
  const reduce = useReducedMotion();
  const mode = notice ? "notice" : open ? "open" : "idle";
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 420, damping: 34 };

  return (
    <div
      className="relative flex justify-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}
    >
      <motion.div
        layout
        transition={spring}
        style={{ borderRadius: mode === "open" ? 22 : 999 }}
        className="overflow-hidden bg-fg text-bg shadow-[0_10px_40px_-12px_rgb(0_0_0/0.5)]"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {mode === "idle" && (
            <motion.button
              key="idle"
              type="button"
              onClick={() => setOpen(true)}
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              className="flex h-9 items-center gap-2.5 whitespace-nowrap px-4 text-[13px] font-semibold"
              aria-expanded={false}
              aria-label="Open to work. Show contact options"
            >
              <span className="relative flex size-2">
                <span className="absolute inset-0 rounded-full bg-emerald-500" />
              </span>
              Open to work
              <span className="hidden font-normal opacity-60 tabular-nums sm:inline">{time} in Pakistan</span>
            </motion.button>
          )}
          {mode === "open" && (
            <motion.div
              key="open"
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              className="w-[min(340px,calc(100vw-32px))] p-4"
            >
              <p className="flex items-center gap-2 text-[13px] font-semibold">
                <span className="size-2 rounded-full bg-emerald-500" /> Open to work, remote
              </p>
              <p className="mt-1.5 text-[13px] leading-snug opacity-70">
                Based in Pakistan ({time} now). Happy to work European and UK hours. Email is the quickest way to reach me.
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={copyEmail}
                  className="flex-1 rounded-full bg-bg px-3 py-2 text-[13px] font-semibold text-fg transition-opacity hover:opacity-85">
                  Copy email
                </button>
                <a href={LINKS.resume}
                  className="flex-1 rounded-full border border-current/20 px-3 py-2 text-center text-[13px] font-semibold transition-colors hover:bg-black/5">
                  Résumé
                </a>
              </div>
            </motion.div>
          )}
          {mode === "notice" && (
            <motion.p
              key="notice"
              role="status"
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              className="flex h-9 items-center gap-2 whitespace-nowrap px-5 text-[13px] font-semibold"
            >
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {notice}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
