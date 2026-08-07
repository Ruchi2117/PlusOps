import { IncidentDomainError } from "./incident-domain.error";

const maxCustomerImpactLength = 1000;

export class CustomerImpact {
  private constructor(readonly value: string) {}

  static optional(value: string | null | undefined): CustomerImpact | null {
    if (value === null || value === undefined) {
      return null;
    }

    const normalized = value.trim();

    if (!normalized) {
      return null;
    }

    if (normalized.length > maxCustomerImpactLength) {
      throw new IncidentDomainError("Customer impact must be 1000 characters or fewer.");
    }

    return new CustomerImpact(normalized);
  }
}
