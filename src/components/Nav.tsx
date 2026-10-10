import { Island } from "./Island";
import { isMac, useApp } from "../lib/app";

export function Nav() {
  const { setPaletteOpen, toggleTheme, theme } = useApp();
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 bg-linear-to-b from-bg via-bg/80 to-transparent pb-6 pt-3 [&>div]:pointer-events-auto">
      <div className="wrap grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        <a href="#top" className="flex h-9 items-center gap-2 justify-self-start text-[15px] font-extrabold [font-stretch:75%]" aria-label="Irfan Lone, back to top">
          <Monogram />
          <span className="hidden sm:inline">Irfan Lone</span>
        </a>
        <Island />
        <div className="flex h-9 items-center gap-1 justify-self-end">
          <nav className="mr-2 hidden items-center gap-1 text-[14px] lg:flex" aria-label="Sections">
            <a className="rounded-full px-3 py-1.5 text-muted transition-colors hover:text-fg" href="#work">Work</a>
            <a className="rounded-full px-3 py-1.5 text-muted transition-colors hover:text-fg" href="#experience">Experience</a>
            <a className="rounded-full px-3 py-1.5 text-muted transition-colors hover:text-fg" href="#contact">Contact</a>
          </nav>
          <button
            type="button"
            onClick={toggleTheme}
            className="grid size-9 place-items-center rounded-full border border-line bg-bg/70 text-muted backdrop-blur transition-colors hover:text-fg"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
              <circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M10 3.5a6.5 6.5 0 0 1 0 13z" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden h-9 items-center gap-2 rounded-full border border-line bg-bg/70 pl-3 pr-1.5 text-[13px] text-muted backdrop-blur transition-colors hover:text-fg sm:flex"
            aria-label="Search projects and actions"
          >
            Search
            <kbd className="rounded-full bg-raise px-2 py-0.5 font-sans text-[12px] text-fg">{isMac ? "⌘K" : "Ctrl K"}</kbd>
          </button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="grid size-9 place-items-center rounded-full border border-line bg-bg/70 text-muted backdrop-blur sm:hidden"
            aria-label="Search projects and actions"
          >
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true"><circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M13.2 13.2L17 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>
    </header>
  );
}

export function Monogram({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
      <rect width="36" height="36" rx="10" fill="currentColor" />
      <path d="M11 9.5v17M17.5 9.5v17h8" fill="none" stroke="var(--bg)" strokeWidth="3.4" strokeLinecap="square" />
    </svg>
  );
}
