import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { AlertListResponse, ListAlertsQuery } from "@plusops/contracts";

import { SYSTEM_PERMISSIONS } from "../../../auth/authorization/permission-catalog";
import { ALERT_RULE_REPOSITORY } from "../../services.tokens";
import { assertCanViewAlerts, type AlertActor } from "../alert-permissions";
import { toAlertListResponse } from "../mappers/alert-response.mapper";
import type { AlertRuleRepositoryPort } from "../ports";
import { hasPermission } from "../service-permissions";

export type ListAlertRulesCommand = ListAlertsQuery & {
  actor: AlertActor;
};

@Injectable()
export class ListAlertRulesUseCase {
  constructor(
    @Inject(ALERT_RULE_REPOSITORY)
    private readonly alertRuleRepository: AlertRuleRepositoryPort
  ) {}

  async execute(command: ListAlertRulesCommand): Promise<AlertListResponse> {
    assertCanViewAlerts(command.actor);

    if (command.includeDeleted && !hasPermission(command.actor, SYSTEM_PERMISSIONS.ALERTS_MANAGE)) {
      throw new ForbiddenException("Permission denied.");
    }

    const query = {
      page: command.page,
      pageSize: command.pageSize,
      filters: {
        search: command.search,
        state: command.state,
        severity: command.severity,
        serviceId: command.serviceId,
        includeDeleted: command.includeDeleted
      }
    };
    const result = await this.alertRuleRepository.list(query);

    return toAlertListResponse(query, result);
  }
}
