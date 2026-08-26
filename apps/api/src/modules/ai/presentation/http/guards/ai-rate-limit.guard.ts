import { HttpException, HttpStatus, Inject, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import type { Request, Response } from "express";

import { AIRateLimiter } from "../../../application/ai-rate-limiter";
import type { AuthenticatedUser } from "../../../../auth/presentation/http/authenticated-user";

@Injectable()
export class AIRateLimitGuard implements CanActivate {
  constructor(
    @Inject(AIRateLimiter)
    private readonly rateLimiter: AIRateLimiter
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const response = context.switchToHttp().getResponse<Response>();

    if (request.method !== "POST" || !request.user) return true;

    const route = `${context.getClass().name}.${context.getHandler().name}`;
    const decision = await this.rateLimiter.consume({
      actorUserId: request.user.id,
      route
    });

    response.setHeader("X-RateLimit-Limit", String(decision.limit));
    response.setHeader("X-RateLimit-Remaining", String(decision.remaining));

    if (decision.degraded) {
      response.setHeader("X-RateLimit-Status", "degraded");
    }

    if (!decision.allowed) {
      response.setHeader("Retry-After", String(decision.retryAfterSeconds));
      throw new HttpException("AI request rate limit exceeded.", HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
