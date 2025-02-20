import CustomError from "./customError";

class ConnectionFailError extends CustomError {
  constructor(message: string) {
    super(message, 400);
    this.name = "ConnectionFailError";
  }
}

class MessagePublishError extends CustomError {
  constructor(message: string) {
    super(message, 400);
    this.name = "MessagePublishError";
  }
}

class ValidationError extends CustomError {
  constructor(message: string) {
    super(message, 422);
    this.name = "ValidationError";
  }
}

class AuthenticationError extends CustomError {
  constructor(message: string) {
    super(message, 401);
    this.name = "AuthenticationError";
  }
}

class SocketError extends CustomError {
  constructor(message: string) {
    super(message, 400);
    this.name = "SocketError";
  }
}

//
export {
  ConnectionFailError,
  MessagePublishError,
  ValidationError,
  AuthenticationError,
  SocketError,
};
