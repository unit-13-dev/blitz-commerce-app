import { NextResponse } from "next/server";
import { headers } from "next/headers";

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: {
    timestamp: string;
    request_id?: string | null;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export class ApiResponseHandler {
  /**
   * Success response
   */
  static success<T>(
    data: T,
    message: string = 'Success',
    statusCode: number = 200,
    meta?: Omit<ApiResponse<T>['meta'], 'timestamp' | 'request_id'>
  ): NextResponse<ApiResponse<T>> {
    const headersList = headers();
    const requestId = headersList.get('x-request-id');
    
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId || null,
        ...meta,
      },
    };

    return NextResponse.json(response, { status: statusCode });
  }

  /**
   * Error response
   */
  static error(
    message: string = 'Internal server error',
    statusCode: number = 500,
    error?: any
  ): NextResponse<ApiResponse> {
    const headersList = headers();
    const requestId = headersList.get('x-request-id');

    const response: ApiResponse = {
      success: false,
      message,
      error: error?.message || error || message,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId || null,
      },
    };

    return NextResponse.json(response, { status: statusCode });
  }

  /**
   * Created response (201)
   */
  static created<T>(
    data: T,
    message: string = 'Resource created successfully'
  ): NextResponse<ApiResponse<T>> {
    return this.success(data, message, 201);
  }

  /**
   * Not found response (404)
   */
  static notFound(message: string = 'Resource not found'): NextResponse<ApiResponse> {
    return this.error(message, 404);
  }

  /**
   * Bad request response (400)
   */
  static badRequest(message: string = 'Bad request', error?: any): NextResponse<ApiResponse> {
    return this.error(message, 400, error);
  }

  /**
   * Unauthorized response (401)
   */
  static unauthorized(message: string = 'Unauthorized'): NextResponse<ApiResponse> {
    return this.error(message, 401);
  }

  /**
   * Forbidden response (403)
   */
  static forbidden(message: string = 'Forbidden'): NextResponse<ApiResponse> {
    return this.error(message, 403);
  }

  /**
   * Conflict response (409)
   */
  static conflict(message: string = 'Resource conflict'): NextResponse<ApiResponse> {
    return this.error(message, 409);
  }

  /**
   * Validation error response (422)
   */
  static validationError(
    message: string = 'Validation failed',
    errors?: any
  ): NextResponse<ApiResponse> {
    return this.error(message, 422, errors);
  }

  /**
   * Success response with pagination
   */
  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message: string = 'Success'
  ): NextResponse<ApiResponse<T[]>> {
    const totalPages = Math.ceil(total / limit);
    
    return this.success(data, message, 200, {
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  }
}

