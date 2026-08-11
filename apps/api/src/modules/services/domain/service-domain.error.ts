export class ServiceDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceDomainError";
  }
}
