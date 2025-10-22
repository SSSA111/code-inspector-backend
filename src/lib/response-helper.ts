import type { ContentfulStatusCode } from "hono/utils/http-status";
import * as HttpStatusCodes from "stoker/http-status-codes";

type Pagination = {
  page: number;
  limit: number;
  total_count: number;
  total_pages: number;
};

export type SuccessResponse<T> = {
  success: true;
  data: T;
  message: string;
};

export type ErrorResponse = {
  success: false;
  message: string;
};

export function successResponse<T>(
  c: any,
  data: T,
  message: string,
  statusCode: ContentfulStatusCode = HttpStatusCodes.OK,
  pagination?: Pagination,
) {
  return c.json({ success: true, data, message, meta: { pagination } }, statusCode);
}

export function errorResponse(
  c: any,
  message: string,
  statusCode: ContentfulStatusCode = HttpStatusCodes.BAD_REQUEST,
) {
  return c.json({ success: false, message }, statusCode);
}