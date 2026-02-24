"use client";

import {
  createContext,
  type CSSProperties,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type LoaderToken = string;

type GlobalLoaderContextValue = {
  isVisible: boolean;
  message: string;
  begin: (message?: string) => LoaderToken;
  end: (token: LoaderToken) => void;
  withLoader: <T>(work: () => Promise<T>, message?: string) => Promise<T>;
  setExternalLoader: (key: string, active: boolean, message?: string) => void;
};

const DEFAULT_MESSAGE = "Working...";

const GlobalLoaderContext = createContext<GlobalLoaderContextValue | null>(null);

const createToken = () =>
  `loader-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const rainbowSpinnerStyle: CSSProperties = {
  background:
    "conic-gradient(from 0deg, rgb(var(--rx-color-primary)), rgb(var(--rx-color-accent)), rgb(var(--rx-color-success)), rgb(var(--rx-color-warning)), rgb(var(--rx-color-danger)), rgb(var(--rx-color-primary)))",
  WebkitMaskImage:
    "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))",
  maskImage:
    "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
};

type LoaderPresentation = {
  title: string;
  subtitle: string;
  icon: string;
};

function resolveLoaderPresentation(rawMessage: string): LoaderPresentation {
  const message = rawMessage.trim() || DEFAULT_MESSAGE;
  const normalized = message.toLowerCase();

  if (normalized.includes("install")) {
    return { title: "Installing Plugin", subtitle: message, icon: "download" };
  }
  if (normalized.includes("start")) {
    return { title: "Starting Service", subtitle: message, icon: "play_arrow" };
  }
  if (normalized.includes("stop")) {
    return { title: "Stopping Service", subtitle: message, icon: "stop" };
  }
  if (normalized.includes("remove") || normalized.includes("delete")) {
    return { title: "Removing Resource", subtitle: message, icon: "delete" };
  }
  if (normalized.includes("import")) {
    return { title: "Importing Data", subtitle: message, icon: "upload" };
  }
  if (normalized.includes("export")) {
    return { title: "Exporting Data", subtitle: message, icon: "download" };
  }
  if (normalized.includes("connect")) {
    return { title: "Connecting", subtitle: message, icon: "hub" };
  }
  if (normalized.includes("load") || normalized.includes("fetch") || normalized.includes("scan")) {
    return { title: "Loading Data", subtitle: message, icon: "sync" };
  }
  if (normalized.includes("save") || normalized.includes("update")) {
    return { title: "Saving Changes", subtitle: message, icon: "save" };
  }

  return { title: "Please wait", subtitle: message, icon: "hourglass_top" };
}

export function GlobalLoaderProvider({ children }: { children: React.ReactNode }) {
  const [internalLoaders, setInternalLoaders] = useState<Record<string, string>>({});
  const [externalLoaders, setExternalLoaders] = useState<Record<string, string>>({});
  const [latestMessage, setLatestMessage] = useState<string>(DEFAULT_MESSAGE);
  const latestMessageRef = useRef(DEFAULT_MESSAGE);

  const begin = useCallback((message?: string) => {
    const token = createToken();
    const nextMessage = message?.trim() || DEFAULT_MESSAGE;
    latestMessageRef.current = nextMessage;
    setLatestMessage(nextMessage);
    setInternalLoaders((prev) => ({ ...prev, [token]: nextMessage }));
    return token;
  }, []);

  const end = useCallback((token: string) => {
    setInternalLoaders((prev) => {
      if (!prev[token]) return prev;
      const next = { ...prev };
      delete next[token];
      return next;
    });
  }, []);

  const setExternalLoader = useCallback((key: string, active: boolean, message?: string) => {
    const nextMessage = message?.trim() || DEFAULT_MESSAGE;
    if (active) {
      latestMessageRef.current = nextMessage;
      setLatestMessage(nextMessage);
      setExternalLoaders((prev) => ({ ...prev, [key]: nextMessage }));
      return;
    }
    setExternalLoaders((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const withLoader = useCallback(
    async <T,>(work: () => Promise<T>, message?: string) => {
      const token = begin(message);
      try {
        return await work();
      } finally {
        end(token);
      }
    },
    [begin, end],
  );

  const effectiveMessage = useMemo(() => {
    const externalValues = Object.values(externalLoaders);
    if (externalValues.length) {
      return externalValues[externalValues.length - 1] || latestMessageRef.current;
    }
    const internalValues = Object.values(internalLoaders);
    if (internalValues.length) {
      return internalValues[internalValues.length - 1] || latestMessageRef.current;
    }
    return latestMessage || latestMessageRef.current;
  }, [externalLoaders, internalLoaders, latestMessage]);

  const isVisible = Object.keys(internalLoaders).length > 0 || Object.keys(externalLoaders).length > 0;
  const presentation = resolveLoaderPresentation(effectiveMessage);

  const value = useMemo<GlobalLoaderContextValue>(
    () => ({
      isVisible,
      message: effectiveMessage,
      begin,
      end,
      withLoader,
      setExternalLoader,
    }),
    [isVisible, effectiveMessage, begin, end, withLoader, setExternalLoader],
  );

  return (
    <GlobalLoaderContext.Provider value={value}>
      {children}
      {isVisible ? (
        <div className="pointer-events-auto fixed inset-0 z-[var(--rx-z-toast)] flex items-center justify-center bg-background/65 backdrop-blur-md">
          <div className="flex min-w-[320px] flex-col items-center gap-4 rounded-[var(--rx-radius-lg)] border border-border bg-surface/90 px-8 py-7 text-center text-foreground shadow-[var(--rx-shadow-lg)]">
            <div className="relative h-16 w-16">
              <div
                className="h-full w-full animate-spin rounded-full"
                style={rainbowSpinnerStyle}
                aria-hidden="true"
              />
              <div className="absolute inset-[14px] flex items-center justify-center rounded-full bg-surface" aria-hidden="true">
                <span className="material-symbols-outlined text-sm text-primary">{presentation.icon}</span>
              </div>
            </div>
            <div aria-live="polite">
              <div className="text-sm font-semibold text-foreground">{presentation.title}</div>
              <div className="text-xs text-subtle">{presentation.subtitle}</div>
            </div>
          </div>
        </div>
      ) : null}
    </GlobalLoaderContext.Provider>
  );
}

export function useGlobalLoader() {
  const context = useContext(GlobalLoaderContext);
  if (!context) {
    throw new Error("useGlobalLoader must be used within GlobalLoaderProvider.");
  }
  return context;
}
