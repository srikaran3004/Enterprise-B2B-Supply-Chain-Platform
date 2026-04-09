export interface ApiError {
  error: string;
  errors?: ValidationError[];
  statusCode?: number;
}

export interface ValidationError {
  propertyName: string;
  errorMessage: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}
