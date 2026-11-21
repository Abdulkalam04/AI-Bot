"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Mascot from "./Mascot";
import { GoogleIcon } from "./Icons";
import { APP_NAME } from "@/lib/config";
import styles from "./SignInView.module.css";

export default function SignInView() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.mascotWrap}>
          <Mascot size={130} mood={loading ? "happy" : "idle"} />
        </div>
        <h1 className={styles.title}>Welcome to {APP_NAME}</h1>
        <p className={styles.subtitle}>
          Your thoughtful personal AI companion. Sign in with your Google account to get started.
        </p>

        <button
          type="button"
          className={styles.googleButton}
          onClick={handleSignIn}
          disabled={loading}
          aria-label="Sign in with Google"
        >
          <GoogleIcon width={20} height={20} />
          <span>{loading ? "Connecting to Google…" : "Sign in with Google"}</span>
        </button>

        <p className={styles.footerNote}>
          Protected by Google OAuth &middot; Auth.js
        </p>
      </div>
    </div>
  );
}

