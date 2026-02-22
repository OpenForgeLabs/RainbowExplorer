export type ApiResponse<T> = {
  isSuccess: boolean;
  message: string;
  reasons: string[];
  data: T;
};

export type RedisConnectionUpsertRequest = {
  name: string;
  connectionString?: string | null;
  host: string;
  port: number;
  password?: string | null;
  useTls: boolean;
  database?: number | null;
  environment?: "production" | "staging" | "development";
};

export type RedisConnectionInfo = {
  name: string;
  useTls: boolean;
  database?: number | null;
  isEditable: boolean;
  source: string;
  environment?: "production" | "staging" | "development";
};

export type RedisConnectionHealth = {
  connected: boolean;
  warning?: string | null;
};
