import { create } from "zustand";

type Theme = "light" | "dark";

type ThemeState = {
  theme: Theme;
  toggleTheme: () => void;
};

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem("plusops-theme");
  if (stored === "light" || stored === "dark") {
    document.documentElement.classList.toggle("dark", stored === "dark");
    return stored;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", prefersDark);
  return prefersDark ? "dark" : "light";
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  toggleTheme: () => {
    const nextTheme = get().theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    window.localStorage.setItem("plusops-theme", nextTheme);
    set({ theme: nextTheme });
  }
}));

