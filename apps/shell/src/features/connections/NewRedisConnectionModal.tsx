"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Input, Modal, Select, Textarea, useToast } from "@openforgelabs/rainbow-ui";
import type { RedisConnectionUpsertRequest } from "@/lib/types";

type NewRedisConnectionModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

const DEFAULT_PORT = 6379;

export function NewRedisConnectionModal({
  open,
  onClose,
  onSaved,
}: NewRedisConnectionModalProps) {
  const { pushToast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [useConnectionString, setUseConnectionString] = useState(true);
  const [connectionString, setConnectionString] = useState("");
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState(DEFAULT_PORT);
  const [password, setPassword] = useState("");
  const [useTls, setUseTls] = useState(false);
  const [database, setDatabase] = useState<number | "">("");
  const [environment, setEnvironment] = useState<
    "production" | "staging" | "development"
  >("development");
  const [testStatus, setTestStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [testMessage, setTestMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setDisplayName("");
    setUseConnectionString(true);
    setConnectionString("");
    setHost("localhost");
    setPort(DEFAULT_PORT);
    setPassword("");
    setUseTls(false);
    setDatabase("");
    setEnvironment("development");
    setTestStatus("idle");
    setTestMessage("");
    setSaveStatus("idle");
    setSaveMessage("");
  }, [open]);

  const requestBody: RedisConnectionUpsertRequest = useMemo(
    () => ({
      name: displayName.trim(),
      connectionString: useConnectionString
        ? connectionString.trim() || null
        : null,
      host: useConnectionString ? "" : host.trim(),
      port,
      password: useConnectionString ? null : password.trim() || null,
      useTls,
      database: database === "" ? null : database,
      environment,
    }),
    [
      displayName,
      useConnectionString,
      connectionString,
      host,
      port,
      password,
      useTls,
      database,
      environment,
    ],
  );

  const handleTest = async () => {
    setTestStatus("loading");
    setTestMessage("");
    setSaveStatus("idle");
    setSaveMessage("");

    if (!requestBody.name) {
      setTestStatus("error");
      setTestMessage("Display name is required to test the connection.");
      pushToast({
        title: "Missing display name",
        message: "Display name is required to test the connection.",
        variant: "error",
      });
      return;
    }

    const response = await fetch("/api/connections/redis/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      setTestStatus("error");
      setTestMessage("Failed to reach the Redis test endpoint.");
      pushToast({
        title: "Test failed",
        message: "Failed to reach the Redis test endpoint.",
        variant: "error",
      });
      return;
    }

    const data = (await response.json()) as {
      isSuccess: boolean;
      message?: string;
      reasons?: string[];
    };

    if (!data.isSuccess) {
      const message =
        data.reasons?.[0] ?? data.message ?? "Test connection failed.";
      setTestStatus("error");
      setTestMessage(message);
      pushToast({
        title: "Test failed",
        message,
        variant: "error",
      });
      return;
    }

    setTestStatus("success");
    setTestMessage("Connection successful.");
    pushToast({
      title: "Connection successful",
      message: "Redis connection test succeeded.",
      variant: "success",
    });
  };

  const handleSave = async () => {
    setSaveStatus("loading");
    setSaveMessage("");
    setTestStatus("idle");
    setTestMessage("");

    if (!requestBody.name) {
      setSaveStatus("error");
      setSaveMessage("Display name is required.");
      pushToast({
        title: "Missing display name",
        message: "Display name is required.",
        variant: "error",
      });
      return;
    }

    const response = await fetch("/api/connections/redis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      setSaveStatus("error");
      setSaveMessage("Failed to reach the connections endpoint.");
      pushToast({
        title: "Save failed",
        message: "Failed to reach the connections endpoint.",
        variant: "error",
      });
      return;
    }

    const data = (await response.json()) as {
      isSuccess: boolean;
      message?: string;
      reasons?: string[];
    };

    if (!data.isSuccess) {
      const message =
        data.reasons?.[0] ?? data.message ?? "Failed to save connection.";
      setSaveStatus("error");
      setSaveMessage(message);
      pushToast({
        title: "Save failed",
        message,
        variant: "error",
      });
      return;
    }

    setSaveStatus("success");
    setSaveMessage("Connection saved.");
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
      title="Add Redis Connection"
      description="Add a Redis connection using a connection string or host credentials."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="gap-2 border border-action/30"
              onClick={handleTest}
              disabled={testStatus === "loading"}
            >
              <span className="material-symbols-outlined text-lg">bolt</span>
              {testStatus === "loading" ? "Testing..." : "Test Connection"}
            </Button>
            <Button onClick={handleSave} disabled={saveStatus === "loading"}>
              {saveStatus === "loading" ? "Saving..." : "Add Connection"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-200">
            Display Name
          </label>
          <Input
            className="h-12 px-4 text-slate-200"
            placeholder="e.g. Production Redis Cache"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-border-dark/60 bg-surface-dark/30 p-4">
          <div className="flex flex-wrap gap-3">
            <button
              className={`rounded-full px-3 py-1 text-xs font-semibold ${useConnectionString ? "bg-action/20 text-action" : "bg-surface-dark text-slate-400"}`}
              type="button"
              onClick={() => setUseConnectionString(true)}
            >
              Connection String
            </button>
            <button
              className={`rounded-full px-3 py-1 text-xs font-semibold ${!useConnectionString ? "bg-action/20 text-action" : "bg-surface-dark text-slate-400"}`}
              type="button"
              onClick={() => setUseConnectionString(false)}
            >
              Host Credentials
            </button>
          </div>

          {useConnectionString ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-200">
                Connection String
              </label>
              <Textarea
                className="min-h-[120px] resize-none p-4 font-mono text-xs text-slate-200"
                placeholder="localhost:6379,password=...,ssl=False,defaultDatabase=0"
                value={connectionString}
                onChange={(event) => setConnectionString(event.target.value)}
              />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-200">
                  Host
                </label>
                <Input
                  className="h-11 text-slate-200"
                  placeholder="localhost"
                  value={host}
                  onChange={(event) => setHost(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-200">
                  Port
                </label>
                <Input
                  className="h-11 text-slate-200"
                  type="number"
                  value={port}
                  onChange={(event) => setPort(Number(event.target.value))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-200">
                  Password
                </label>
                <Input
                  className="h-11 text-slate-200"
                  placeholder="optional"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-200">
                  Database
                </label>
                <Input
                  className="h-11 text-slate-200"
                  type="number"
                  placeholder="0"
                  value={database}
                  onChange={(event) =>
                    setDatabase(
                      event.target.value === ""
                        ? ""
                        : Number(event.target.value),
                    )
                  }
                />
              </div>
              <Checkbox
                label="Use TLS (SSL)"
                checked={useTls}
                onChange={(event) => setUseTls(event.target.checked)}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-200">
              Environment
            </label>
            <Select
              className="h-11 text-slate-200"
              value={environment}
              onChange={(event) =>
                setEnvironment(
                  event.target.value as "production" | "staging" | "development",
                )
              }
            >
              <option value="development">development</option>
              <option value="staging">staging</option>
              <option value="production">production</option>
            </Select>
          </div>
        </div>

        {testStatus !== "idle" && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              testStatus === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : testStatus === "error"
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                  : "border-border-dark bg-surface-dark/60 text-slate-300"
            }`}
          >
            {testStatus === "loading" ? "Testing connection..." : testMessage}
          </div>
        )}
        {saveStatus !== "idle" && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              saveStatus === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : saveStatus === "error"
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                  : "border-border-dark bg-surface-dark/60 text-slate-300"
            }`}
          >
            {saveStatus === "loading" ? "Saving connection..." : saveMessage}
          </div>
        )}
      </div>
    </Modal>
  );
}
