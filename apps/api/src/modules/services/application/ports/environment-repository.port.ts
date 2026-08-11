export interface EnvironmentRepositoryPort {
  activeEnvironmentsExist(environmentIds: string[]): Promise<boolean>;
}
