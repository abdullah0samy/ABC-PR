export interface ApiErrorResponse {
  error: string;
  code?: string;
}

export interface ValidationErrorResponse extends ApiErrorResponse {
  details: Record<string, string[]>;
}
