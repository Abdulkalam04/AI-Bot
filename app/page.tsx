"use client";
import { useEffect, useState } from "react";
import Splash from "@/components/Splash";
import Home from "@/components/Home";

export default function Page() {
  const [splashDone, setSplashDone] = useState(false);
  const [run, setRun] = useState(0); // bump to replay everything from the splash

  // Dev shortcut: press R (outside the text box) to replay from the splash
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key.toLowerCase() === "r" && !e.metaKey && !e.ctrlKey) {
        setSplashDone(false);
        setRun((n) => n + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="device" key={run}>
      <Home />
      {!splashDone && <Splash onDone={() => setSplashDone(true)} />}
    </main>
  );
}
