"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "@/lib/theme";

type HostedViewFrameProps = {
  srcBase: string;
  title: string;
};

export function HostedViewFrame({ srcBase, title }: HostedViewFrameProps) {
  const { theme } = useTheme();
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const src = useMemo(() => {
    const url = new URL(srcBase);
    url.searchParams.set("theme", theme);
    return url.toString();
  }, [srcBase, theme]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame?.contentWindow) {
      return;
    }
    frame.contentWindow.postMessage({ type: "theme", value: theme }, "*");
  }, [theme]);

  return (
    <iframe
      ref={frameRef}
      title={title}
      src={src}
      className="h-full w-full border-0"
    />
  );
}
