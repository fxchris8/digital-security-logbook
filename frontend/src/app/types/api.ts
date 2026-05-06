export interface ApiReturn<T> {
  data: T;
  message: string;
  status: number;
}

export interface ApiError {
  code?: number;
  message: string;
  status: number;
}

export type UninterceptedApiError = {
  message?: string | Record<string, string | string[]>;
  error?: string | Record<string, string | string[]>;
};
