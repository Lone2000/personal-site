import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { PROJECTS, type Group, type Project } from "../data/site";
import { useApp } from "../lib/app";

type Filter = "all" | Group;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "creative", label: "Creative web" },
  { id: "automation", label: "Automation and AI" },
];

/** column spans on a 12-column grid, chosen so every row adds up to 12 */
const SPANS: Record<number, number[]> = {
  11: [7, 5, 5, 7, 4, 4, 4, 7, 5, 6, 6],
  6: [7, 5, 5, 7, 6, 6],
  5: [7, 5, 4, 4, 4],
};
const spanClass: Record<number, string> = {
  4: "lg:col-span-4", 5: "lg:col-span-5", 6: "lg:col-span-6", 7: "lg:col-span-7", 12: "lg:col-span-12",
};

const canHover = () => matchMedia("(hover: hover) and (pointer: fine)").matches;

function Card({ p, span, onOpen }: { p: Project; span: number; onOpen: () => void }) {
  const reduce = useReducedMotion();
  const vid = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLButtonElement>(null);
  const [live, setLive] = useState(false);   // has the video element been mounted yet
  const [playing, setPlaying] = useState(false);

  const play = () => {
    if (!p.video || reduce) return;
    setLive(true);
    requestAnimationFrame(() => vid.current?.play().then(() => setPlaying(true)).catch(() => {}));
  };
  const stop = () => {
    const v = vid.current; if (!v) return;
    v.pause(); setPlaying(false);
  };

  // phones and tablets: play while the card is mostly on screen
  useEffect(() => {
    if (!p.video || reduce || canHover()) return;
    const io = new IntersectionObserver(([e]) => (e.intersectionRatio > 0.7 ? play() : stop()), { threshold: [0, 0.7, 1] });
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  return (
    <motion.li
      layout={!reduce}
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 260, damping: 32 }}
      className={`md:col-span-1 ${spanClass[span] ?? ""}`}
    >
      <button
        ref={box}
        type="button"
        onClick={onOpen}
        onPointerEnter={(e) => e.pointerType === "mouse" && play()}
        onPointerLeave={(e) => e.pointerType === "mouse" && stop()}
        onFocus={() => canHover() && play()}
        onBlur={stop}
        className="group block w-full text-left"
        aria-label={`${p.name}. ${p.pitch} Open details`}
      >
        <motion.div
          layoutId={reduce ? undefined : `media-${p.slug}`}
          className={`relative aspect-[16/10] overflow-hidden rounded-[20px] bg-surface ${span === 7 || span === 5 ? "lg:aspect-auto lg:h-[min(31vw,420px)]" : ""}`}
        >
          <img src={p.poster} alt="" loading="lazy" decoding="async"
            className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out-quint group-hover:scale-[1.03]" />
          {live && p.video && (
            <video ref={vid} src={p.video} muted loop playsInline preload="auto"
              className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${playing ? "opacity-100" : "opacity-0"}`} />
          )}
          <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-semibold text-white backdrop-blur-md">
            {p.external ? "Live site" : "Live demo"}
          </span>
          {p.video && (
            <span className={`absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[12px] text-white/90 backdrop-blur-md transition-opacity ${playing ? "opacity-0" : "opacity-100"}`}>
              Video inside
            </span>
          )}
        </motion.div>
        <div className="mt-4 flex items-baseline justify-between gap-4 px-1">
          <h3 className="t-h3">{p.name}</h3>
          <span className="shrink-0 text-[13px] text-faint">{p.kind}</span>
        </div>
        <p className="mt-1.5 max-w-[60ch] px-1 text-[15px] leading-snug text-muted">{p.pitch}</p>
      </button>
    </motion.li>
  );
}

export function Work() {
  const { openProject } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const list = PROJECTS.filter((p) => filter === "all" || p.group === filter);
  const spans = SPANS[list.length] ?? list.map(() => 6);

  return (
    <section id="work" className="wrap scroll-mt-20 py-16 md:py-24">
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="t-h2">Work you can use</h2>
          <p className="mt-4 max-w-[52ch] text-muted">
            Every project opens as a working demo in your browser. The automation demos run the real logic, moved
            from the server into the page, on invented data. Previews play as you hover or scroll past; open one for the full launch video.
          </p>
        </div>
        <div role="tablist" aria-label="Filter projects" className="no-scrollbar -mx-1 flex shrink-0 overflow-x-auto rounded-full border border-line p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              type="button"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`relative whitespace-nowrap rounded-full px-4 py-2 text-[14px] font-semibold transition-colors ${filter === f.id ? "text-bg" : "text-muted hover:text-fg"}`}
            >
              {filter === f.id && <motion.span layoutId="filter-pill" className="absolute inset-0 rounded-full bg-fg" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
              <span className="relative">{f.label}</span>
            </button>
          ))}
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-x-5 gap-y-12 md:grid-cols-2 lg:grid-cols-12">
        <AnimatePresence mode="popLayout" initial={false}>
          {list.map((p, i) => (
            <Card key={p.slug} p={p} span={spans[i]} onOpen={() => openProject(p.slug)} />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
