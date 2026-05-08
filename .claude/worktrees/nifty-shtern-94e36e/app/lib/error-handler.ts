// VLYPプラットフォーム統一エラーハンドリング

export interface APIErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

export interface ValidationFieldError {
  field: string;
  message: string;
  value?: unknown;
}

export class VLYPError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VLYPError';
  }

  toJSON(): APIErrorResponse {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details
    };
  }
}

// 具体的なエラークラス
export class ValidationError extends VLYPError {
  constructor(
    message: string,
    public validationErrors: ValidationFieldError[],
    details?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', 400, {
      validationErrors,
      ...details
    });
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends VLYPError {
  constructor(message: string = '認証が必要です', details?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends VLYPError {
  constructor(message: string = '権限がありません', details?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends VLYPError {
  constructor(resource: string, id?: string | number, details?: Record<string, unknown>) {
    const message = id ? `${resource} (ID: ${id}) が見つかりません` : `${resource} が見つかりません`;
    super(message, 'NOT_FOUND_ERROR', 404, { resource, id, ...details });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends VLYPError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT_ERROR', 409, details);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends VLYPError {
  constructor(message: string = 'リクエストが多すぎます', details?: Record<string, unknown>) {
    super(message, 'RATE_LIMIT_ERROR', 429, details);
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends VLYPError {
  constructor(message: string, operation?: string, details?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', 500, { operation, ...details });
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends VLYPError {
  constructor(
    service: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, { service, ...details });
    this.name = 'ExternalServiceError';
  }
}

// エラーハンドリングユーティリティ関数
export function handleAPIError(error: unknown): APIErrorResponse {
  if (error instanceof VLYPError) {
    return error.toJSON();
  }

  if (error instanceof Error) {
    return {
      code: 'INTERNAL_ERROR',
      message: error.message,
      statusCode: 500,
      details: { stack: error.stack }
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: '不明なエラーが発生しました',
    statusCode: 500,
    details: { originalError: error }
  };
}

export function createValidationError(
  field: string,
  message: string,
  value?: unknown
): ValidationFieldError {
  return { field, message, value };
}

// バリデーションヘルパー関数
export function validateRequired(
  value: unknown,
  fieldName: string
): ValidationFieldError[] {
  const errors: ValidationFieldError[] = [];
  
  if (value === null || value === undefined || value === '') {
    errors.push(createValidationError(fieldName, `${fieldName} は必須です`));
  }
  
  return errors;
}

export function validateEmail(email: string): ValidationFieldError[] {
  const errors: ValidationFieldError[] = [];
  
  if (!email) {
    errors.push(createValidationError('email', 'メールアドレスは必須です'));
    return errors;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push(createValidationError('email', '有効なメールアドレスを入力してください', email));
  }
  
  return errors;
}

export function validateStringLength(
  value: string,
  fieldName: string,
  minLength: number,
  maxLength?: number
): ValidationFieldError[] {
  const errors: ValidationFieldError[] = [];
  
  if (value.length < minLength) {
    errors.push(
      createValidationError(
        fieldName,
        `${fieldName} は ${minLength} 文字以上でなければなりません`,
        value
      )
    );
  }
  
  if (maxLength && value.length > maxLength) {
    errors.push(
      createValidationError(
        fieldName,
        `${fieldName} は ${maxLength} 文字以下でなければなりません`,
        value
      )
    );
  }
  
  return errors;
}

export function validateNumber(
  value: unknown,
  fieldName: string,
  min?: number,
  max?: number
): ValidationFieldError[] {
  const errors: ValidationFieldError[] = [];
  
  const num = Number(value);
  if (isNaN(num)) {
    errors.push(createValidationError(fieldName, `${fieldName} は数値でなければなりません`, value));
    return errors;
  }
  
  if (min !== undefined && num < min) {
    errors.push(
      createValidationError(
        fieldName,
        `${fieldName} は ${min} 以上でなければなりません`,
        value
      )
    );
  }
  
  if (max !== undefined && num > max) {
    errors.push(
      createValidationError(
        fieldName,
        `${fieldName} は ${max} 以下でなければなりません`,
        value
      )
    );
  }
  
  return errors;
}

// APIレスポンス作成ヘルパー
export function createSuccessResponse<T = unknown>(
  data: T,
  message?: string
) {
  return Response.json({
    success: true,
    data,
    message
  });
}

export function createErrorResponse(error: APIErrorResponse) {
  return Response.json(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    },
    { status: error.statusCode }
  );
}

export function createValidationErrorResponse(errors: ValidationFieldError[]) {
  return createErrorResponse(
    new ValidationError('入力値の検証に失敗しました', errors).toJSON()
  );
}

// 非同期操作のエラーハンドリング
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error('Operation failed:', error);
    
    if (error instanceof VLYPError) {
      throw error;
    }
    
    throw new DatabaseError(
      errorMessage || '操作の実行中にエラーが発生しました',
      'unknown_operation',
      { originalError: error }
    );
  }
}

// ログ出力ヘルパー
export function logError(error: unknown, context?: Record<string, unknown>) {
  const errorInfo = handleAPIError(error);
  
  console.error('VLYP Error:', {
    ...errorInfo,
    context,
    timestamp: new Date().toISOString()
  });
  
  // 本番環境では外部ログサービスにも送信
  if (process.env.NODE_ENV === 'production') {
    // TODO: 外部ログサービス連携
  }
}
