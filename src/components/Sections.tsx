import { EDUCATION, LINKS, PRINCIPLES, ROLES, STACK, EMAIL } from "../data/site";
import { useApp } from "../lib/app";
import { Monogram } from "./Nav";

export function Experience() {
  return (
    <section id="experience" className="wrap scroll-mt-20 py-16 md:py-24">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <h2 className="t-h2">Experience</h2>
            <p className="mt-4 max-w-[34ch] text-muted">
              Three remote roles, running at times in parallel. Operations and team lead by day, builder throughout.
            </p>
            <div className="mt-8 border-l-2 border-line pl-4">
              <p className="font-semibold">{EDUCATION.degree}</p>
              <p className="text-[15px] text-muted">{EDUCATION.school}, {EDUCATION.year}</p>
              <p className="mt-1 text-[15px] text-muted">{EDUCATION.detail}</p>
            </div>
          </div>
        </div>
        <ol className="lg:col-span-8">
          {ROLES.map((r) => (
            <li key={r.org} className="grid gap-4 border-t border-line py-8 first:border-t-0 first:pt-0 sm:grid-cols-[150px_1fr] sm:gap-8">
              <p className="text-[15px] tabular-nums text-faint sm:pt-1.5">
                <time>{r.start}</time> to <time>{r.end}</time>
              </p>
              <div>
                <h3 className="t-h3">{r.title}</h3>
                <p className="mt-1 text-muted">{r.org}, {r.place}</p>
                <ul className="mt-4 grid gap-3">
                  {r.points.map((pt) => (
                    <li key={pt} className="relative max-w-[66ch] pl-5 text-[16px] leading-relaxed before:absolute before:left-0 before:top-[0.7em] before:h-px before:w-2.5 before:bg-faint">
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Principles() {
  return (
    <section className="border-y border-line bg-surface">
      <div className="wrap grid gap-10 py-16 md:grid-cols-3 md:gap-8 md:py-24">
        <h2 className="sr-only">How I work</h2>
        {PRINCIPLES.map((p) => (
          <div key={p.title}>
            <h3 className="text-[clamp(1.7rem,3vw,2.3rem)] font-extrabold leading-[1] [font-stretch:72%]">{p.title}</h3>
            <p className="mt-4 max-w-[40ch] text-muted">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function StackMarquee() {
  const items = [...STACK, ...STACK];
  return (
    <section aria-label="Tools I use" className="marquee-host overflow-hidden py-10 md:py-14">
      <ul className="marquee flex w-max text-[clamp(1.6rem,4vw,3rem)] font-extrabold text-muted [font-stretch:70%] motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:gap-y-2 motion-reduce:px-4">
        {items.map((s, i) => (
          <li key={i} aria-hidden={i >= STACK.length || undefined}
            className={`flex items-center gap-10 whitespace-nowrap pr-10 ${i >= STACK.length ? "motion-reduce:hidden" : ""}`}>
            <span>{s}</span>
            <span className="size-1.5 rounded-full bg-faint" aria-hidden="true" />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Contact() {
  const { copyEmail } = useApp();
  return (
    <section id="contact" className="wrap scroll-mt-20 pb-10 pt-20 md:pt-28">
      <h2 className="t-h2 max-w-[16ch]">Have something that needs building and someone to own it?</h2>
      <button
        type="button"
        onClick={copyEmail}
        className="group mt-10 block max-w-full text-left"
        aria-label={`Copy my email address, ${EMAIL}`}
      >
        <span className="block break-all text-[clamp(2rem,7.4vw,6.6rem)] font-black leading-[0.95] [font-stretch:62%] transition-[font-stretch] duration-500 ease-out-quint group-hover:[font-stretch:80%]">
          {EMAIL}
        </span>
        <span className="mt-3 inline-block text-[15px] text-muted transition-colors group-hover:text-fg">Click to copy, or use the links below.</span>
      </button>
      <div className="mt-10 flex flex-wrap gap-2">
        <a href={`mailto:${EMAIL}`} className="rounded-full bg-fg px-5 py-2.5 text-[14px] font-semibold text-bg transition-opacity hover:opacity-85">Write an email</a>
        <a href={LINKS.resume} className="rounded-full border border-line px-5 py-2.5 text-[14px] font-semibold hover:border-line-strong">Résumé PDF</a>
        <a href={LINKS.linkedin} rel="noopener" className="rounded-full border border-line px-5 py-2.5 text-[14px] font-semibold hover:border-line-strong">LinkedIn</a>
        <a href={LINKS.github} rel="noopener" className="rounded-full border border-line px-5 py-2.5 text-[14px] font-semibold hover:border-line-strong">GitHub</a>
        <a href={LINKS.credly} rel="noopener" className="rounded-full border border-line px-5 py-2.5 text-[14px] font-semibold hover:border-line-strong">Certificates</a>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="wrap">
      <div className="flex flex-col gap-4 border-t border-line py-8 text-[14px] text-faint sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Monogram className="size-7 text-fg" />
        <span>Muhammad Irfan Lone, {new Date().getFullYear()}</span>
      </div>
      <p className="max-w-[60ch]">
        Built with React, TypeScript, Tailwind and Motion, hosted on Cloudflare Pages. No trackers or cookies.
        The demos use invented data.
      </p>
      </div>
    </footer>
  );
}
