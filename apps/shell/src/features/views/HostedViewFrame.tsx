"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "@/lib/theme";

type HostedViewFrameProps = {
  srcBase: string;
  title: string;
};

export function HostedViewFrame({ srcBase, title }: HostedViewFrameProps) {
  const { theme, createThemeMessage } = useTheme();
  const frameRef = useRef<HTMLIFrameElement | null>(null);

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

    frame.contentWindow.postMessage(
      createThemeMessage(theme),
      new URL(srcBase).origin,
    );
  };

  useEffect(() => {
    postThemeToFrame();
  }, [theme, srcBase, createThemeMessage]);

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
