export interface PasswordHasherPort {
  hash(plainTextPassword: string): Promise<string>;
  verify(passwordHash: string, plainTextPassword: string): Promise<boolean>;
}
