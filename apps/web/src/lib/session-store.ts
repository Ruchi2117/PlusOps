import type { CurrentUser } from "@plusops/contracts";
import { create } from "zustand";

import { setApiAccessToken } from "./api-client";

const storedUserKey = "plusops-current-user";

type SessionState = {
  accessToken: string | null;
  user: CurrentUser | null;
  setSession: (accessToken: string | null, user: CurrentUser | null) => void;
  clearSession: () => void;
};

function readStoredUser(): CurrentUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(storedUserKey);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as CurrentUser;
  } catch {
    window.localStorage.removeItem(storedUserKey);
    return null;
  }
}

setApiAccessToken(null);

export const useSessionStore = create<SessionState>((set) => ({
  accessToken: null,
  user: readStoredUser(),
  setSession: (accessToken, user) => {
    setApiAccessToken(accessToken);

    if (user) {
      window.localStorage.setItem(storedUserKey, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(storedUserKey);
    }

    set({ accessToken, user });
  },
  clearSession: () => {
    setApiAccessToken(null);
    window.localStorage.removeItem(storedUserKey);
    set({ accessToken: null, user: null });
  }
}));
