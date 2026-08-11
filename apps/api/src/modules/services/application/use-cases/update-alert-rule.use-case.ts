import { Inject, Injectable } from "@nestjs/common";
import type { AlertRuleResponse, UpdateAlertRuleRequest } from "@plusops/contracts";
import { randomUUID } from "node:crypto";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { AlertTimelineEvent, type AlertRuleSnapshot } from "../../domain";
import {
  ALERT_RULE_REPOSITORY,
  METRIC_DEFINITION_REPOSITORY,
  SERVICE_REPOSITORY
} from "../../services.tokens";
import { assertCanManageAlerts, type AlertActor } from "../alert-permissions";
import { toAlertRuleResponse } from "../mappers/alert-response.mapper";
import type {
  AlertRuleRepositoryPort,
  MetricDefinitionRepositoryPort,
  ServiceRepositoryPort
} from "../ports";
import { rethrowAlertDomainError } from "../service-errors";
import { loadAlertRuleOrThrow } from "./alert-use-case.helpers";
import {
  loadMetricDefinitionOrThrow,
  loadServiceOrThrowForMetrics
} from "./metric-use-case.helpers";

export type UpdateAlertRuleCommand = UpdateAlertRuleRequest & {
  alertRuleId: string;
  actor: AlertActor;
};

@Injectable()
export class UpdateAlertRuleUseCase {
  constructor(
    @Inject(ALERT_RULE_REPOSITORY)
    private readonly alertRuleRepository: AlertRuleRepositoryPort,
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepositoryPort,
    @Inject(METRIC_DEFINITION_REPOSITORY)
    private readonly metricDefinitionRepository: MetricDefinitionRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: UpdateAlertRuleCommand): Promise<AlertRuleResponse> {
    assertCanManageAlerts(command.actor);
    const alert = await loadAlertRuleOrThrow(this.alertRuleRepository, command.alertRuleId);
    await this.validateReferences(command);
    const before = alert.toSnapshot();

    try {
      alert.update({
        name: command.name,
        description: command.description,
        severity: command.severity,
        condition: command.condition,
        isEnabled: command.isEnabled,
        mutedUntil:
          command.mutedUntil === undefined
            ? undefined
            : command.mutedUntil
              ? new Date(command.mutedUntil)
              : null,
        updatedAt: this.clock.now()
      });
    } catch (error) {
      rethrowAlertDomainError(error);
    }

    const timelineEvent = AlertTimelineEvent.create({
      id: randomUUID(),
      alertRuleId: alert.id,
      actorUserId: command.actor.id,
      type: "alert_updated",
      message: `Alert ${alert.toSnapshot().name} updated.`,
      fromState: before.state,
      toState: alert.state,
      metadata: { changedFields: changedFields(before, alert.toSnapshot()) },
      createdAt: this.clock.now()
    });

    await this.alertRuleRepository.save(alert, { timelineEvents: [timelineEvent] });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "alert.updated",
      entityType: "AlertRule",
      entityId: alert.id,
      metadata: {
        changedFields: changedFields(before, alert.toSnapshot())
      }
    });

    return toAlertRuleResponse(alert);
  }

  private async validateReferences(command: UpdateAlertRuleCommand): Promise<void> {
    if (command.condition?.serviceId) {
      await loadServiceOrThrowForMetrics(this.serviceRepository, command.condition.serviceId);
    }

    if (command.condition?.metricDefinitionId) {
      await loadMetricDefinitionOrThrow(
        this.metricDefinitionRepository,
        command.condition.metricDefinitionId
      );
    }
  }
}

function changedFields(before: AlertRuleSnapshot, after: AlertRuleSnapshot): string[] {
  return Object.entries(after)
    .filter(
      ([field, value]) => field !== "updatedAt" && before[field as keyof typeof before] !== value
    )
    .map(([field]) => field);
}
