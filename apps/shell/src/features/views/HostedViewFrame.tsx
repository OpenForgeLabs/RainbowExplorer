"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "@/lib/theme";
import { useGlobalLoader } from "@/lib/globalLoader";

type HostedViewFrameProps = {
  srcBase: string;
  title: string;
};

type PluginLoaderMessage = {
  type: "shell:loader";
  active: boolean;
  message?: string;
};

const isPluginLoaderMessage = (value: unknown): value is PluginLoaderMessage => {
  if (!value || typeof value !== "object") return false;
  const raw = value as Record<string, unknown>;
  return (
    raw.type === "shell:loader" &&
    typeof raw.active === "boolean" &&
    (typeof raw.message === "string" || typeof raw.message === "undefined")
  );
};

export function HostedViewFrame({ srcBase, title }: HostedViewFrameProps) {
  const { theme, createThemeMessage } = useTheme();
  const { setExternalLoader } = useGlobalLoader();
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const frameOrigin = useMemo(() => new URL(srcBase).origin, [srcBase]);
  const loaderKey = useMemo(() => `plugin-loader:${frameOrigin}`, [frameOrigin]);

  const src = useMemo(() => {
    const url = new URL(srcBase);
    url.searchParams.set("theme", theme);
    return url.toString();
  }, [srcBase, theme]);

  const postThemeToFrame = () => {
    const frame = frameRef.current;
    if (!frame?.contentWindow) {
      return;
    }
    frame.contentWindow.postMessage(createThemeMessage(theme), "*");
  };

  useEffect(() => {
    postThemeToFrame();
  }, [theme, srcBase, createThemeMessage, frameOrigin]);

  useEffect(() => {
    const handler = (event: MessageEvent<unknown>) => {
      if (event.origin !== frameOrigin) {
        return;
      }
      if (!isPluginLoaderMessage(event.data)) {
        return;
      }
      setExternalLoader(loaderKey, event.data.active, event.data.message);
    };

    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
      setExternalLoader(loaderKey, false);
    };
  }, [frameOrigin, loaderKey, setExternalLoader]);

  return (
    <iframe
      ref={frameRef}
      title={title}
      src={src}
      className="h-full w-full border-0"
      onLoad={postThemeToFrame}
    />
  );
}
