import type { ServiceLifecycleStatus, ServiceVisibility } from "@plusops/contracts";

import { ServiceDomainError } from "./service-domain.error";

export type ServiceSnapshot = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ownerTeamId: string;
  repositoryUrl: string | null;
  apiBaseUrl: string | null;
  documentationUrl: string | null;
  runbookUrl: string | null;
  lifecycleStatus: ServiceLifecycleStatus;
  visibility: ServiceVisibility;
  tier: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateServiceInput = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  ownerTeamId: string;
  repositoryUrl?: string | null;
  apiBaseUrl?: string | null;
  documentationUrl?: string | null;
  runbookUrl?: string | null;
  lifecycleStatus?: ServiceLifecycleStatus;
  visibility?: ServiceVisibility;
  tier?: number;
  createdAt: Date;
};

export type UpdateServiceInput = Partial<
  Pick<
    ServiceSnapshot,
    | "name"
    | "slug"
    | "description"
    | "ownerTeamId"
    | "repositoryUrl"
    | "apiBaseUrl"
    | "documentationUrl"
    | "runbookUrl"
    | "lifecycleStatus"
    | "visibility"
    | "tier"
  >
> & {
  updatedAt: Date;
};

export class Service {
  private constructor(private snapshot: ServiceSnapshot) {
    validateSnapshot(snapshot);
  }

  static create(input: CreateServiceInput): Service {
    return new Service({
      id: input.id,
      name: normalizeRequiredText(input.name),
      slug: normalizeSlug(input.slug),
      description: normalizeOptionalText(input.description),
      ownerTeamId: input.ownerTeamId,
      repositoryUrl: normalizeOptionalUrl(input.repositoryUrl),
      apiBaseUrl: normalizeOptionalUrl(input.apiBaseUrl),
      documentationUrl: normalizeOptionalUrl(input.documentationUrl),
      runbookUrl: normalizeOptionalUrl(input.runbookUrl),
      lifecycleStatus: input.lifecycleStatus ?? "active",
      visibility: input.visibility ?? "internal",
      tier: input.tier ?? 2,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      deletedAt: null
    });
  }

  static restore(snapshot: ServiceSnapshot): Service {
    return new Service({
      ...snapshot,
      name: normalizeRequiredText(snapshot.name),
      slug: normalizeSlug(snapshot.slug),
      description: normalizeOptionalText(snapshot.description),
      repositoryUrl: normalizeOptionalUrl(snapshot.repositoryUrl),
      apiBaseUrl: normalizeOptionalUrl(snapshot.apiBaseUrl),
      documentationUrl: normalizeOptionalUrl(snapshot.documentationUrl),
      runbookUrl: normalizeOptionalUrl(snapshot.runbookUrl)
    });
  }

  get id(): string {
    return this.snapshot.id;
  }

  get ownerTeamId(): string {
    return this.snapshot.ownerTeamId;
  }

  update(input: UpdateServiceInput): void {
    this.assertActiveRecord();

    this.snapshot = {
      ...this.snapshot,
      name: input.name === undefined ? this.snapshot.name : normalizeRequiredText(input.name),
      slug: input.slug === undefined ? this.snapshot.slug : normalizeSlug(input.slug),
      description:
        input.description === undefined
          ? this.snapshot.description
          : normalizeOptionalText(input.description),
      ownerTeamId: input.ownerTeamId ?? this.snapshot.ownerTeamId,
      repositoryUrl:
        input.repositoryUrl === undefined
          ? this.snapshot.repositoryUrl
          : normalizeOptionalUrl(input.repositoryUrl),
      apiBaseUrl:
        input.apiBaseUrl === undefined
          ? this.snapshot.apiBaseUrl
          : normalizeOptionalUrl(input.apiBaseUrl),
      documentationUrl:
        input.documentationUrl === undefined
          ? this.snapshot.documentationUrl
          : normalizeOptionalUrl(input.documentationUrl),
      runbookUrl:
        input.runbookUrl === undefined
          ? this.snapshot.runbookUrl
          : normalizeOptionalUrl(input.runbookUrl),
      lifecycleStatus: input.lifecycleStatus ?? this.snapshot.lifecycleStatus,
      visibility: input.visibility ?? this.snapshot.visibility,
      tier: input.tier ?? this.snapshot.tier,
      updatedAt: input.updatedAt
    };

    validateSnapshot(this.snapshot);
  }

  archive(archivedAt: Date): void {
    if (this.snapshot.deletedAt) {
      return;
    }

    this.snapshot = {
      ...this.snapshot,
      lifecycleStatus: "archived",
      deletedAt: archivedAt,
      updatedAt: archivedAt
    };
  }

  toSnapshot(): ServiceSnapshot {
    return { ...this.snapshot };
  }

  private assertActiveRecord(): void {
    if (this.snapshot.deletedAt) {
      throw new ServiceDomainError("Archived services cannot be updated.");
    }
  }
}

function validateSnapshot(snapshot: ServiceSnapshot): void {
  if (snapshot.name.length < 2 || snapshot.name.length > 120) {
    throw new ServiceDomainError("Service name must be between 2 and 120 characters.");
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(snapshot.slug)) {
    throw new ServiceDomainError("Service slug must be lowercase kebab-case.");
  }

  if (snapshot.slug.length < 2 || snapshot.slug.length > 80) {
    throw new ServiceDomainError("Service slug must be between 2 and 80 characters.");
  }

  if (snapshot.description && snapshot.description.length > 1000) {
    throw new ServiceDomainError("Service description must be 1000 characters or fewer.");
  }

  if (!["experimental", "active", "deprecated", "archived"].includes(snapshot.lifecycleStatus)) {
    throw new ServiceDomainError("Service lifecycle status is invalid.");
  }

  if (!["private", "internal", "public"].includes(snapshot.visibility)) {
    throw new ServiceDomainError("Service visibility is invalid.");
  }

  if (!Number.isInteger(snapshot.tier) || snapshot.tier < 1 || snapshot.tier > 5) {
    throw new ServiceDomainError("Service tier must be an integer between 1 and 5.");
  }
}

function normalizeRequiredText(value: string): string {
  return value.trim();
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeOptionalUrl(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    return null;
  }

  try {
    new URL(normalized);
  } catch {
    throw new ServiceDomainError("Service URL fields must be valid URLs.");
  }

  return normalized;
}
