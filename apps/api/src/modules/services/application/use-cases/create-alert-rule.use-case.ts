import { Inject, Injectable } from "@nestjs/common";
import type { AlertRuleResponse, CreateAlertRuleRequest } from "@plusops/contracts";
import { randomUUID } from "node:crypto";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { AlertRule, AlertTimelineEvent } from "../../domain";
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
import {
  loadMetricDefinitionOrThrow,
  loadServiceOrThrowForMetrics
} from "./metric-use-case.helpers";

export type CreateAlertRuleCommand = CreateAlertRuleRequest & {
  actor: AlertActor;
};

@Injectable()
export class CreateAlertRuleUseCase {
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

  async execute(command: CreateAlertRuleCommand): Promise<AlertRuleResponse> {
    assertCanManageAlerts(command.actor);
    await this.validateReferences(command);

    const alert = createAlertRule(command, this.clock.now());
    const timelineEvent = createAlertTimelineEvent({
      alert,
      actorUserId: command.actor.id,
      type: "alert_created",
      message: `Alert ${alert.toSnapshot().name} created.`,
      createdAt: this.clock.now()
    });

    await this.alertRuleRepository.save(alert, { timelineEvents: [timelineEvent] });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "alert.created",
      entityType: "AlertRule",
      entityId: alert.id,
      metadata: {
        severity: alert.toSnapshot().severity,
        metricName: alert.toSnapshot().condition.metricName,
        metricDefinitionId: alert.toSnapshot().condition.metricDefinitionId
      }
    });

    return toAlertRuleResponse(alert);
  }

  private async validateReferences(command: CreateAlertRuleCommand): Promise<void> {
    if (command.condition.serviceId) {
      await loadServiceOrThrowForMetrics(this.serviceRepository, command.condition.serviceId);
    }

    if (command.condition.metricDefinitionId) {
      await loadMetricDefinitionOrThrow(
        this.metricDefinitionRepository,
        command.condition.metricDefinitionId
      );
    }
  }
}

function createAlertRule(command: CreateAlertRuleCommand, createdAt: Date): AlertRule {
  try {
    return AlertRule.create({
      id: randomUUID(),
      name: command.name,
      description: command.description,
      severity: command.severity,
      condition: command.condition,
      isEnabled: command.isEnabled,
      mutedUntil: command.mutedUntil ? new Date(command.mutedUntil) : null,
      createdAt
    });
  } catch (error) {
    rethrowAlertDomainError(error);
  }
}

function createAlertTimelineEvent(input: {
  alert: AlertRule;
  actorUserId: string;
  type: "alert_created";
  message: string;
  createdAt: Date;
}): AlertTimelineEvent {
  return AlertTimelineEvent.create({
    id: randomUUID(),
    alertRuleId: input.alert.id,
    actorUserId: input.actorUserId,
    type: input.type,
    message: input.message,
    fromState: null,
    toState: input.alert.state,
    metadata: null,
    createdAt: input.createdAt
  });
}
