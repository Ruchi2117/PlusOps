export class AlertDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlertDomainError";
  }
}
