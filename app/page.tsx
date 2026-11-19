"use client";
import { useState } from "react";
import Splash from "@/components/Splash";
import Home from "@/components/Home";

export default function Page() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <main className="device">
      <Home />
      {!splashDone && <Splash onDone={() => setSplashDone(true)} />}
    </main>
  );
}
