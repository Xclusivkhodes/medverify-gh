import { createHash, timingSafeEqual } from "node:crypto";

export function adminAuthorized(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET?.trim() ?? "";
  if (!secret) return false;
  const header = request.headers.get("x-admin-secret") ?? "";
  const a = createHash("sha256").update(secret).digest();
  const b = createHash("sha256").update(header).digest();
  return timingSafeEqual(a, b);
}
