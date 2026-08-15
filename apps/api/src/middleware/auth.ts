import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, "Log in to continue."));
  next();
}

export function requireMerchant(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, "Log in to continue."));
  if (req.user.role !== "MERCHANT" && req.user.role !== "ADMIN") {
    return next(new HttpError(403, "A merchant account is required."));
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, "Log in to continue."));
  if (req.user.role !== "ADMIN") return next(new HttpError(403, "An admin account is required."));
  next();
}
