export class IncidentDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IncidentDomainError";
  }
}
