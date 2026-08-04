import { Controller, DefaultValuePipe, Get, Inject, ParseIntPipe, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { ListIncidentsResponse } from "@plusops/contracts";

import { ListIncidentsUseCase } from "../../application/use-cases/list-incidents.use-case";

@ApiTags("Incidents")
@Controller({
  path: "incidents",
  version: "1"
})
export class IncidentsController {
  constructor(
    @Inject(ListIncidentsUseCase)
    private readonly listIncidentsUseCase: ListIncidentsUseCase
  ) {}

  @Get()
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "pageSize", required: false, example: 20 })
  @ApiOkResponse({ description: "Paginated incidents" })
  async listIncidents(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("pageSize", new DefaultValuePipe(20), ParseIntPipe) pageSize: number
  ): Promise<ListIncidentsResponse> {
    return this.listIncidentsUseCase.execute(page, pageSize);
  }
}
