export class FortyGuardValidationError extends Error {
  details?: unknown;
  constructor(message: string, details?: unknown) {
    super(message);
    this.name = "FortyGuardValidationError";
    this.details = details;
  }
}

export class FortyGuardMalformedResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FortyGuardMalformedResponseError";
  }
}

export class FortyGuardTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FortyGuardTimeoutError";
  }
}

export function toCoolCityErrorResponse(error: unknown): {
  response: { success: false; error: { code: string; message: string; details?: unknown } };
  httpStatus: number;
} {
  if (error instanceof FortyGuardValidationError) {
    return {
      response: {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: error.message,
          details: error.details,
        },
      },
      httpStatus: 400,
    };
  }

  if (error instanceof FortyGuardTimeoutError) {
    return {
      response: {
        success: false,
        error: {
          code: "GATEWAY_TIMEOUT",
          message: error.message,
        },
      },
      httpStatus: 504,
    };
  }

  const message = error instanceof Error ? error.message : "An unexpected server error occurred.";
  return {
    response: {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message,
      },
    },
    httpStatus: 500,
  };
}
