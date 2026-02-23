"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { SettingsModal } from "@/components/layout/SettingsModal";

export function ShellLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className="flex flex-1 flex-col bg-surface/30">{children}</div>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
