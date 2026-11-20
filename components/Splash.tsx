"use client";
import { useEffect, useRef } from "react";
import styles from "./Splash.module.css";

/* ------------------------------------------------------------------
   Opening animation (about 3.9s)
   0.00-0.45  black -> indigo, big eyes fade in and grow
   0.55/0.95  two blinks
   1.30-2.38  eyes look left, then right, then back to centre
   2.20-2.85  glossy blob inflates behind the eyes (bouncy)
   2.95-3.70  LIFT bottom -> top: thick drips with white gloss highlights,
              the blob + eyes ride the edge and land at the small
              mascot spot at the top
   3.70-3.90  cross-fade onto the real mascot
   Everything scales with one unit (k): same look on phone and laptop.
   Add ?slow=4 to the URL to watch it in slow motion.
------------------------------------------------------------------- */
const T = {
  fade: 0.45,
  blinks: [0.55, 0.95],
  blinkDur: 0.2,
  // [time, look] : -1 = left, 1 = right, 0 = centre
  look: [[1.3, 0], [1.58, -1], [1.7, -1], [1.98, 1], [2.1, 1], [2.38, 0]] as [number, number][],
  inflate0: 2.2,
  inflate: 0.65,
  lift0: 2.95,
  lift: 0.75,
  tail: 0.2,
};

type Drip = { x: number; w: number; L: number; ph: number; hl: boolean; hl2: boolean };

const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

function bezier(x1: number, y1: number, x2: number, y2: number) {
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const cx = 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3 - x;
      const d = 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t;
      if (Math.abs(d) < 1e-6) break;
      t -= cx / d;
    }
    t = clamp(t);
    return 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
  };
}

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lookAt(s: number) {
  const L = T.look;
  if (s <= L[0][0]) return 0;
  for (let i = 0; i < L.length - 1; i++) {
    if (s < L[i + 1][0]) {
      const q = (s - L[i][0]) / (L[i + 1][0] - L[i][0]);
      return lerp(L[i][1], L[i + 1][1], smooth(q));
    }
  }
  return L[L.length - 1][1];
}

export default function Splash({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const grp = useRef<HTMLDivElement>(null);
  const blob = useRef<HTMLDivElement>(null);
  const eyes = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const el = root.current!;
    const c = cv.current!;
    const ctx = c.getContext("2d")!;
    const g = grp.current!;
    const blobEl = blob.current!;
    const eyesEl = eyes.current!;
    const eyeList = Array.from(eyesEl.children) as HTMLElement[];

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = window.setTimeout(() => doneRef.current(), 120);
      return () => clearTimeout(id);
    }

    const slow = Math.max(0.1, parseFloat(new URLSearchParams(location.search).get("slow") || "1") || 1);
    let W = 0, H = 0, k = 1, tx = 0, ty = 70, D = 36;
    let drips: Drip[] = [];
    let raf = 0;
    let finished = false;

    const layout = () => {
      const r = el.getBoundingClientRect();
      W = r.width;
      H = r.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      k = clamp(Math.min(W, H * 0.7) / 390, 1, 2.4);
      el.style.setProperty("--k", String(k));

      // chunky drips like melting paint (seeded, so identical every run)
      const rand = rng(11);
      const n = Math.ceil(W / (52 * k));
      drips = Array.from({ length: n }, (_, i) => ({
        x: (i + 0.5 + (rand() - 0.5) * 0.5) * (W / n),
        w: (10 + rand() * 6) * k,
        L: (14 + rand() * 32) * k,
        ph: rand() * 0.15,
        hl: rand() < 0.8,
        hl2: rand() < 0.3,
      }));

      // where the real mascot rests (mark it in Home.tsx with data-splash-target)
      const t = document.querySelector("[data-splash-target]") as HTMLElement | null;
      if (t) {
        const b = t.getBoundingClientRect();
        tx = b.left - r.left + b.width / 2;
        ty = b.top - r.top + b.height / 2;
        D = Math.max(28, Math.min(b.width, b.height * 1.1) || 36);
      } else {
        tx = W / 2;
        ty = 70;
        D = 36;
      }
    };
    layout();
    window.addEventListener("resize", layout);

    const ease = bezier(0.3, 0.1, 0.25, 1);
    const pop = bezier(0.34, 1.56, 0.64, 1);
    const t0 = performance.now();

    const frame = (now: number) => {
      const s = (now - t0) / 1000 / slow;

      /* colour: black -> indigo */
      const f = clamp(s / T.fade);
      const fe = 1 - (1 - f) * (1 - f);
      ctx.clearRect(0, 0, W, H);
      const indigo = `rgb(${lerp(7, 67, fe) | 0},${lerp(6, 56, fe) | 0},${lerp(15, 202, fe) | 0})`;

      const u = clamp((s - T.lift0) / T.lift);
      const e = ease(u);

      /* ---------- the sheet, with glossy drips ---------- */
      if (u < 1) {
        const S = 62 * k;
        const edge = lerp(H + 10 * k, -S - 8 * k, e);
        const amp = 5 * k;
        const wl = 60 * k;
        const drift = u * 7;
        const wy = (x: number) =>
          edge + amp * Math.sin((x / wl) * 6.283 + drift) + amp * 0.45 * Math.sin((x / (27 * k)) * 6.283 + drift * 1.7);

        ctx.fillStyle = "#f7f7f4";
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = indigo;
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(W, -2);
        for (let x = W; x >= 0; x -= 5) ctx.lineTo(x, wy(x));
        ctx.lineTo(0, wy(0));
        ctx.closePath();
        ctx.fill();

        const bulbs: { x: number; y: number; r: number; d: Drip; len: number }[] = [];
        for (const d of drips) {
          const q = clamp((u - d.ph) / (1 - d.ph));
          const len = d.L * Math.sin(Math.PI * q) ** 0.8;
          if (len < 2 * k) continue;
          const y0 = wy(d.x);
          const yb = y0 + len;
          const fl = Math.min(d.w * 1.0, len * 0.6);
          ctx.beginPath();
          ctx.moveTo(d.x - d.w / 2 - fl, y0 - 1);
          ctx.quadraticCurveTo(d.x - d.w / 2, y0 - 1, d.x - d.w / 2, y0 + fl);
          ctx.lineTo(d.x - d.w / 2, yb);
          ctx.lineTo(d.x + d.w / 2, yb);
          ctx.lineTo(d.x + d.w / 2, y0 + fl);
          ctx.quadraticCurveTo(d.x + d.w / 2, y0 - 1, d.x + d.w / 2 + fl, y0 - 1);
          ctx.closePath();
          ctx.fill();
          const r = d.w * 0.75;
          ctx.beginPath();
          ctx.arc(d.x, yb, r, 0, 6.283);
          ctx.fill();
          bulbs.push({ x: d.x, y: yb, r, d, len });
        }

        // Narrow white wet-paint crescents on the visible bulb edges.
        for (const b of bulbs) {
          ctx.save();
          ctx.fillStyle = "#fff";
          const cx = b.x - b.r * 0.18;
          const cy = b.y + b.r * 0.02;
          const outer = b.r * 0.82;
          const inner = b.r * 0.48;
          const a0 = Math.PI * 0.58;
          const a1 = Math.PI * 1.20;
          ctx.beginPath();
          ctx.moveTo(cx + outer * Math.cos(a0), cy + outer * Math.sin(a0));
          ctx.arc(cx, cy, outer, a0, a1, false);
          ctx.lineTo(cx + inner * Math.cos(a1), cy + inner * Math.sin(a1));
          ctx.arc(cx, cy, inner, a1, a0, true);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = Math.max(3.5 * k, 3.5);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.arc(
            b.x - b.r * 0.10,
            b.y + b.r * 0.12,
            b.r * 0.86,
            Math.PI * 0.64,
            Math.PI * 1.10
          );
          ctx.stroke();
          ctx.restore();
        }
      }

      /* ---------- eyes + blob group ---------- */
      // eyes: fade in, blink, look around
      let bx = 1, by = 1;
      for (const bt of T.blinks) {
        const q = (s - bt) / T.blinkDur;
        if (q > 0 && q < 1) {
          const w = Math.sin(Math.PI * q);
          by = lerp(1, 0.1, w);
          bx = lerp(1, 1.08, w);
        }
      }
      eyeList.forEach((i) => (i.style.transform = `scale(${bx},${by})`));
      eyesEl.style.opacity = String(fe);
      eyesEl.style.transform = `translateX(${lookAt(s) * 14 * k}px)`;

      // blob inflates behind the eyes
      const q = clamp((s - T.inflate0) / T.inflate);
      blobEl.style.scale = String(lerp(0.2, 1, pop(q)));
      blobEl.style.opacity = String(clamp(q * 3));

      // the group rides the lift and lands at the mascot spot
      const em = clamp(e / 0.9);
      const gx = lerp(W / 2, tx, em);
      const gy = lerp(H / 2, ty, em);
      const gs = lerp(0.6, 1, fe) * lerp(1, D / (150 * k), em);
      g.style.transform = `translate(${gx}px,${gy}px) scale(${gs}) translate(-50%,-50%)`;

      /* tail: cross-fade onto the real mascot, then hand control back */
      const tq = clamp((s - (T.lift0 + T.lift)) / T.tail);
      if (u >= 1) el.style.opacity = String(1 - tq);
      if (tq >= 1) {
        if (!finished) {
          finished = true;
          doneRef.current();
        }
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", layout);
    };
  }, []);

  return (
    <div className={styles.splash} ref={root} aria-hidden>
      <canvas className={styles.canvas} ref={cv} />
      <div className={styles.mascot} ref={grp}>
        <div className={styles.blob} ref={blob} />
        <div className={styles.eyes} ref={eyes}>
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}
