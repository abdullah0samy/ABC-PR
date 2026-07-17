// Minimal bcrypt utility functions retained for backward compatibility.
// All JSON file persistence has been replaced by PostgreSQL repositories.

import bcrypt from "bcryptjs";

/** Hash a plaintext password using bcrypt (cost factor 12). */
export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 12);
}

/** Constant-time bcrypt compare. Returns true on match. */
export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}
