import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LINKS, PROJECTS } from "../data/site";
import { useApp } from "../lib/app";

interface Item { id: string; group: string; label: string; hint?: string; run: () => void; keywords?: string }

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, openProject, copyEmail, toggleTheme, theme } = useApp();
  const reduce = useReducedMotion();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const close = () => setPaletteOpen(false);
  const go = (url: string) => { close(); location.href = url; };

  const items = useMemo<Item[]>(() => [
    ...PROJECTS.map((p) => ({
      id: `p-${p.slug}`, group: "Projects", label: p.name, hint: p.kind,
      keywords: `${p.pitch} ${p.stack.join(" ")} ${p.group}`,
      run: () => { close(); openProject(p.slug); },
    })),
    ...PROJECTS.map((p) => ({
      id: `d-${p.slug}`, group: "Open a demo directly", label: `${p.name}`, hint: p.external ? "Live site" : "Demo",
      keywords: "demo live open", run: () => go(p.href),
    })),
    { id: "a-email", group: "Get in touch", label: "Copy email address", keywords: "mail contact", run: () => { close(); copyEmail(); } },
    { id: "a-resume", group: "Get in touch", label: "Open résumé (PDF)", keywords: "cv resume pdf", run: () => go(LINKS.resume) },
    { id: "a-linkedin", group: "Get in touch", label: "LinkedIn", run: () => go(LINKS.linkedin) },
    { id: "a-github", group: "Get in touch", label: "GitHub", keywords: "code source repo", run: () => go(LINKS.github) },
    { id: "a-theme", group: "Settings", label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode", keywords: "theme dark light", run: () => { toggleTheme(); } },
    { id: "a-exp", group: "Go to", label: "Experience", keywords: "jobs roles work history", run: () => { close(); location.hash = "experience"; } },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [theme]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items.filter((i) => i.group !== "Open a demo directly");
    return items.filter((i) => `${i.label} ${i.hint ?? ""} ${i.keywords ?? ""}`.toLowerCase().includes(s));
  }, [q, items]);

  useEffect(() => { setActive(0); }, [q, paletteOpen]);
  useEffect(() => {
    if (paletteOpen) { setQ(""); setTimeout(() => input.current?.focus(), 30); }
  }, [paletteOpen]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, shown.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); shown[active]?.run(); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
  };

  let lastGroup = "";
  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div key="pal" className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.15 }}>
          <button type="button" tabIndex={-1} aria-label="Close search" onClick={close} className="absolute inset-0 cursor-default bg-[var(--scrim)] backdrop-blur-sm" />
          <motion.div
            role="dialog" aria-modal="true" aria-label="Search projects and actions"
            initial={reduce ? false : { scale: 0.97, y: -8 }} animate={{ scale: 1, y: 0 }} exit={reduce ? {} : { scale: 0.98, y: -4 }}
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
            className="relative w-full max-w-[600px] overflow-hidden rounded-[22px] border border-line-strong bg-bg shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-5">
              <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-faint" aria-hidden="true"><circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M13.2 13.2L17 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder="Search projects, tools or actions"
                className="h-14 flex-1 bg-transparent text-[16px] outline-hidden focus-visible:outline-hidden placeholder:text-faint"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-activedescendant={shown[active] ? `pal-${shown[active].id}` : undefined}
              />
              <kbd className="rounded-md bg-raise px-2 py-0.5 text-[12px] text-muted">Esc</kbd>
            </div>
            <ul ref={listRef} id="palette-list" role="listbox" className="max-h-[min(60vh,440px)] overflow-y-auto p-2">
              {shown.length === 0 && (
                <li className="px-3 py-8 text-center text-[15px] text-muted">Nothing matches "{q}". Try a tool like "React" or "Python".</li>
              )}
              {shown.map((it, i) => {
                const head = it.group !== lastGroup; lastGroup = it.group;
                return (
                  <li key={it.id} role="presentation">
                    {head && <p className="px-3 pb-1.5 pt-3 text-[12px] font-semibold text-faint">{it.group}</p>}
                    <div
                      id={`pal-${it.id}`}
                      role="option"
                      aria-selected={i === active}
                      data-i={i}
                      onMouseMove={() => setActive(i)}
                      onClick={it.run}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[15px] ${i === active ? "bg-raise text-fg" : "text-muted"}`}
                    >
                      <span className="truncate">{it.label}</span>
                      {it.hint && <span className="shrink-0 text-[13px] text-faint">{it.hint}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center gap-4 border-t border-line px-5 py-2.5 text-[12px] text-faint">
              <span><kbd className="font-sans">↑ ↓</kbd> to move</span>
              <span><kbd className="font-sans">Enter</kbd> to open</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
