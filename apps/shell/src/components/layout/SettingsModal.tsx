"use client";

import { useEffect } from "react";
import { Modal } from "@openforgelabs/rainbow-ui";
import { useTheme } from "@/lib/theme";
import { rgbToHex } from "@/lib/themeRegistry";

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

const DEFAULT_PREVIEW = "linear-gradient(140deg, rgb(13,17,23), rgb(88,166,255))";

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { theme, setTheme, themes, reloadThemes } = useTheme();

  useEffect(() => {
    if (!open) {
      return;
    }
    void reloadThemes();
  }, [open, reloadThemes]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      description="Personaliza la apariencia del shell."
    >
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Theme</h3>
          <p className="text-xs text-muted-foreground">
            Elige un tema para esta sesión.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {themes.map((option) => {
            const isActive = option.id === theme;
            const from = option.tokens?.["--rx-color-bg"];
            const to = option.tokens?.["--rx-color-primary"];
            const preview = from && to
              ? `linear-gradient(140deg, ${rgbToHex(from)}, ${rgbToHex(to)})`
              : DEFAULT_PREVIEW;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setTheme(option.id);
                }}
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-transparent bg-primary text-primary-foreground shadow-[var(--rx-shadow-sm)]"
                    : "border-border bg-surface-2 text-foreground hover:border-primary/60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{option.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                  <div
                    className="h-10 w-10 rounded-lg border border-border bg-surface-2"
                    style={{ background: preview }}
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
