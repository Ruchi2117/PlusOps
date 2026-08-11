export class AIDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIDomainError";
  }
}
