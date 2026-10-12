import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { VARIANTS, type VariantId } from "./registry";

/** A review tool, not part of any design. It sits above every variant so the
 *  four can be compared without a reload, and explains what each one argues.
 *  Remove this component (and src/variants/) once a direction is chosen. */
export function Switcher({ value, onChange }: { value: VariantId; onChange: (id: VariantId) => void }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const active = VARIANTS.find((v) => v.id === value) ?? VARIANTS[0];

  // 1-4 jump straight to a variant, V hides the bar for a clean screenshot
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      const n = Number(e.key);
      if (n >= 1 && n <= VARIANTS.length) {
        e.preventDefault();
        onChange(VARIANTS[n - 1].id);
      } else if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        setHidden((h) => !h);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    addEventListener("keydown", on);
    return () => removeEventListener("keydown", on);
  }, [onChange]);

  useEffect(() => {
    if (!open) return;
    const on = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    addEventListener("pointerdown", on);
    return () => removeEventListener("pointerdown", on);
  }, [open]);

  if (hidden) {
    return (
      <button
        type="button"
        data-review-ui=""
        onClick={() => setHidden(false)}
        className="fixed bottom-3 left-3 z-[80] rounded-full border border-line bg-bg/80 px-3 py-1.5 text-[12px] font-semibold text-muted backdrop-blur-md transition-colors hover:text-fg"
      >
        Show variants <kbd className="font-sans text-faint">V</kbd>
      </button>
    );
  }

  return (
    <div ref={box} data-review-ui="" className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center p-3">
      <div className="pointer-events-auto w-full max-w-[min(680px,100%)]">
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={reduce ? undefined : { opacity: 0, y: 8 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: 8, transition: { duration: 0.14 } }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="mb-2 overflow-hidden rounded-2xl border border-line bg-bg/92 p-1.5 shadow-2xl backdrop-blur-xl"
            >
              <ul className="grid gap-1">
                {VARIANTS.map((v, i) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(v.id);
                        setOpen(false);
                      }}
                      aria-current={v.id === value || undefined}
                      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        v.id === value ? "bg-raise" : "hover:bg-surface"
                      }`}
                    >
                      <kbd className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border border-line font-sans text-[11px] text-faint">
                        {i + 1}
                      </kbd>
                      <span className="min-w-0">
                        <span className="flex items-baseline gap-2">
                          <span className="text-[15px] font-semibold">{v.name}</span>
                          {v.id === value && <span className="text-[11px] font-semibold text-accent">Showing</span>}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-muted">{v.idea}</span>
                        <span className="mt-1 block text-[12px] leading-snug text-faint">{v.angle}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-1 rounded-full border border-line bg-bg/88 p-1 shadow-xl backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-fg"
            aria-label={open ? "Hide what each variant argues" : "Explain each variant"}
          >
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
              <circle cx="10" cy="10" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 9v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <circle cx="10" cy="6.4" r="0.95" fill="currentColor" />
            </svg>
          </button>
          <div className="no-scrollbar flex min-w-0 flex-1 gap-0.5 overflow-x-auto">
            {VARIANTS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onChange(v.id)}
                aria-current={v.id === value || undefined}
                className={`relative shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                  v.id === value ? "text-bg" : "text-muted hover:text-fg"
                }`}
              >
                {v.id === value && (
                  <motion.span
                    layoutId="variant-pill"
                    className="absolute inset-0 rounded-full bg-fg"
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <span className="relative">{v.name}</span>
              </button>
            ))}
          </div>
          <span className="hidden shrink-0 pr-2 pl-1 text-[11px] text-faint sm:block">
            {active.name} · press <kbd className="font-sans">1-4</kbd>
          </span>
          <button
            type="button"
            onClick={() => setHidden(true)}
            className="grid size-8 shrink-0 place-items-center rounded-full text-faint transition-colors hover:bg-surface hover:text-fg"
            aria-label="Hide the variant switcher"
          >
            <svg viewBox="0 0 20 20" className="size-3.5" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
