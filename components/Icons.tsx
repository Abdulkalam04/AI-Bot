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
export const HangupIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ transform: "rotate(135deg)" }} {...p}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
export const MoonStarIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M18 5h4M20 3v4" /><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" /></svg>
);
export const MusicIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="8" cy="18" r="3.6" fill="currentColor" /><path d="M11.6 18V3l7 4" /></svg>
);
export const ClockIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const CheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={2.2}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const CheckCircleFilledIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg width={18} height={18} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10" fill="currentColor" /><path d="M7.5 12.4l3 3 6-6.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const UsersIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" /><path d="M15.5 4.9a3.2 3.2 0 0 1 0 6.2M17 14.3c2.2.5 3.5 2.2 3.5 4.7" /></svg>
);
export const MessageIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 17h-7l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 5Z" /><path d="M8 9.5h8M8 12.5h5" /></svg>
);
export const BellIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15L6 16.5Z" /><path d="M10 21h4" /></svg>
);
export const XIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={1.8}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const RingIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={1.5}><circle cx="12" cy="12" r="8" /></svg>
);
export const TickIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={1.6}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const DoneIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={1.5}><circle cx="12" cy="12" r="8" /><path d="M8.6 12.2l2.5 2.5 4.4-4.9" /></svg>
);
