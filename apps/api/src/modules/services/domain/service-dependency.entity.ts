import { ServiceDomainError } from "./service-domain.error";

export type ServiceDependencySnapshot = {
  id: string;
  upstreamServiceId: string;
  downstreamServiceId: string;
  description: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  deletedAt: Date | null;
};

export type CreateServiceDependencyInput = {
  id: string;
  upstreamServiceId: string;
  downstreamServiceId: string;
  description?: string | null;
  createdByUserId?: string | null;
  createdAt: Date;
};

export class ServiceDependency {
  private constructor(private snapshot: ServiceDependencySnapshot) {
    validateSnapshot(snapshot);
  }

  static create(input: CreateServiceDependencyInput): ServiceDependency {
    return new ServiceDependency({
      id: input.id,
      upstreamServiceId: input.upstreamServiceId,
      downstreamServiceId: input.downstreamServiceId,
      description: normalizeOptionalText(input.description),
      createdByUserId: input.createdByUserId ?? null,
      createdAt: input.createdAt,
      deletedAt: null
    });
  }

  static restore(snapshot: ServiceDependencySnapshot): ServiceDependency {
    return new ServiceDependency({
      ...snapshot,
      description: normalizeOptionalText(snapshot.description)
    });
  }

  get id(): string {
    return this.snapshot.id;
  }

  get upstreamServiceId(): string {
    return this.snapshot.upstreamServiceId;
  }

  markDeleted(deletedAt: Date): void {
    if (this.snapshot.deletedAt) {
      return;
    }

    this.snapshot = {
      ...this.snapshot,
      deletedAt
    };
  }

  toSnapshot(): ServiceDependencySnapshot {
    return { ...this.snapshot };
  }
}

function validateSnapshot(snapshot: ServiceDependencySnapshot): void {
  if (snapshot.upstreamServiceId === snapshot.downstreamServiceId) {
    throw new ServiceDomainError("A service cannot depend on itself.");
  }

  if (snapshot.description && snapshot.description.length > 500) {
    throw new ServiceDomainError("Service dependency description must be 500 characters or fewer.");
  }
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}
