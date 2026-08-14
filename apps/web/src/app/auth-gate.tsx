import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

import { LoadingState } from "../components/ui/data-state";
import { useSessionStore } from "../lib/session-store";
import { useAuthBootstrap } from "../features/platform/use-platform-data";

export function AuthGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const accessToken = useSessionStore((state) => state.accessToken);
  const bootstrapQuery = useAuthBootstrap(!accessToken);

  if (accessToken) {
    return children;
  }

  if (bootstrapQuery.isPending) {
    return <LoadingState label="Restoring secure session" />;
  }

  return <Navigate to="/login" replace state={{ from: location }} />;
}
