export type RateLimitStoreResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export type OptionalDependencyHealth = {
  status: "available" | "unavailable" | "disabled";
  message: string;
};

export interface RateLimitStorePort {
  consume(input: {
    key: string;
    limit: number;
    windowSeconds: number;
  }): Promise<RateLimitStoreResult>;
  checkHealth(): Promise<OptionalDependencyHealth>;
}

export class RateLimitStoreUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RateLimitStoreUnavailableError";
  }
}
