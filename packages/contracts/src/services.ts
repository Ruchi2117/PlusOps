import { z } from "zod";

export const serviceLifecycleStatusValues = [
  "experimental",
  "active",
  "deprecated",
  "archived"
] as const;
export const serviceVisibilityValues = ["private", "internal", "public"] as const;
export const environmentTypeValues = ["development", "staging", "production", "preview"] as const;
export const deploymentStatusValues = [
  "pending",
  "running",
  "succeeded",
  "failed",
  "rolled_back"
] as const;
export const serviceSortFieldValues = [
  "name",
  "createdAt",
  "updatedAt",
  "lifecycleStatus"
] as const;
export const sortDirectionValues = ["asc", "desc"] as const;

export const serviceLifecycleStatusSchema = z.enum(serviceLifecycleStatusValues);
export const serviceVisibilitySchema = z.enum(serviceVisibilityValues);
export const environmentTypeSchema = z.enum(environmentTypeValues);
export const deploymentStatusSchema = z.enum(deploymentStatusValues);
export const serviceSortFieldSchema = z.enum(serviceSortFieldValues);
export const serviceSortDirectionSchema = z.enum(sortDirectionValues);

const queryBooleanSchema = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return value;
}, z.boolean());

export const servicePaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

export const servicePaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative()
});

export const serviceEnvironmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(80),
  type: environmentTypeSchema,
  baseUrl: z.string().url().nullable()
});

export const serviceDeploymentSummarySchema = z.object({
  id: z.string().uuid(),
  serviceId: z.string().uuid(),
  environmentId: z.string().uuid(),
  environmentName: z.string().min(1),
  version: z.string().min(1).max(120),
  commitSha: z.string().nullable(),
  repositoryUrl: z.string().url().nullable(),
  status: deploymentStatusSchema,
  deployedByUserId: z.string().uuid().nullable(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable()
});

export const serviceDependencySchema = z.object({
  id: z.string().uuid(),
  upstreamServiceId: z.string().uuid(),
  upstreamServiceName: z.string().min(1),
  upstreamServiceSlug: z.string().min(1),
  downstreamServiceId: z.string().uuid(),
  downstreamServiceName: z.string().min(1),
  downstreamServiceSlug: z.string().min(1),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable()
});

export const serviceSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(80),
  description: z.string().max(1000).nullable(),
  ownerTeamId: z.string().uuid(),
  ownerTeamName: z.string().min(1),
  repositoryUrl: z.string().url().nullable(),
  apiBaseUrl: z.string().url().nullable(),
  documentationUrl: z.string().url().nullable(),
  runbookUrl: z.string().url().nullable(),
  lifecycleStatus: serviceLifecycleStatusSchema,
  visibility: serviceVisibilitySchema,
  tier: z.number().int().min(1).max(5),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable()
});

export const serviceDetailSchema = serviceSummarySchema.extend({
  environments: z.array(serviceEnvironmentSchema),
  upstreamDependencies: z.array(serviceDependencySchema),
  downstreamDependencies: z.array(serviceDependencySchema),
  deployments: z.array(serviceDeploymentSummarySchema)
});

export const listServicesQuerySchema = servicePaginationQuerySchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
  ownerTeamId: z.string().uuid().optional(),
  lifecycleStatus: serviceLifecycleStatusSchema.optional(),
  visibility: serviceVisibilitySchema.optional(),
  includeDeleted: queryBooleanSchema.default(false),
  sortBy: serviceSortFieldSchema.default("name"),
  sortDirection: serviceSortDirectionSchema.default("asc")
});

export const createServiceRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(1000).optional(),
  ownerTeamId: z.string().uuid(),
  repositoryUrl: z.string().trim().url().optional(),
  apiBaseUrl: z.string().trim().url().optional(),
  documentationUrl: z.string().trim().url().optional(),
  runbookUrl: z.string().trim().url().optional(),
  lifecycleStatus: serviceLifecycleStatusSchema.optional(),
  visibility: serviceVisibilitySchema.optional(),
  tier: z.number().int().min(1).max(5).optional(),
  environmentIds: z.array(z.string().uuid()).optional()
});

export const updateServiceRequestSchema = createServiceRequestSchema
  .omit({ ownerTeamId: true, slug: true })
  .partial()
  .extend({
    description: z.string().trim().max(1000).nullable().optional(),
    ownerTeamId: z.string().uuid().optional(),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    repositoryUrl: z.string().trim().url().nullable().optional(),
    apiBaseUrl: z.string().trim().url().nullable().optional(),
    documentationUrl: z.string().trim().url().nullable().optional(),
    runbookUrl: z.string().trim().url().nullable().optional(),
    environmentIds: z.array(z.string().uuid()).optional()
  });

export const registerServiceDependencyRequestSchema = z.object({
  downstreamServiceId: z.string().uuid(),
  description: z.string().trim().max(500).optional()
});

export const serviceListResponseSchema = z.object({
  data: z.array(serviceSummarySchema),
  pagination: servicePaginationMetaSchema
});

export const serviceDetailResponseSchema = z.object({
  service: serviceDetailSchema
});

export const serviceDependenciesResponseSchema = z.object({
  data: z.array(serviceDependencySchema)
});

export type ServiceLifecycleStatus = z.infer<typeof serviceLifecycleStatusSchema>;
export type ServiceVisibility = z.infer<typeof serviceVisibilitySchema>;
export type EnvironmentType = z.infer<typeof environmentTypeSchema>;
export type DeploymentStatus = z.infer<typeof deploymentStatusSchema>;
export type ServiceSortField = z.infer<typeof serviceSortFieldSchema>;
export type ServiceSortDirection = z.infer<typeof serviceSortDirectionSchema>;
export type ServicePaginationQuery = z.infer<typeof servicePaginationQuerySchema>;
export type ServicePaginationMeta = z.infer<typeof servicePaginationMetaSchema>;
export type ServiceEnvironment = z.infer<typeof serviceEnvironmentSchema>;
export type ServiceDeploymentSummary = z.infer<typeof serviceDeploymentSummarySchema>;
export type ServiceDependency = z.infer<typeof serviceDependencySchema>;
export type ServiceSummary = z.infer<typeof serviceSummarySchema>;
export type ServiceDetail = z.infer<typeof serviceDetailSchema>;
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;
export type CreateServiceRequest = z.infer<typeof createServiceRequestSchema>;
export type UpdateServiceRequest = z.infer<typeof updateServiceRequestSchema>;
export type RegisterServiceDependencyRequest = z.infer<
  typeof registerServiceDependencyRequestSchema
>;
export type ServiceListResponse = z.infer<typeof serviceListResponseSchema>;
export type ServiceDetailResponse = z.infer<typeof serviceDetailResponseSchema>;
export type ServiceDependenciesResponse = z.infer<typeof serviceDependenciesResponseSchema>;
