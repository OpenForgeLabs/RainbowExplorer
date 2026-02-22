"use client";

import { useEffect, useState } from "react";
import { Modal } from "@openforgelabs/rainbow-ui";
import { ensureThemeStyles, loadThemeRegistry, useTheme } from "@/lib/theme";

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const [themes, setThemes] = useState<Array<{
    id: string;
    label: string;
    description: string;
    cssUrl?: string;
  }>>([]);
  const previewMap: Record<string, string> = {
    default: "linear-gradient(140deg, rgb(13,17,23), rgb(88,166,255))",
    dracula: "linear-gradient(140deg, rgb(40,42,54), rgb(255,121,198))",
    nord: "linear-gradient(140deg, rgb(46,52,64), rgb(136,192,208))",
    "solarized-dark": "linear-gradient(140deg, rgb(0,43,54), rgb(38,139,210))",
    "gruvbox-dark": "linear-gradient(140deg, rgb(40,40,40), rgb(215,153,33))",
    "catppuccin-mocha": "linear-gradient(140deg, rgb(30,30,46), rgb(203,166,247))",
    "one-dark": "linear-gradient(140deg, rgb(40,44,52), rgb(97,175,239))",
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    loadThemeRegistry().then((list) => {
      setThemes(list);
    });
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      description="Personaliza la apariencia del shell."
    >
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Theme</h3>
          <p className="text-xs text-slate-400">
            Elige un tema para esta sesión.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {themes.map((option) => {
            const isActive = option.id === theme;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  ensureThemeStyles(option.cssUrl);
                  setTheme(option.id);
                }}
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-action bg-action/15 text-action"
                    : "border-border-dark bg-surface-dark/40 text-slate-300 hover:border-action/60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{option.label}</div>
                    <div className="text-xs text-slate-400">
                      {option.description}
                    </div>
                  </div>
                  <div
                    className="h-10 w-10 rounded-lg border border-border-dark bg-surface-dark/60"
                    style={{
                      background:
                        previewMap[option.id] ??
                        "linear-gradient(140deg, rgb(13,17,23), rgb(88,166,255))",
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
