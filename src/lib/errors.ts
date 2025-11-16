export class OptimizationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "OptimizationError";
    this.status = status;
  }
}

