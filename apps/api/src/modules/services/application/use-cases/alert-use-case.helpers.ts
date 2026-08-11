import { NotFoundException } from "@nestjs/common";

import type { AlertRule } from "../../domain";
import type { AlertRuleRepositoryPort } from "../ports";

export async function loadAlertRuleOrThrow(
  repository: AlertRuleRepositoryPort,
  alertRuleId: string
): Promise<AlertRule> {
  const alert = await repository.findById(alertRuleId);

  if (!alert) {
    throw new NotFoundException("Alert rule could not be found.");
  }

  return alert;
}
