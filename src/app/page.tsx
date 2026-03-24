"use client";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppShell } from "@/components/layout/AppShell";
import { PanelList } from "@/components/panels/PanelList";
import { ChartContainer } from "@/components/chart/ChartContainer";
import { CsvImportDialog } from "@/components/data-source/CsvImportDialog";

export default function Home() {
  return (
    <AuthProvider>
      <AuthGuard>
        <AppShell>
          <PanelList />
          <ChartContainer />
          <CsvImportDialog />
        </AppShell>
      </AuthGuard>
    </AuthProvider>
  );
}
