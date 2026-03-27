"use client";

import { createContext, useEffect, useState } from "react";
import {
  getCurrentUser,
  signOut as amplifySignOut,
} from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplify/config";

configureAmplify();

export interface AuthUser {
  userId: string;
  email: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  signOut: async () => {},
});

const SKIP_AUTH = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

const MOCK_USER: AuthUser = {
  userId: "local-dev",
  email: "dev@localhost",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (SKIP_AUTH) {
      setUser(MOCK_USER);
      setIsLoading(false);
      return;
    }

    async function checkAuth() {
      try {
        const cognitoUser = await getCurrentUser();
        setUser({
          userId: cognitoUser.userId,
          email: cognitoUser.signInDetails?.loginId ?? "",
        });
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  const signOut = async () => {
    if (SKIP_AUTH) return;
    try {
      await amplifySignOut();
      setUser(null);
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
