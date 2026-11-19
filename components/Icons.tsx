import type { SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 18, height: 18, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const, ...p,
});

export const SlidersIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 8h9M17 8h3M4 16h3M11 16h9" /><circle cx="15" cy="8" r="2" /><circle cx="9" cy="16" r="2" /></svg>
);
export const ComposeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-5" /><path d="M18.4 3.6a1.8 1.8 0 0 1 2.5 2.5L12 15l-3.5 1 1-3.5 8.9-8.9Z" /></svg>
);
export const CalendarIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 10h16M9 3.5V7M15 3.5V7" /></svg>
);
export const UtensilsIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M7 3v7a2 2 0 0 0 4 0V3M9 3v18M17 21V3c-2.2 1.4-3 4-3 7v3h3" /></svg>
);
export const MicIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></svg>
);
export const WaveIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={2}><path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4" /></svg>
);
export const ArrowUpIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={2.2}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
);
