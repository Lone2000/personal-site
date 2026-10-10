(function(global) {
  "use strict";
  function rng(seed) {
    return function() {
      seed |= 0;
      seed = seed + 1831565813 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const SEED = 20260922;
  const W = 1e3, H = 1e3;
  const NS = "http://www.w3.org/2000/svg";
  const el = (name, attrs) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };
  function current(r, y, amp, len, phase) {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const x = -120 + t * len;
      const wob = Math.sin(t * Math.PI * 3.1 + phase) * amp + Math.sin(t * Math.PI * 7.3 + phase * 1.7) * amp * 0.28;
      pts.push([x.toFixed(1), (y + wob).toFixed(1)]);
    }
    return "M" + pts.map((p) => p.join(",")).join("L");
  }
  function vortex(cx, cy, turns, r0, r1, dir) {
    const pts = [];
    const steps = turns * 34;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = dir * t * turns * Math.PI * 2;
      const r = r0 + (r1 - r0) * Math.pow(t, 0.78);
      pts.push([
        (cx + Math.cos(a) * r * 1.32).toFixed(1),
        (cy + Math.sin(a) * r * 0.82).toFixed(1)
      ]);
    }
    return "M" + pts.map((p) => p.join(",")).join("L");
  }
  function cypress(rand, x, base, height, width) {
    const left = [], right = [];
    for (let i = 0; i <= 22; i++) {
      const t = i / 22;
      const y = base - t * height;
      const w = width * Math.pow(1 - t, 0.62) * (0.72 + 0.28 * Math.sin(t * 15 + rand() * 6));
      left.push([(x - w).toFixed(1), y.toFixed(1)]);
      right.push([(x + w).toFixed(1), y.toFixed(1)]);
    }
    return "M" + left.map((p) => p.join(",")).join("L") + "L" + right.reverse().map((p) => p.join(",")).join("L") + "Z";
  }
  function ridge(rand, y, amp, roughness) {
    const pts = [["-40", (y + 60).toFixed(1)]];
    let h = y;
    for (let x = -40; x <= W + 40; x += 38) {
      h += (rand() - 0.5) * roughness;
      h = Math.max(y - amp, Math.min(y + amp, h));
      pts.push([x.toFixed(1), h.toFixed(1)]);
    }
    pts.push([(W + 40).toFixed(1), (y + 260).toFixed(1)]);
    pts.push(["-40", (y + 260).toFixed(1)]);
    return "M" + pts.map((p) => p.join(",")).join("L") + "Z";
  }
  function build(mount) {
    const rand = rng(SEED);
    const svg = el("svg", {
      viewBox: `0 0 ${W} ${H}`,
      preserveAspectRatio: "xMidYMid slice",
      class: "sky__svg",
      "aria-hidden": "true",
      focusable: "false"
    });
    const defs = el("defs", {});
    const halo = el("radialGradient", { id: "sp-halo", cx: "50%", cy: "50%", r: "50%" });
    [
      ["0%", "var(--star)", "0.92"],
      ["30%", "var(--star)", "0.42"],
      ["62%", "var(--star-warm)", "0.16"],
      ["100%", "var(--star-warm)", "0"]
    ].forEach(([o, c, op]) => halo.appendChild(el("stop", {
      offset: o,
      "stop-color": c,
      "stop-opacity": op
    })));
    defs.appendChild(halo);
    const moonGlow = el("radialGradient", { id: "sp-moon", cx: "50%", cy: "50%", r: "50%" });
    [["0%", "0.55"], ["38%", "0.22"], ["100%", "0"]].forEach(([o, op]) => moonGlow.appendChild(el("stop", {
      offset: o,
      "stop-color": "var(--moon)",
      "stop-opacity": op
    })));
    defs.appendChild(moonGlow);
    const nightGrad = el("linearGradient", { id: "sp-night", x1: "0", y1: "0", x2: "0.25", y2: "1" });
    [["0%", "var(--night-top)"], ["48%", "var(--night-mid)"], ["100%", "var(--night-low)"]].forEach(([o, c]) => nightGrad.appendChild(el("stop", { offset: o, "stop-color": c })));
    defs.appendChild(nightGrad);
    svg.appendChild(defs);
    svg.appendChild(el("rect", { x: -40, y: -40, width: W + 80, height: H + 80, fill: "url(#sp-night)" }));
    const currents = el("g", { class: "sky-currents" });
    for (let i = 0; i < 9; i++) {
      const y = 70 + i * 62 + rand() * 26;
      const g = el("g", { class: "sky-current", style: `--d:${(52 + rand() * 46).toFixed(1)}s;--o:${(-rand() * 40).toFixed(1)}s` });
      g.appendChild(el("path", {
        d: current(rand, y, 22 + rand() * 30, W + 320, rand() * 6.28),
        fill: "none",
        stroke: i % 3 === 0 ? "var(--swirl-pale)" : "var(--swirl)",
        "stroke-width": (2.5 + rand() * 7).toFixed(1),
        "stroke-linecap": "round",
        opacity: (0.16 + rand() * 0.3).toFixed(2)
      }));
      currents.appendChild(g);
    }
    svg.appendChild(currents);
    const spins = el("g", { class: "sky-vortices" });
    [[372, 268, 4.2, 10, 150, 1, "118s"], [606, 322, 3.4, 8, 106, -1, "94s"]].forEach(([cx, cy, turns, r0, r1, dir, dur]) => {
      const g = el("g", { class: "sky-vortex", style: `--d:${dur};--dir:${dir}` });
      g.setAttribute("transform-origin", `${cx} ${cy}`);
      for (let k = 0; k < 3; k++) {
        g.appendChild(el("path", {
          d: vortex(cx, cy, turns - k * 0.5, r0 + k * 9, r1 - k * 16, dir),
          fill: "none",
          stroke: k === 1 ? "var(--swirl-pale)" : "var(--swirl)",
          "stroke-width": (7 - k * 1.8).toFixed(1),
          "stroke-linecap": "round",
          opacity: (0.4 - k * 0.09).toFixed(2)
        }));
      }
      spins.appendChild(g);
    });
    svg.appendChild(spins);
    const moon = el("g", { class: "sky-moon" });
    moon.appendChild(el("circle", { cx: 648, cy: 246, r: 132, fill: "url(#sp-moon)" }));
    const mask = el("mask", { id: "sp-crescent" });
    mask.appendChild(el("rect", { x: 540, y: 140, width: 260, height: 260, fill: "white" }));
    mask.appendChild(el("circle", { cx: 672, cy: 232, r: 47, fill: "black" }));
    defs.appendChild(mask);
    moon.appendChild(el("circle", { cx: 648, cy: 246, r: 52, fill: "var(--moon)", mask: "url(#sp-crescent)" }));
    svg.appendChild(moon);
    const stars = el("g", { class: "sky-stars" });
    const big = [];
    const anchors = [
      [352, 128],
      [566, 96],
      [318, 268],
      [472, 212],
      [612, 276],
      [396, 358],
      [676, 372],
      [302, 432],
      [540, 408],
      [658, 516],
      [386, 524]
    ];
    anchors.forEach(([x, y], i) => {
      const r = 20 + rand() * 20;
      const g = el("g", {
        class: "sky-star",
        style: `--d:${(3.4 + rand() * 3.6).toFixed(2)}s;--o:${(-rand() * 5).toFixed(2)}s`
      });
      g.setAttribute("transform-origin", `${x} ${y}`);
      g.appendChild(el("circle", { cx: x, cy: y, r: r * 2.5, fill: "url(#sp-halo)" }));
      g.appendChild(el("circle", { cx: x, cy: y, r: (r * 0.3).toFixed(1), fill: "var(--star)" }));
      stars.appendChild(g);
      big.push(g);
    });
    for (let i = 0; i < 74; i++) {
      const x = 60 + rand() * 880, y = 30 + rand() * 600;
      const r = 0.9 + rand() * 2.1;
      const g = el("g", {
        class: "sky-star sky-star--sm",
        style: `--d:${(2.6 + rand() * 4.4).toFixed(2)}s;--o:${(-rand() * 6).toFixed(2)}s`
      });
      g.setAttribute("transform-origin", `${x.toFixed(1)} ${y.toFixed(1)}`);
      g.appendChild(el("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: (r * 5).toFixed(1), fill: "url(#sp-halo)", opacity: 0.5 }));
      g.appendChild(el("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: r.toFixed(1), fill: "var(--star)" }));
      stars.appendChild(g);
      big.push(g);
    }
    svg.appendChild(stars);
    const hills = el("g", { class: "sky-hills" });
    hills.appendChild(el("path", { d: ridge(rand, 604, 54, 46), fill: "var(--hill-far)", opacity: "0.85" }));
    hills.appendChild(el("path", { d: ridge(rand, 664, 40, 34), fill: "var(--hill-near)" }));
    svg.appendChild(hills);
    const village = el("g", { class: "sky-village" });
    let vx = 96;
    while (vx < W - 40) {
      const w = 34 + rand() * 46;
      const h = 30 + rand() * 46;
      const y = 716 - h;
      village.appendChild(el("path", {
        d: `M${vx.toFixed(0)},${(y + h).toFixed(0)}L${vx.toFixed(0)},${y.toFixed(0)}L${(vx + w / 2).toFixed(0)},${(y - 16 - rand() * 14).toFixed(0)}L${(vx + w).toFixed(0)},${y.toFixed(0)}L${(vx + w).toFixed(0)},${(y + h).toFixed(0)}Z`,
        fill: "var(--village)"
      }));
      if (rand() > 0.42) {
        village.appendChild(el("rect", {
          x: (vx + w * 0.3).toFixed(0),
          y: (y + 14).toFixed(0),
          width: 7,
          height: 9,
          rx: 1.5,
          fill: "var(--window)",
          class: "sky-window",
          style: `--d:${(4 + rand() * 6).toFixed(1)}s;--o:${(-rand() * 8).toFixed(1)}s`
        }));
      }
      vx += w + 10 + rand() * 26;
    }
    village.appendChild(el("path", {
      d: "M470,716L470,636L486,570L502,636L502,716Z",
      fill: "var(--village)"
    }));
    svg.appendChild(village);
    const trees = el("g", { class: "sky-trees" });
    trees.appendChild(el("path", { d: cypress(rand, 302, 1010, 1180, 70), fill: "var(--cypress)", class: "sky-cypress" }));
    trees.appendChild(el("path", { d: cypress(rand, 694, 1010, 470, 34), fill: "var(--cypress)", opacity: "0.9", class: "sky-cypress sky-cypress--two" }));
    trees.appendChild(el("path", { d: cypress(rand, 74, 1010, 620, 46), fill: "var(--cypress)", opacity: "0.75", class: "sky-cypress sky-cypress--two" }));
    trees.appendChild(el("path", { d: cypress(rand, 938, 1010, 540, 40), fill: "var(--cypress)", opacity: "0.75", class: "sky-cypress" }));
    svg.appendChild(trees);
    const bed = el("g", { class: "sky-bed" });
    bed.appendChild(el("path", { d: ridge(rand, 748, 16, 16), fill: "var(--ground)" }));
    for (let i = 0; i < 46; i++) {
      const x = rand() * W;
      const y = 756 + rand() * 186;
      const s = 0.5 + rand() * 1.1;
      const g = el("g", {
        class: "sky-bloom",
        style: `--d:${(5 + rand() * 5).toFixed(1)}s;--o:${(-rand() * 7).toFixed(1)}s`
      });
      g.setAttribute("transform-origin", `${x.toFixed(1)} ${y.toFixed(1)}`);
      g.appendChild(el("path", {
        d: `M${x.toFixed(1)},${(y + 16 * s).toFixed(1)}q${(2 * s).toFixed(1)},${(-9 * s).toFixed(1)} 0,${(-16 * s).toFixed(1)}`,
        fill: "none",
        stroke: "var(--stem)",
        "stroke-width": (1.4 * s).toFixed(1),
        "stroke-linecap": "round"
      }));
      const petal = rand() > 0.55 ? "var(--bloom-a)" : "var(--bloom-b)";
      for (let p = 0; p < 5; p++) {
        const a = p / 5 * Math.PI * 2 + rand();
        g.appendChild(el("circle", {
          cx: (x + Math.cos(a) * 3.1 * s).toFixed(1),
          cy: (y + Math.sin(a) * 3.1 * s).toFixed(1),
          r: (2.4 * s).toFixed(1),
          fill: petal,
          opacity: 0.85
        }));
      }
      bed.appendChild(g);
    }
    svg.appendChild(bed);
    mount.appendChild(svg);
    const layers = [
      [currents, 10],
      [spins, 16],
      [moon, 8],
      [stars, 22],
      [hills, -8],
      [village, -14],
      [trees, -26],
      [bed, -40]
    ];
    return { svg, layers, stars: big };
  }
  function Sky(mount) {
    const { svg, layers, stars } = build(mount);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let px = 0, py = 0, tx = 0, ty = 0, raf = 0;
    function frame() {
      px += (tx - px) * 0.055;
      py += (ty - py) * 0.055;
      for (const [node, depth] of layers) {
        node.style.transform = `translate(${(px * depth).toFixed(2)}px, ${(py * depth).toFixed(2)}px)`;
      }
      if (Math.abs(tx - px) > 4e-4 || Math.abs(ty - py) > 4e-4) raf = requestAnimationFrame(frame);
      else raf = 0;
    }
    function glide(nx, ny) {
      if (reduced) return;
      tx = Math.max(-1, Math.min(1, nx));
      ty = Math.max(-1, Math.min(1, ny));
      if (!raf) raf = requestAnimationFrame(frame);
    }
    if (!reduced) {
      addEventListener("pointermove", (e) => {
        if (e.pointerType === "touch") return;
        glide((e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2);
      }, { passive: true });
      let tiltOn = false;
      Sky.prototype = null;
      global.__spTilt = function() {
        if (tiltOn) return;
        const attach = () => {
          tiltOn = true;
          addEventListener("deviceorientation", (e) => {
            if (e.beta == null || e.gamma == null) return;
            glide(e.gamma / 34, (e.beta - 42) / 34);
          }, { passive: true });
        };
        const DOE = global.DeviceOrientationEvent;
        if (DOE && typeof DOE.requestPermission === "function") {
          DOE.requestPermission().then((r) => {
            if (r === "granted") attach();
          }).catch(() => {
          });
        } else if (DOE) attach();
      };
    }
    return {
      svg,
      /* one star flares for a moment. called on every keystroke — it is the
         whole reason the sky and the paper feel like one thing. */
      flare() {
        if (reduced || !stars.length) return;
        const g = stars[Math.random() * stars.length | 0];
        g.classList.remove("is-flaring");
        void g.getBoundingClientRect();
        g.classList.add("is-flaring");
        setTimeout(() => g.classList.remove("is-flaring"), 900);
      },
      /* a deliberate drift, used when a letter opens and closes */
      push(nx, ny) {
        glide(nx, ny);
      }
    };
  }
  global.Sky = Sky;
})(window);
