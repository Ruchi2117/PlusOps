import type { AlertState } from "@plusops/contracts";

import { AlertDomainError } from "./alert-domain.error";

export type AlertEvaluationSnapshot = {
  id: string;
  alertRuleId: string;
  previousState: AlertState | null;
  state: AlertState;
  observedValue: number | null;
  thresholdSummary: string;
  message: string;
  evaluatedAt: Date;
  createdAt: Date;
};

export class AlertEvaluation {
  private constructor(private snapshot: AlertEvaluationSnapshot) {
    validateSnapshot(snapshot);
  }

  static create(snapshot: AlertEvaluationSnapshot): AlertEvaluation {
    return new AlertEvaluation({
      ...snapshot,
      thresholdSummary: snapshot.thresholdSummary.trim(),
      message: snapshot.message.trim()
    });
  }

  static restore(snapshot: AlertEvaluationSnapshot): AlertEvaluation {
    return AlertEvaluation.create(snapshot);
  }

  toSnapshot(): AlertEvaluationSnapshot {
    return { ...this.snapshot };
  }
}

function validateSnapshot(snapshot: AlertEvaluationSnapshot): void {
  if (!["ok", "pending", "firing", "resolved", "muted"].includes(snapshot.state)) {
    throw new AlertDomainError("Alert evaluation state is invalid.");
  }

  if (snapshot.observedValue !== null && !Number.isFinite(snapshot.observedValue)) {
    throw new AlertDomainError("Alert evaluation observed value must be finite.");
  }

  if (snapshot.thresholdSummary.length < 1 || snapshot.thresholdSummary.length > 500) {
    throw new AlertDomainError("Alert evaluation threshold summary is invalid.");
  }

  if (snapshot.message.length < 1 || snapshot.message.length > 1000) {
    throw new AlertDomainError("Alert evaluation message is invalid.");
  }
}
