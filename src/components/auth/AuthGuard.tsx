"use client";

import { useContext } from "react";
import { AuthContext } from "./AuthProvider";

const SKIP_AUTH = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useContext(AuthContext);

  if (SKIP_AUTH) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-muted">Please sign in to continue.</p>
          <a
            href="/login"
            className="rounded bg-primary px-4 py-2 text-white hover:bg-primary-hover"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
