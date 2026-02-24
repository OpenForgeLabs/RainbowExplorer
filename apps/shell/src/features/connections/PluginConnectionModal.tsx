"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Modal, useToast } from "@openforgelabs/rainbow-ui";
import type { FieldDefinition, PluginManifest } from "@openforgelabs/rainbow-contracts";
import { FieldRenderer } from "@/features/connections/FieldRenderer";
import { useGlobalLoader } from "@/lib/globalLoader";

type PluginConnectionModalProps = {
  open: boolean;
  plugin: PluginManifest;
  onClose: () => void;
  onSaved?: () => void;
  initialValues?: Record<string, string | number | boolean | null>;
};

type StatusState = {
  state: "idle" | "loading" | "success" | "error";
  message: string;
};

const defaultStatus: StatusState = { state: "idle", message: "" };
const shellConnectionFields: FieldDefinition[] = [
  {
    id: "name",
    label: "Display Name",
    type: "text",
    placeholder: "e.g. Production Redis Cache",
    required: true,
  },
  {
    id: "environment",
    label: "Environment",
    type: "select",
    required: true,
    defaultValue: "development",
    options: [
      { label: "development", value: "development" },
      { label: "staging", value: "staging" },
      { label: "production", value: "production" },
    ],
  },
];

export function PluginConnectionModal({
  open,
  plugin,
  onClose,
  onSaved,
  initialValues,
}: PluginConnectionModalProps) {
  const { pushToast } = useToast();
  const [values, setValues] = useState<Record<string, string | number | boolean | null>>({});
  const [testStatus, setTestStatus] = useState<StatusState>(defaultStatus);
  const [saveStatus, setSaveStatus] = useState<StatusState>(defaultStatus);
  const { withLoader } = useGlobalLoader();
  const fields = useMemo(() => {
    const pluginFields = plugin.connections.schema.fields;
    const merged = [...shellConnectionFields];
    for (const field of pluginFields) {
      if (merged.some((candidate) => candidate.id === field.id)) {
        continue;
      }
      merged.push(field);
    }
    return merged;
  }, [plugin.connections.schema.fields]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (initialValues) {
      setValues(initialValues);
    } else {
      const nextValues: Record<string, string | number | boolean | null> = {};
      for (const field of fields) {
        nextValues[field.id] =
          field.defaultValue ?? (field.type === "checkbox" ? false : "");
      }
      setValues(nextValues);
    }
    setTestStatus(defaultStatus);
    setSaveStatus(defaultStatus);
  }, [fields, initialValues, open]);

  const hasName = useMemo(() => {
    const nameValue = values.name;
    return typeof nameValue === "string" && nameValue.trim().length > 0;
  }, [values.name]);
  const missingRequiredField = useMemo(() => {
    for (const field of fields) {
      if (!field.required) {
        continue;
      }
      const raw = values[field.id];
      if (field.type === "checkbox") {
        if (typeof raw !== "boolean") {
          return field;
        }
        continue;
      }
      if (raw === null || raw === undefined) {
        return field;
      }
      if (typeof raw === "string" && raw.trim().length === 0) {
        return field;
      }
    }
    return null;
  }, [fields, values]);

  const requestBody = useMemo(() => ({ ...values }), [values]);

  const resolveEndpoint = (path: string) => {
    if (path.startsWith("/api/")) {
      return path;
    }
    const trimmed = path.replace(/^\//, "");
    if (!trimmed) {
      return `/api/connections/${plugin.id}`;
    }
    return `/api/connections/${plugin.id}/${trimmed}`;
  };

  const request = async (path: string, method: "POST" | "PUT") => {
    const response = await fetch(resolveEndpoint(path), {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const data = await response.json();
    return { ok: response.ok, data };
  };

  const handleTest = async () => {
    setTestStatus({ state: "loading", message: "" });
    setSaveStatus(defaultStatus);

    if (!hasName) {
      const message = "Display name is required to test the connection.";
      setTestStatus({ state: "error", message });
      pushToast({
        title: "Missing display name",
        message,
        variant: "error",
      });
      return;
    }
    if (missingRequiredField) {
      const message = `${missingRequiredField.label} is required to test the connection.`;
      setTestStatus({ state: "error", message });
      pushToast({
        title: "Missing required field",
        message,
        variant: "error",
      });
      return;
    }

    const { ok, data } = await withLoader(
      async () => request("test", "POST"),
      "Testing connection...",
    );
    if (!ok || !data?.isSuccess) {
      const message =
        data?.reasons?.[0] ?? data?.message ?? "Test connection failed.";
      setTestStatus({ state: "error", message });
      pushToast({ title: "Test failed", message, variant: "error" });
      return;
    }

    setTestStatus({ state: "success", message: "Connection successful." });
    pushToast({
      title: "Connection successful",
      message: "Connection test succeeded.",
      variant: "success",
    });
  };

  const handleSave = async () => {
    setSaveStatus({ state: "loading", message: "" });
    setTestStatus(defaultStatus);

    if (!hasName) {
      const message = "Display name is required.";
      setSaveStatus({ state: "error", message });
      pushToast({ title: "Missing display name", message, variant: "error" });
      return;
    }
    if (missingRequiredField) {
      const message = `${missingRequiredField.label} is required.`;
      setSaveStatus({ state: "error", message });
      pushToast({ title: "Missing required field", message, variant: "error" });
      return;
    }

    const { ok, data } = await withLoader(
      async () => request("", "POST"),
      "Saving connection...",
    );
    if (!ok || !data?.isSuccess) {
      const message =
        data?.reasons?.[0] ?? data?.message ?? "Failed to save connection.";
      setSaveStatus({ state: "error", message });
      pushToast({ title: "Save failed", message, variant: "error" });
      return;
    }

    setSaveStatus({ state: "success", message: "Connection saved." });
    pushToast({
      title: "Connection saved",
      message: "The connection was added successfully.",
      variant: "success",
    });
    window.dispatchEvent(new Event("connections:refresh"));
    onSaved?.();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={plugin.connections.schema.title}
      description={plugin.connections.schema.description}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button variant="outline" tone="neutral" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-3">
            <Button
              variant="ghost" tone="neutral"
              className="gap-2 border border-transparent bg-accent text-accent-foreground shadow-[var(--rx-shadow-sm)] hover:bg-accent-hover"
              onClick={handleTest}
              disabled={testStatus.state === "loading"}
            >
              <span className="material-symbols-outlined text-lg">bolt</span>
              {testStatus.state === "loading" ? "Testing..." : "Test Connection"}
            </Button>
            <Button onClick={handleSave} disabled={saveStatus.state === "loading"}>
              {saveStatus.state === "loading" ? "Saving..." : "Add Connection"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {fields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={values[field.id] ?? ""}
            onChange={(value) =>
              setValues((previous) => ({ ...previous, [field.id]: value }))
            }
          />
        ))}

        {testStatus.state !== "idle" && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              testStatus.state === "success"
                ? "border-transparent bg-success text-success-foreground shadow-[var(--rx-shadow-sm)]"
                : testStatus.state === "error"
                  ? "border-transparent bg-danger text-danger-foreground shadow-[var(--rx-shadow-sm)]"
                  : "border-border bg-surface-2 text-muted-foreground"
            }`}
          >
            {testStatus.state === "loading" ? "Testing connection..." : testStatus.message}
          </div>
        )}

        {saveStatus.state !== "idle" && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              saveStatus.state === "success"
                ? "border-transparent bg-success text-success-foreground shadow-[var(--rx-shadow-sm)]"
                : saveStatus.state === "error"
                  ? "border-transparent bg-danger text-danger-foreground shadow-[var(--rx-shadow-sm)]"
                  : "border-border bg-surface-2 text-muted-foreground"
            }`}
          >
            {saveStatus.state === "loading" ? "Saving connection..." : saveStatus.message}
          </div>
        )}
      </div>
    </Modal>
  );
}
