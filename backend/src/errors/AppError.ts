export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TaskNotFoundError extends AppError {
  constructor(message = 'Task not found') {
    super(message, 404, 'TASK_NOT_FOUND');
  }
}

export class ForbiddenTaskAccessError extends AppError {
  constructor(message = 'Access to this task is forbidden') {
    super(message, 403, 'FORBIDDEN_ACCESS');
  }
}

export class InvalidTaskPayloadError extends AppError {
  constructor(message = 'Invalid request data') {
    super(message, 400, 'INVALID_PAYLOAD');
  }
}

export class DuplicateTaskOrderingError extends AppError {
  constructor(message = 'Duplicate task ordering') {
    super(message, 400, 'DUPLICATE_ORDERING');
  }
}
