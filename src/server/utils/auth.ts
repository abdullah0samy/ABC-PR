import jwt, { type JwtPayload } from "jsonwebtoken";
import { config } from "../config";
import type { PublicUser, Role } from "../types";

export interface AuthTokenPayload extends JwtPayload {
  uid: number; // user id (avoid colliding with jwt's `sub` string claim)
  username: string;
  role: Role;
}

export function signToken(user: PublicUser): string {
  const payload: AuthTokenPayload = {
    uid: user.id,
    username: user.username,
    role: user.role,
  };
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as unknown as number | undefined,
    algorithm: "HS256" as const,
    issuer: "abc-pr-system",
    audience: "abc-pr-client",
  });
}

export function verifyToken(token: string): AuthTokenPayload {
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, config.jwt.secret, {
      algorithms: ["HS256"],
      issuer: "abc-pr-system",
      audience: "abc-pr-client",
    });
  } catch {
    throw new Error("Invalid or expired token");
  }
  if (typeof decoded === "string") {
    throw new Error("Invalid token: unexpected string payload");
  }
  const payload = decoded as unknown as AuthTokenPayload;
  if (typeof payload.uid !== "number" || typeof payload.role !== "string") {
    throw new Error("Invalid token: missing required claims");
  }
  return payload;
}
