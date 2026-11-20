"use client";
import { useEffect, useRef } from "react";
import styles from "./Splash.module.css";

/* ------------------------------------------------------------------
   Opening animation (measured from the reference recording, ~2.4s)
   0.00-0.50  black -> indigo fade, eyes fade in and grow
   0.95/1.45  two blinks
   1.75-2.35  indigo sheet lifts, thick paint drips, eyes ride the edge,
              the last of the indigo becomes the small mascot at the handle
   Everything is sized from one unit (k), so it looks right on phones
   AND on big laptop screens. Add ?slow=4 to the URL to watch it in slow motion.
------------------------------------------------------------------- */
const T = {
  fade: 0.5,
  blinks: [0.95, 1.45],
  blinkDur: 0.18,
  lift0: 1.75,
  lift: 0.6,
  tail: 0.18,
};

type Drip = { x: number; w: number; L: number; ph: number };

const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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

export default function Splash({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const eyes = useRef<HTMLDivElement>(null);
  const blob = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const el = root.current!;
    const c = cv.current!;
    const ctx = c.getContext("2d")!;
    const eyeEl = eyes.current!;
    const blobEl = blob.current!;

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = window.setTimeout(() => doneRef.current(), 400);
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

      const rand = rng(7);
      const n = Math.ceil(W / (30 * k));
      drips = Array.from({ length: n }, (_, i) => ({
        x: (i + 0.5 + (rand() - 0.5) * 0.6) * (W / n),
        w: (5 + rand() * 3) * k,
        L: (10 + rand() * 28) * k,
        ph: rand() * 0.15,
      }));

      const t = document.querySelector("[data-splash-target]") as HTMLElement | null;
      if (t) {
        const b = t.getBoundingClientRect();
        tx = b.left - r.left + b.width / 2;
        ty = b.top - r.top + b.height / 2;
        D = Math.max(28, Math.min(b.width, b.height * 1.1) || 36);
      } else {
        tx = W / 2;
        ty = 70;
      }
      blobEl.style.width = blobEl.style.height = `${D}px`;
    };
    layout();
    window.addEventListener("resize", layout);

    const ease = bezier(0.3, 0.1, 0.25, 1);
    const pop = bezier(0.34, 1.56, 0.64, 1);
    const t0 = performance.now();

    const frame = (now: number) => {
      const s = (now - t0) / 1000 / slow;
      const f = clamp(s / T.fade);
      const fe = 1 - (1 - f) * (1 - f);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = `rgb(${(lerp(7, 70, fe)) | 0},${(lerp(6, 58, fe)) | 0},${(lerp(15, 197, fe)) | 0})`;

      const u = clamp((s - T.lift0) / T.lift);
      const e = ease(u);

      if (u < 1) {
        const S = 52 * k;
        const edge = lerp(H + 9 * k, -S - 8 * k, e);
        const amp = 4 * k;
        const wl = 36 * k;
        const drift = u * 7;
        const wy = (x: number) =>
          edge + amp * Math.sin((x / wl) * 6.283 + drift) + amp * 0.5 * Math.sin((x / (17 * k)) * 6.283 + drift * 1.7);

        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(W, -2);
        for (let x = W; x >= 0; x -= 5) ctx.lineTo(x, wy(x));
        ctx.lineTo(0, wy(0));
        ctx.closePath();
        ctx.fill();

        for (const d of drips) {
          const q = clamp((u - d.ph) / (1 - d.ph));
          const len = d.L * Math.sin(Math.PI * q) ** 0.8;
          if (len < 1.5 * k) continue;
          const y0 = wy(d.x);
          const yb = y0 + len;
          const fl = Math.min(d.w * 0.9, len * 0.6);
          ctx.beginPath();
          ctx.moveTo(d.x - d.w / 2 - fl, y0 - 1);
          ctx.quadraticCurveTo(d.x - d.w / 2, y0 - 1, d.x - d.w / 2, y0 + fl);
          ctx.lineTo(d.x - d.w / 2, yb);
          ctx.lineTo(d.x + d.w / 2, yb);
          ctx.lineTo(d.x + d.w / 2, y0 + fl);
          ctx.quadraticCurveTo(d.x + d.w / 2, y0 - 1, d.x + d.w / 2 + fl, y0 - 1);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.arc(d.x, yb, d.w * 0.7, 0, 6.283);
          ctx.fill();
        }
      }

      let bx = 1, by = 1;
      for (const b of T.blinks) {
        const q = (s - b) / T.blinkDur;
        if (q > 0 && q < 1) {
          const w = Math.sin(Math.PI * q);
          by = lerp(1, 0.42, w);
          bx = lerp(1, 1.05, w);
        }
      }
      const em = clamp(e / 0.85);
      const ex = lerp(W / 2, tx, em);
      const ey = lerp(H / 2, ty, em);
      const eyeScaleAtTarget = (D * 0.14) / (7 * k);
      const es = lerp(1, eyeScaleAtTarget, em) * lerp(0.6, 1, fe);
      eyeEl.style.opacity = String(fe);
      eyeEl.style.transform = `translate(${ex}px,${ey}px) scale(${es * bx},${es * by}) translate(-50%,-50%)`;

      const bs = pop(clamp((e - 0.45) / 0.35));
      blobEl.style.transform = `translate(${tx}px,${ty}px) scale(${bs}) translate(-50%,-50%)`;

      const q = clamp((s - (T.lift0 + T.lift)) / T.tail);
      if (u >= 1) el.style.opacity = String(1 - q);
      if (q >= 1) {
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
      <div className={styles.blob} ref={blob} />
      <div className={styles.eyes} ref={eyes}>
        <i />
        <i />
      </div>
    </div>
  );
}
