"use client";

import { useState } from "react";
import { Switch } from "@openforgelabs/rainbow-ui";
import { useGlobalLoader } from "@/lib/globalLoader";

type PluginRegistryToggleProps = {
  pluginId: string;
  enabled: boolean;
};

export function PluginRegistryToggle({ pluginId, enabled }: PluginRegistryToggleProps) {
  const { withLoader } = useGlobalLoader();
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [isSaving, setIsSaving] = useState(false);

  const toggle = async () => {
    setIsSaving(true);
    try {
      const response = await withLoader(
        async () =>
          fetch("/api/plugins/registry/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pluginId, enabled: !isEnabled }),
          }),
        "Updating plugin availability...",
      );
      const data = await response.json();
      if (response.ok && data?.isSuccess) {
        setIsEnabled((prev) => !prev);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Switch
      checked={isEnabled}
      onCheckedChange={toggle}
      disabled={isSaving}
      label={isSaving ? "Saving..." : isEnabled ? "Enabled" : "Disabled"}
    />
  );
}
