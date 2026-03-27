"use client";

import { useState } from "react";
import { signIn } from "aws-amplify/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn({ username: email, password });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-surface">
      <form
        onSubmit={handleSubmit}
        className="w-80 rounded-lg bg-background p-6 shadow"
      >
        <h1 className="mb-6 text-center text-xl font-semibold text-foreground">
          metric-viewer
        </h1>

        <label
          htmlFor="login-email"
          className="mb-1 block text-sm font-medium text-muted-foreground"
        >
          Email
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
          required
        />

        <label
          htmlFor="login-password"
          className="mb-1 block text-sm font-medium text-muted-foreground"
        >
          Password
        </label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
          required
        />

        {error && <p className="mb-3 text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-primary py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
