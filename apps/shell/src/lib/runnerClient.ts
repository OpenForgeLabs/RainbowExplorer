const runnerUrl =
  process.env.PLUGIN_RUNNER_URL ??
  process.env.NEXT_PUBLIC_PLUGIN_RUNNER_URL ??
  "http://localhost:5099";

export const callRunner = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(`${runnerUrl}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await response.json()) as T;
  return data;
};
