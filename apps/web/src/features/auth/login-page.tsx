import type { FormEvent } from "react";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { KeyRound, LockKeyhole, Mail } from "lucide-react";

import { Button } from "../../components/ui/button";
import { InlineError } from "../../components/ui/data-state";
import { FieldLabel, Input } from "../../components/ui/form-controls";
import { visualAssets } from "../../lib/visual-assets";
import { useSessionStore } from "../../lib/session-store";
import { getApiErrorMessage } from "../platform/platform-api";
import { useLoginMutation } from "../platform/use-platform-data";

type LoginLocationState = {
  from?: {
    pathname?: string;
  };
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useSessionStore((state) => state.accessToken);
  const loginMutation = useLoginMutation();
  const [email, setEmail] = useState("manager@plusops.local");
  const [password, setPassword] = useState("PlusOpsDev123!");
  const redirectTo = (location.state as LoginLocationState | null)?.from?.pathname ?? "/dashboard";

  if (accessToken) {
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    loginMutation.mutate(
      { email, password },
      {
        onSuccess: () => navigate(redirectTo, { replace: true })
      }
    );
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <img
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-42"
        src={visualAssets.lightSail}
        alt=""
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,transparent_0%,rgb(0_0_0_/_0.42)_34%,rgb(0_0_0_/_0.9)_78%)]" />

      <section className="relative w-full max-w-md rounded-lg border border-white/[0.08] bg-black/48 p-6 shadow-panel backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center overflow-hidden rounded-lg border border-primary/25 bg-black">
            <img className="size-full object-cover" src={visualAssets.plusOpsLogo} alt="" aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-black text-white">PlusOps</p>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Live backend</p>
          </div>
        </div>

        <div className="mt-8">
          <p className="art-eyebrow">Development session</p>
          <h1 className="mt-3 text-4xl font-black leading-none text-white">Sign in to the seeded platform.</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Uses the real NestJS auth flow with an access token and HttpOnly refresh cookie.
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-2">
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                className="pl-9"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </label>

          <label className="block space-y-2">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                className="pl-9"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </label>

          {loginMutation.isError ? <InlineError>{getApiErrorMessage(loginMutation.error)}</InlineError> : null}

          <Button className="w-full" disabled={loginMutation.isPending} type="submit">
            <KeyRound className="size-4" aria-hidden="true" />
            {loginMutation.isPending ? "Signing in" : "Sign in"}
          </Button>
        </form>

        <div className="mt-5 rounded-lg border border-white/[0.08] bg-white/[0.035] p-3 text-xs leading-5 text-muted-foreground">
          Seeded account: <span className="font-semibold text-white">manager@plusops.local</span> /{" "}
          <span className="font-semibold text-white">PlusOpsDev123!</span>
        </div>
      </section>
    </main>
  );
}
