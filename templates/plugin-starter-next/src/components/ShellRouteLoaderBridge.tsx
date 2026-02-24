"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { startShellLoader, stopShellLoader } from "@/lib/shellLoader";

export function ShellRouteLoaderBridge() {
  const pathname = usePathname();
  const firstPathRef = useRef(true);

  useEffect(() => {
    if (firstPathRef.current) {
      firstPathRef.current = false;
      return;
    }

    const token = startShellLoader("Loading plugin screen...");
    const timer = window.setTimeout(() => {
      stopShellLoader(token);
    }, 300);

    return () => {
      window.clearTimeout(timer);
      stopShellLoader(token);
    };
  }, [pathname]);

  return null;
}
