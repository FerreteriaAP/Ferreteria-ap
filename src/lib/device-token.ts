import { createHmac, timingSafeEqual } from "node:crypto";

interface Payload {
  userId: string;
  iat: number;
  exp: number;
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET not set");
  return s;
}

export function createDeviceToken(userId: string): string {
  const payload: Payload = {
    userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyDeviceToken(token: string): string | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;
    const data = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = createHmac("sha256", secret()).update(data).digest("base64url");
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as Payload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.userId;
  } catch {
    return null;
  }
}
