import { IncidentDomainError } from "./incident-domain.error";

const minTitleLength = 3;
const maxTitleLength = 160;

export class IncidentTitle {
  private constructor(readonly value: string) {}

  static create(value: string): IncidentTitle {
    const normalized = value.trim();

    if (normalized.length < minTitleLength) {
      throw new IncidentDomainError("Incident title must be at least 3 characters.");
    }

    if (normalized.length > maxTitleLength) {
      throw new IncidentDomainError("Incident title must be 160 characters or fewer.");
    }

    return new IncidentTitle(normalized);
  }
}
