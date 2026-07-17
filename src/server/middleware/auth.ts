import type { Request, Response, NextFunction } from "express";
import { verifyToken, type AuthTokenPayload } from "../utils/auth";
import type { Role } from "../types";

// Augment Express request with our auth state.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

export interface AuthedRequest extends Request {
  auth: AuthTokenPayload;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const token = bearer;

  if (!token) {
    res.status(401).json({ error: "Authentication token required." });
    return;
  }

  try {
    req.auth = verifyToken(token);
    next();
  } catch (err) {
    res.status(401).json({ error: `Invalid or expired token: ${(err as any)?.message ?? ""}` });
    return;
  }
}

/**
 * Allow access iff the user has one of the specified roles. This middleware
 * ALSO authenticates the request first, so `requireRole(...)` is a single
 * middleware that does both steps.
 */
export function requireRole(...roles: Role[]) {
  const allowed = new Set<Role>(roles);
  return (req: Request, res: Response, next: NextFunction): void => {
    // Chain authenticate inline so callers don't have to mount both.
    const header = req.headers.authorization ?? "";
    const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!bearer) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    try {
      req.auth = verifyToken(bearer);
      if (!allowed.has(req.auth!.role)) {
        res.status(403).json({ error: "Forbidden: insufficient role." });
        return;
      }
    } catch {
      res.status(401).json({ error: "Invalid or expired token." });
      return;
    }
    next();
  };
}

export const requireAdmin = requireRole("Admin");
export const requireManager = requireRole("Manager");
export const requireManagerOrAdmin = requireRole("Manager", "Admin");
export const requireAnyAuthenticated = authenticate;
