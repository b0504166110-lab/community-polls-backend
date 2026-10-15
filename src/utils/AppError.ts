// שגיאה "מתוכננת" עם קוד HTTP - נזרקת מה-Services ומטופלת ב-errorHandler
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'יש להתחבר כדי לבצע פעולה זו') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'אין לך הרשאה לבצע פעולה זו') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'המשאב המבוקש לא נמצא') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(code: string, message: string) {
    return new AppError(409, code, message);
  }
}
