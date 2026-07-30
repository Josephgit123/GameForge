import type { NextFunction, Request, RequestHandler, Response } from 'express';

// Express 4 doesn't catch rejected promises from async route handlers — an
// unhandled rejection there crashes the whole process, not just the one
// request. This forwards it to Express's error-handling middleware instead.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
