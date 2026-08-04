import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { HealthResponse } from "@plusops/contracts";

@ApiTags("Health")
@Controller({
  path: "health",
  version: "1"
})
export class HealthController {
  @Get()
  @ApiOkResponse({ description: "Service health status" })
  getHealth(): HealthResponse {
    return {
      status: "ok",
      service: "plusops-api",
      version: "0.1.0",
      timestamp: new Date().toISOString()
    };
  }
}
