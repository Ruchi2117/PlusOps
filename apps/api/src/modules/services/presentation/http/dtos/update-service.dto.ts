import { PartialType } from "@nestjs/swagger";
import type { UpdateServiceRequest } from "@plusops/contracts";

import { CreateServiceDto } from "./create-service.dto";

export class UpdateServiceDto
  extends PartialType(CreateServiceDto)
  implements UpdateServiceRequest {}
