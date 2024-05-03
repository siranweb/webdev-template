import { ApiErrorParams, ApiErrorType, IApiError } from '../types/api-error.interface';

export class ApiError extends Error implements IApiError {
  public readonly errorName: string;
  public readonly statusCode: number;
  public readonly type: ApiErrorType;
  public readonly data: Record<any, any>;
  public readonly original?: any;

  constructor(params: ApiErrorParams) {
    const errorName = (params.errorName ?? params.statusCode).toString();
    super(errorName);
    this.errorName = errorName;
    this.statusCode = params.statusCode;
    this.type = params.type;
    this.data = params.data ?? {};
    this.original = params.original;
  }
}
