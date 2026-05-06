"use client";

import { useCallback, useSyncExternalStore } from "react";
import styles from "./ThemeToggle.module.css";

const STORAGE_KEY = "80808-theme";

function getThemeSnapshot(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  const t = document.documentElement.getAttribute("data-theme");
  return t === "dark" ? "dark" : "light";
}

function subscribeTheme(onStoreChange: () => void): () => void {
  const el = document.documentElement;
  const mo = new MutationObserver(() => onStoreChange());
  mo.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
  window.addEventListener("storage", onStoreChange);
  return () => {
    mo.disconnect();
    window.removeEventListener("storage", onStoreChange);
  };
}

function applyTheme(next: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => "light");

  const toggle = useCallback(() => {
    const next = theme === "light" ? "dark" : "light";
    applyTheme(next);
  }, [theme]);

  const label =
    theme === "light" ? "Switch to dark theme" : "Switch to light theme";

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      {theme === "light" ? (
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )}
    </button>
  );
}
