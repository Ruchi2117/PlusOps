import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { AlertTimelineEvent } from "../../domain";
import { ALERT_RULE_REPOSITORY } from "../../services.tokens";
import { assertCanManageAlerts, type AlertActor } from "../alert-permissions";
import type { AlertRuleRepositoryPort } from "../ports";
import { loadAlertRuleOrThrow } from "./alert-use-case.helpers";

export type ArchiveAlertRuleCommand = {
  alertRuleId: string;
  actor: AlertActor;
};

@Injectable()
export class ArchiveAlertRuleUseCase {
  constructor(
    @Inject(ALERT_RULE_REPOSITORY)
    private readonly alertRuleRepository: AlertRuleRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: ArchiveAlertRuleCommand): Promise<void> {
    assertCanManageAlerts(command.actor);
    const alert = await loadAlertRuleOrThrow(this.alertRuleRepository, command.alertRuleId);

    alert.archive(this.clock.now());
    const timelineEvent = AlertTimelineEvent.create({
      id: randomUUID(),
      alertRuleId: alert.id,
      actorUserId: command.actor.id,
      type: "alert_updated",
      message: `Alert ${alert.toSnapshot().name} archived.`,
      fromState: alert.state,
      toState: alert.state,
      metadata: { archived: true },
      createdAt: this.clock.now()
    });

    await this.alertRuleRepository.save(alert, { timelineEvents: [timelineEvent] });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "alert.archived",
      entityType: "AlertRule",
      entityId: alert.id,
      metadata: {}
    });
  }
}
