class CustomError extends Error {
  public code: number;
  constructor(message: string, code: number = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(message).stack;
    }
  }
}

export default CustomError;
