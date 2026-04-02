"use client";

import { useEffect } from "react";
import { Header } from "./Header";
import { useLabelStore } from "@/stores/labelStore";

export function AppShell({ children }: { children: React.ReactNode }) {
  const loadLabels = useLabelStore((s) => s.loadLabels);

  useEffect(() => {
    loadLabels();
  }, [loadLabels]);

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
