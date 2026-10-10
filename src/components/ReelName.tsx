import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

const POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SPINS = 9;

/** deterministic filler so the reels look the same on every load */
function filler(seed: number, n: number) {
  let s = seed * 9301 + 49297;
  return Array.from({ length: n }, () => { s = (s * 9301 + 49297) % 233280; return POOL[Math.floor((s / 233280) * POOL.length)]; });
}

function Reel({ ch, index }: { ch: string; index: number }) {
  const reduce = useReducedMotion();
  // strip = [ch, ...filler, ch]; showing the first or the last cell looks identical
  const strip = useRef([ch, ...filler(index + 3, SPINS - 1), ch]).current;
  const n = strip.length;
  const pos = useMotionValue(reduce ? n - 1 : 1);
  const y = useTransform(pos, (p) => `${(-p / n) * 100}%`);
  const busy = useRef(false);

  const spin = (from: number, delay = 0, duration = 1.1) => {
    busy.current = true;
    pos.set(from);
    return animate(pos, n - 1, { duration, delay, ease: [0.16, 1, 0.3, 1], onComplete: () => { busy.current = false; } });
  };

  useEffect(() => {
    if (reduce) return;
    const a = spin(1, 0.15 + index * 0.07, 1.25 + index * 0.05);
    return () => a.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span
      className="relative inline-block h-[0.8em] overflow-hidden align-top"
      onPointerEnter={() => { if (!reduce && !busy.current) spin(0, 0, 0.7); }}
    >
      <span className="invisible block leading-[0.8]">{ch}</span>
      <motion.span style={{ y }} className="absolute inset-x-0 top-0 flex flex-col items-center leading-[0.8]" aria-hidden="true">
        {strip.map((c, i) => <span key={i} className="block h-[0.8em]">{c}</span>)}
      </motion.span>
    </span>
  );
}

export function ReelName({ words }: { words: string[] }) {
  let k = 0;
  return (
    <div className="[container-type:inline-size]">
    <h1 className="t-display select-none" aria-label={words.join(" ")}>
      <span className="flex flex-wrap gap-x-[0.12em] text-[43.5cqw] md:text-[23.2cqw]" aria-hidden="true">
        {words.map((w) => (
          <span key={w} className="flex whitespace-nowrap">
            {[...w].map((c) => <Reel key={k} ch={c} index={k++} />)}
          </span>
        ))}
      </span>
    </h1>
    </div>
  );
}
