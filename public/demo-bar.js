/* shared demo strip: says what's real, shows the commit log the server would
   have written, and resets the sample data. config on window.DEMO_BAR. */
(() => {
  const cfg = window.DEMO_BAR || {};
  const css = `
  .dbar{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:2147483000;
    display:flex;align-items:center;gap:10px;max-width:calc(100vw - 24px);
    font:600 12px/1.25 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#f4f1ea;
    background:rgba(20,18,28,.88);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
    border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:7px 8px 7px 14px;text-transform:none;letter-spacing:0;
    box-shadow:0 8px 30px rgba(0,0,0,.25)}
  .dbar b{color:#ffd166;letter-spacing:.08em;font-size:11px}
  .dbar span.t{opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .dbar button,.dbar a{all:unset;cursor:pointer;padding:5px 10px;border-radius:999px;
    background:rgba(255,255,255,.1);white-space:nowrap}
  .dbar button:hover,.dbar a:hover{background:rgba(255,255,255,.2)}
  .dlog{position:fixed;right:12px;bottom:60px;z-index:2147483000;width:min(380px,calc(100vw - 24px));
    max-height:46vh;overflow:auto;background:rgba(20,18,28,.94);color:#e8e4da;border-radius:14px;
    border:1px solid rgba(255,255,255,.14);padding:12px 14px;
    text-transform:none;letter-spacing:0;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
  .dlog h4{margin:0 0 8px;font:700 11px ui-sans-serif,system-ui;letter-spacing:.08em;color:#ffd166}
  .dlog ol{margin:0;padding:0;list-style:none}
  .dlog li{padding:4px 0;border-top:1px solid rgba(255,255,255,.08)}
  .dlog li i{color:#8bd3a8;font-style:normal}
  .dlog p{margin:0;opacity:.7}
  .dbar.is-min{display:none}
  .dtab{all:unset;position:fixed;left:0;top:50%;transform:translateY(-50%);z-index:2147483000;cursor:pointer;
    writing-mode:vertical-rl;padding:12px 6px;border-radius:0 10px 10px 0;background:rgba(20,18,28,.88);
    color:#ffd166;font:800 11px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.14em;text-transform:none;
    border:1px solid rgba(255,255,255,.14);border-left:0;box-shadow:0 6px 20px rgba(0,0,0,.25)}
  .dtab[hidden]{display:none}
  @media (max-width:560px){.dbar span.t{display:none}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const bar = document.createElement("div");
  bar.className = "dbar";
  bar.innerHTML = `<b>DEMO</b><span class="t">${cfg.text || ""}</span>
    ${cfg.log ? `<button type="button" data-a="log">${cfg.logLabel || "commits"} <span data-n>0</span></button>` : ""}
    <button type="button" data-a="reset">reset</button>
    <button type="button" data-a="min" aria-label="hide">✕</button>
    ${cfg.home ? `<a href="${cfg.home}">all demos</a>` : ""}`;
  const log = document.createElement("div");
  log.className = "dlog"; log.hidden = true;
  log.innerHTML = `<h4>${cfg.logTitle || "WHAT THE SERVER WOULD COMMIT"}</h4><p data-empty>${cfg.logEmpty || "nothing yet — change something."}</p><ol></ol>`;

  const tab = document.createElement("button");
  tab.className = "dtab"; tab.type = "button"; tab.textContent = "DEMO"; tab.hidden = true;
  tab.setAttribute("aria-label", "about this demo");
  const shrink = () => { bar.classList.add("is-min"); log.hidden = true; tab.hidden = false; };
  const grow = () => { bar.classList.remove("is-min"); tab.hidden = true; };
  tab.addEventListener("click", (e) => { e.stopPropagation(); grow(); });
  let timer = setTimeout(shrink, 7000);
  document.addEventListener("pointerdown", (e) => {
    if (bar.contains(e.target) || log.contains(e.target) || tab.contains(e.target)) { clearTimeout(timer); return; }
    clearTimeout(timer); shrink();
  }, true);
  const add = () => { document.body.appendChild(bar); document.body.appendChild(log); document.body.appendChild(tab); };
  if (document.body) add(); else document.addEventListener("DOMContentLoaded", add);

  let n = 0;
  const sha = () => Math.random().toString(16).slice(2, 9);
  window.addEventListener(cfg.event || "demo:commit", (e) => {
    n++;
    bar.querySelector("[data-n]") && (bar.querySelector("[data-n]").textContent = n);
    log.querySelector("[data-empty]").hidden = true;
    const li = document.createElement("li");
    li.innerHTML = `<i>${sha()}</i> ${String(e.detail).replace(/[<&]/g, (c) => c === "<" ? "&lt;" : "&amp;")}`;
    log.querySelector("ol").prepend(li);
  });
  bar.addEventListener("click", (e) => {
    const a = e.target.closest("[data-a]"); if (!a) return;
    if (a.dataset.a === "log") log.hidden = !log.hidden;
    if (a.dataset.a === "reset" && cfg.reset) cfg.reset();
    if (a.dataset.a === "min") shrink();
  });
})();
