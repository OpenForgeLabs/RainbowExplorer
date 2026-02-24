"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { useGlobalLoader } from "@/lib/globalLoader";

export function ShellLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { begin, end } = useGlobalLoader();
  const firstPathRef = useRef(true);

  useEffect(() => {
    if (firstPathRef.current) {
      firstPathRef.current = false;
      return;
    }

    const token = begin("Loading screen...");
    const timer = window.setTimeout(() => {
      end(token);
    }, 350);

    return () => {
      window.clearTimeout(timer);
      end(token);
    };
  }, [pathname, begin, end]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
      />
      <div className="flex flex-1 flex-col bg-surface/30">{children}</div>
    </div>
  );
}
