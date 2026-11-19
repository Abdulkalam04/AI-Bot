"use client";
import { useState } from "react";
import { ComposeIcon, CalendarIcon, SlidersIcon, UtensilsIcon } from "./Icons";
import Mascot from "./Mascot";
import Composer from "./Composer";
import styles from "./Home.module.css";

export default function Home() {
  const [text, setText] = useState("");

  return (
    <section className={styles.home}>
      <header className={styles.top}>
        <button className={styles.round} aria-label="Settings"><SlidersIcon /></button>
        <div className={styles.pull}>
          <Mascot size={36} />
          <span>Pull me down</span>
        </div>
        <button className={styles.round} aria-label="New chat"><ComposeIcon /></button>
      </header>

      <div className={styles.center}>
        <h1>Good evening.</h1>
        <p>Three things moving. One needs you.</p>
        <div className={styles.chips}>
          <button className={styles.chip}><CalendarIcon width={17} height={17} />My day</button>
          <button className={styles.chip}><UtensilsIcon width={17} height={17} />Plan dinner</button>
        </div>
      </div>

      <Composer value={text} onChange={setText} onSend={() => setText("")} />
    </section>
  );
}
