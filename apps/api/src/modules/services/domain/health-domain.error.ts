export class HealthDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HealthDomainError";
  }
}
