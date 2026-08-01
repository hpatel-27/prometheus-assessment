/**
 * Base class for known HTTP errors. The centralized error handler catches
 * HttpError and produces a response with the designated status code. All other
 * thrown values produce a safe 500 so implementation details are never exposed.
 */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = this.constructor.name
    // Restore the prototype chain so `instanceof` checks work correctly when
    // transpiling to ES5 targets.
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad request.') {
    super(400, message)
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not found.') {
    super(404, message)
  }
}

export class TooManyRequestsError extends HttpError {
  constructor(message = 'Too many requests.') {
    super(429, message)
  }
}

export class InternalServerError extends HttpError {
  constructor(message = 'Internal server error.') {
    super(500, message)
  }
}
