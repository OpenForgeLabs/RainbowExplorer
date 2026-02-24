"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";

type SidebarItem = {
  href: string;
  label: string;
  icon: string;
};

type SidebarProps = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

const NAV_ITEMS: SidebarItem[] = [
  { href: "/connections", label: "Connections", icon: "hub" },
  { href: "/plugins", label: "Plugins", icon: "extension" },
];

const FOOTER_ITEMS: SidebarItem[] = [
  { href: "/activity", label: "Activity", icon: "history" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  const { theme, setTheme, themes } = useTheme();
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!themeMenuRef.current) {
        return;
      }
      if (!themeMenuRef.current.contains(event.target as Node)) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (collapsed) {
      setThemeMenuOpen(false);
    }
  }, [collapsed]);

  return (
    <aside
      className={`relative hidden border-r border-border bg-surface lg:flex lg:flex-col ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div
        className={`flex items-center border-b border-border/70 ${
          collapsed ? "justify-center px-0 py-5" : "gap-3 px-4 py-4"
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--rx-radius-md)] bg-primary/15 text-primary">
          <span className="material-symbols-outlined text-[24px]">rainy</span>
        </div>
        <div className={collapsed ? "hidden min-w-0 flex-1" : "min-w-0 flex-1 leading-tight"}>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-foreground">
              <span className="text-primary">R</span>
              <span className="text-accent">a</span>
              <span className="text-success">i</span>
              <span className="text-warning">n</span>
              <span className="text-danger">b</span>
              <span className="text-primary">o</span>
              <span className="text-accent">w</span>
              <span className="text-foreground">Explorer</span>
            </h1>
            <div className="relative" ref={themeMenuRef}>
              <button
                type="button"
                className="ui-focus inline-flex h-6 w-6 items-center justify-center rounded-md border border-border-subtle/70 bg-transparent text-subtle transition hover:border-border hover:bg-surface-2 hover:text-foreground"
                aria-label="Theme picker"
                title="Theme picker"
                onClick={() => setThemeMenuOpen((previous) => !previous)}
              >
                <span className="material-symbols-outlined text-[14px]">format_paint</span>
              </button>
              {themeMenuOpen ? (
                <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-md border border-border bg-surface p-1 shadow-[var(--rx-shadow-sm)]">
                  {themes.length === 0 ? (
                    <div className="px-2 py-1 text-[11px] text-subtle">Loading themes...</div>
                  ) : (
                    themes.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`flex w-full items-center rounded px-2 py-1.5 text-left text-[11px] transition ${
                          option.id === theme
                            ? "bg-primary/15 text-foreground"
                            : "text-subtle hover:bg-surface-2 hover:text-foreground"
                        }`}
                        onClick={() => {
                          setTheme(option.id);
                          setThemeMenuOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-widest text-subtle">Shell</p>
          </div>
        </div>
        {!collapsed && onToggleCollapse ? (
          <span className="ml-auto hidden w-8 lg:block" aria-hidden />
        ) : null}
      </div>

      {onToggleCollapse ? (
        <button
          className={`absolute top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border-subtle/60 bg-surface-2 text-muted-foreground shadow-[var(--rx-shadow-sm)] backdrop-blur hover:border-primary lg:flex ${
            collapsed ? "-right-3 h-10 w-10" : "-right-2 h-8 w-8"
          }`}
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="material-symbols-outlined text-[18px]">
            {collapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>
      ) : null}

      <nav className={`flex-1 space-y-1 overflow-y-auto py-3 ${collapsed ? "px-2" : "px-3"}`}>
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            className={`flex w-full items-center rounded-lg py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground ${
              collapsed ? "justify-center px-0" : "gap-3 px-3"
            }`}
            href={item.href}
            aria-label={item.label}
            title={item.label}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className={collapsed ? "hidden" : ""}>{item.label}</span>
          </a>
        ))}
      </nav>

      <div className={`mt-auto border-t border-border/70 py-3 ${collapsed ? "px-2" : "px-3"}`}>
        <div className="space-y-1">
          {FOOTER_ITEMS.map((item) => (
            <a
              key={item.href}
              className={`flex w-full items-center rounded-lg py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground ${
                collapsed ? "justify-center px-0" : "gap-3 px-3"
              }`}
              href={item.href}
              aria-label={item.label}
              title={item.label}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className={collapsed ? "hidden" : ""}>{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
}
