export type ClinicErrorCode =
  | "SLOT_TAKEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "CLOSED"

export class ClinicError extends Error {
  readonly code: ClinicErrorCode

  constructor(code: ClinicErrorCode, message: string) {
    super(message)
    this.name = "ClinicError"
    this.code = code
  }
}

export function statusFor(code: ClinicErrorCode): number {
  switch (code) {
    case "SLOT_TAKEN":
      return 409
    case "NOT_FOUND":
      return 404
    case "UNAUTHENTICATED":
      return 401
    case "FORBIDDEN":
      return 403
    case "CLOSED":
    case "VALIDATION":
      return 400
  }
}

export function messageOf(error: unknown): string {
  if (error instanceof ClinicError) return error.message
  return "The desk could not complete that. Try again."
}
