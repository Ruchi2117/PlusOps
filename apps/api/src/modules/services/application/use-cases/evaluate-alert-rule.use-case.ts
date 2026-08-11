import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { AlertEvaluationResponse, AlertState } from "@plusops/contracts";
import { randomUUID } from "node:crypto";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import {
  AlertEvaluation,
  AlertThreshold,
  AlertTimelineEvent,
  MetricQuery,
  type AlertRule
} from "../../domain";
import {
  ALERT_EVALUATION_REPOSITORY,
  ALERT_RULE_REPOSITORY,
  METRIC_QUERY_REPOSITORY
} from "../../services.tokens";
import { assertCanEvaluateAlerts, type AlertActor } from "../alert-permissions";
import { toAlertEvaluationResponse } from "../mappers/alert-response.mapper";
import type {
  AlertEvaluationRepositoryPort,
  AlertRuleRepositoryPort,
  MetricQueryRepositoryPort
} from "../ports";
import { rethrowAlertDomainError, rethrowMetricDomainError } from "../service-errors";
import { loadAlertRuleOrThrow } from "./alert-use-case.helpers";

export type EvaluateAlertRuleCommand = {
  alertRuleId: string;
  actor: AlertActor;
};

@Injectable()
export class EvaluateAlertRuleUseCase {
  constructor(
    @Inject(ALERT_RULE_REPOSITORY)
    private readonly alertRuleRepository: AlertRuleRepositoryPort,
    @Inject(ALERT_EVALUATION_REPOSITORY)
    private readonly alertEvaluationRepository: AlertEvaluationRepositoryPort,
    @Inject(METRIC_QUERY_REPOSITORY)
    private readonly metricQueryRepository: MetricQueryRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: EvaluateAlertRuleCommand): Promise<AlertEvaluationResponse> {
    assertCanEvaluateAlerts(command.actor);
    const alert = await loadAlertRuleOrThrow(this.alertRuleRepository, command.alertRuleId);

    if (!alert.toSnapshot().isEnabled) {
      throw new BadRequestException("Alert rule is disabled.");
    }

    const previousState = alert.state;
    const result = await this.evaluate(alert);
    alert.transitionTo(result.state, this.clock.now());

    const evaluation = AlertEvaluation.create({
      id: randomUUID(),
      alertRuleId: alert.id,
      previousState,
      state: result.state,
      observedValue: result.observedValue,
      thresholdSummary: result.thresholdSummary,
      message: result.message,
      evaluatedAt: this.clock.now(),
      createdAt: this.clock.now()
    });
    const timelineEvents = buildTimelineEvents({
      alert,
      previousState,
      evaluation,
      actorUserId: command.actor.id,
      createdAt: this.clock.now()
    });

    await this.alertRuleRepository.save(alert);
    await this.alertEvaluationRepository.save(evaluation, {
      alertRuleTimelineEvents: timelineEvents
    });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "alert.evaluated",
      entityType: "AlertEvaluation",
      entityId: evaluation.toSnapshot().id,
      metadata: {
        alertRuleId: alert.id,
        previousState,
        state: result.state,
        observedValue: result.observedValue
      }
    });

    if (result.state === "resolved") {
      await this.auditLog.record({
        actorUserId: command.actor.id,
        action: "alert.resolved",
        entityType: "AlertRule",
        entityId: alert.id,
        metadata: {
          previousState,
          observedValue: result.observedValue
        }
      });
    }

    return toAlertEvaluationResponse(alert, evaluation);
  }

  private async evaluate(alert: AlertRule): Promise<{
    state: AlertState;
    observedValue: number | null;
    thresholdSummary: string;
    message: string;
  }> {
    const snapshot = alert.toSnapshot();
    const now = this.clock.now();

    if (snapshot.mutedUntil && snapshot.mutedUntil > now) {
      return {
        state: "muted",
        observedValue: null,
        thresholdSummary: AlertThreshold.create(snapshot.condition.threshold).summary(),
        message: "Alert rule is muted."
      };
    }

    const query = createMetricQuery(alert, now);
    const queryResult = await this.metricQueryRepository.execute(query);
    const observedValue = queryResult.points[0]?.value ?? null;
    const threshold = createThreshold(snapshot.condition.threshold);
    const thresholdSummary = threshold.summary();

    if (observedValue === null) {
      return {
        state: "pending",
        observedValue,
        thresholdSummary,
        message: "No matching metric data is available yet."
      };
    }

    if (threshold.evaluate(observedValue)) {
      return {
        state: "firing",
        observedValue,
        thresholdSummary,
        message: `Observed value ${observedValue} breached threshold ${thresholdSummary}.`
      };
    }

    return {
      state: snapshot.state === "firing" ? "resolved" : "ok",
      observedValue,
      thresholdSummary,
      message: `Observed value ${observedValue} is within threshold ${thresholdSummary}.`
    };
  }
}

function createMetricQuery(alert: AlertRule, now: Date): MetricQuery {
  const condition = alert.toSnapshot().condition;
  const startTime = new Date(now.getTime() - condition.evaluationWindowSeconds * 1000);

  try {
    return MetricQuery.create({
      metricName: condition.metricName,
      metricDefinitionId: condition.metricDefinitionId,
      serviceId: condition.serviceId,
      startTime,
      endTime: now,
      filters: condition.filters,
      groupBy: [],
      aggregation: condition.aggregation,
      percentile: condition.percentile,
      page: 1,
      pageSize: 1,
      sortBy: "timestamp",
      sortDirection: "desc",
      limit: 1000
    });
  } catch (error) {
    rethrowMetricDomainError(error);
  }
}

function createThreshold(
  input: ReturnType<AlertRule["toSnapshot"]>["condition"]["threshold"]
): AlertThreshold {
  try {
    return AlertThreshold.create(input);
  } catch (error) {
    rethrowAlertDomainError(error);
  }
}

function buildTimelineEvents(input: {
  alert: AlertRule;
  previousState: AlertState;
  evaluation: AlertEvaluation;
  actorUserId: string;
  createdAt: Date;
}): AlertTimelineEvent[] {
  const evaluationSnapshot = input.evaluation.toSnapshot();
  const events = [
    AlertTimelineEvent.create({
      id: randomUUID(),
      alertRuleId: input.alert.id,
      actorUserId: input.actorUserId,
      type: "alert_evaluated",
      message: evaluationSnapshot.message,
      fromState: input.previousState,
      toState: evaluationSnapshot.state,
      metadata: {
        observedValue: evaluationSnapshot.observedValue,
        thresholdSummary: evaluationSnapshot.thresholdSummary
      },
      createdAt: input.createdAt
    })
  ];

  if (input.previousState === "firing" && evaluationSnapshot.state === "resolved") {
    events.push(
      AlertTimelineEvent.create({
        id: randomUUID(),
        alertRuleId: input.alert.id,
        actorUserId: input.actorUserId,
        type: "alert_resolved",
        message: "Alert resolved.",
        fromState: input.previousState,
        toState: "resolved",
        metadata: null,
        createdAt: input.createdAt
      })
    );
  }

  return events;
}
