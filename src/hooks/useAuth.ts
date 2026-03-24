"use client";

import { useContext } from "react";
import { AuthContext } from "@/components/auth/AuthProvider";

export function useAuth() {
  return useContext(AuthContext);
}
