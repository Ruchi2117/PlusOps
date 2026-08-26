import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

import type { Environment } from "../../config/environment";
import { RedisRateLimitStore } from "./infrastructure/redis/redis-rate-limit-store";
import { RATE_LIMIT_STORE, REDIS_CLIENT } from "./reliability.tokens";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>): Redis | null => {
        const url = config.get("REDIS_URL", { infer: true });
        if (!url) return null;

        const client = new Redis(url, {
          lazyConnect: true,
          connectTimeout: config.get("REDIS_CONNECT_TIMEOUT_MS", { infer: true }),
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null
        });
        client.on("error", () => undefined);
        return client;
      }
    },
    {
      provide: RATE_LIMIT_STORE,
      useClass: RedisRateLimitStore
    }
  ],
  exports: [RATE_LIMIT_STORE]
})
export class ReliabilityModule {}
