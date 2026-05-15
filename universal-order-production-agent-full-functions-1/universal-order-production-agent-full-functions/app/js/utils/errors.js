export class AppError extends Error {
  constructor(message, code = "APP_ERROR", details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
