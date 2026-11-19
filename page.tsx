"use client";
import { useState } from "react";
import Splash from "@/components/Splash";

export default function Page() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <main className="device">
      {/* Step 2 replaces this placeholder with the real Home screen */}
      <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em" }}>Good evening.</h1>
      </div>

      {!splashDone && <Splash onDone={() => setSplashDone(true)} />}
    </main>
  );
}
