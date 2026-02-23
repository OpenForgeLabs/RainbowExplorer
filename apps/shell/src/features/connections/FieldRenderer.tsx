"use client";

import type { FieldDefinition } from "@openforgelabs/rainbow-contracts";
import { Checkbox, Input, Select, Textarea } from "@openforgelabs/rainbow-ui";

type FieldRendererProps = {
  field: FieldDefinition;
  value: string | number | boolean | null;
  onChange: (value: string | number | boolean | null) => void;
};

export function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
  if (field.type === "checkbox") {
    return (
      <Checkbox
        label={field.label}
        checked={Boolean(value)}
        onChange={(event) => onChange(event.target.checked)}
      />
    );
  }

  if (field.type === "select") {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">
          {field.label}
        </label>
        <Select
          className="h-11"
          value={value?.toString() ?? ""}
          onChange={(event) => onChange(event.target.value)}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">
          {field.label}
        </label>
        <Textarea
          className="min-h-[120px] resize-none p-3 font-mono text-xs"
          placeholder={field.placeholder}
          value={value?.toString() ?? ""}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">
        {field.label}
      </label>
      <Input
        className="h-11"
        type={field.type === "password" ? "password" : field.type}
        placeholder={field.placeholder}
        value={value?.toString() ?? ""}
        min={field.type === "number" ? field.min : undefined}
        max={field.type === "number" ? field.max : undefined}
        step={field.type === "number" ? field.step : undefined}
        onChange={(event) => {
          if (field.type === "number") {
            const raw = event.target.value;
            onChange(raw === "" ? "" : Number(raw));
            return;
          }
          onChange(event.target.value);
        }}
      />
    </div>
  );
}
