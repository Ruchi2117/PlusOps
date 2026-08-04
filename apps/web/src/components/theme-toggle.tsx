import { Moon, Sun } from "lucide-react";

import { Button } from "./ui/button";
import { useThemeStore } from "../lib/theme-store";

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? "Use light theme" : "Use dark theme"}
    >
      {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
    </Button>
  );
}

