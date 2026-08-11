import { Inject, Injectable } from "@nestjs/common";
import type { AlertRuleResponse } from "@plusops/contracts";

import { ALERT_RULE_REPOSITORY } from "../../services.tokens";
import { assertCanViewAlerts, type AlertActor } from "../alert-permissions";
import { toAlertRuleResponse } from "../mappers/alert-response.mapper";
import type { AlertRuleRepositoryPort } from "../ports";
import { loadAlertRuleOrThrow } from "./alert-use-case.helpers";

export type GetAlertRuleCommand = {
  alertRuleId: string;
  actor: AlertActor;
};

@Injectable()
export class GetAlertRuleUseCase {
  constructor(
    @Inject(ALERT_RULE_REPOSITORY)
    private readonly alertRuleRepository: AlertRuleRepositoryPort
  ) {}

  async execute(command: GetAlertRuleCommand): Promise<AlertRuleResponse> {
    assertCanViewAlerts(command.actor);
    const alert = await loadAlertRuleOrThrow(this.alertRuleRepository, command.alertRuleId);

    return toAlertRuleResponse(alert);
  }
}
