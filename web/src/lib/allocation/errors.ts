export class AllocationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AllocationValidationError";
  }
}
