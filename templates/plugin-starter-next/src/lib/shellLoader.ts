type LoaderToken = string;

const DEFAULT_MESSAGE = "Loading plugin data...";
const activeTokens = new Set<LoaderToken>();

const createToken = () =>
  `shell-loader-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function canNotifyShell() {
  return (
    typeof window !== "undefined" &&
    typeof window.parent !== "undefined" &&
    window.parent !== window
  );
}

function postShellLoader(active: boolean, message?: string) {
  if (!canNotifyShell()) return;
  window.parent.postMessage(
    {
      type: "shell:loader",
      active,
      message: message?.trim() || DEFAULT_MESSAGE,
    },
    "*",
  );
}

export function startShellLoader(message?: string): LoaderToken {
  const token = createToken();
  activeTokens.add(token);
  postShellLoader(true, message);
  return token;
}

export function stopShellLoader(token: LoaderToken) {
  if (!activeTokens.has(token)) return;
  activeTokens.delete(token);
  if (activeTokens.size === 0) {
    postShellLoader(false);
  }
}

export async function withShellLoader<T>(
  work: () => Promise<T>,
  message?: string,
): Promise<T> {
  const token = startShellLoader(message);
  try {
    return await work();
  } finally {
    stopShellLoader(token);
  }
}
