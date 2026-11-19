"use client";
import { useState } from "react";
import Mascot, { MascotMood } from "@/components/Mascot";

/* Dev-only test bench: open http://localhost:3000/mascot */
export default function MascotLab() {
  const [size, setSize] = useState(170);
  const [mood, setMood] = useState<MascotMood>("idle");
  const [sx, setSx] = useState(1);
  const [sy, setSy] = useState(1);

  return (
    <main style={{ minHeight: "100dvh", background: "#f2f2ef", display: "grid", gap: 24, placeItems: "center", padding: 24 }}>
      <div style={{ height: 240, display: "grid", placeItems: "center" }}>
        <Mascot size={size} mood={mood} squashX={sx} squashY={sy} />
      </div>
      <div style={{ display: "grid", gap: 10, width: 280, fontSize: 14 }}>
        <label>Size {size}px<input type="range" min={24} max={220} value={size} onChange={(e) => setSize(+e.target.value)} style={{ width: "100%" }} /></label>
        <label>Squash X {sx.toFixed(2)}<input type="range" min={0.7} max={1.4} step={0.01} value={sx} onChange={(e) => setSx(+e.target.value)} style={{ width: "100%" }} /></label>
        <label>Squash Y {sy.toFixed(2)}<input type="range" min={0.5} max={1.4} step={0.01} value={sy} onChange={(e) => setSy(+e.target.value)} style={{ width: "100%" }} /></label>
        <button onClick={() => setMood(mood === "idle" ? "happy" : "idle")}>Mood: {mood} (click to toggle)</button>
      </div>
    </main>
  );
}
