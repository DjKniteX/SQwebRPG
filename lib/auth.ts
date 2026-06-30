import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const sessionCookie = "mirage_session";
const secret = process.env.AUTH_SECRET ?? "mirage-local-dev-secret";

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, originalHash] = stored.split(":");
  if (!salt || !originalHash) return false;
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(originalHash, "hex"));
}

function sign(value: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function createSessionToken(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, createdAt: Date.now() })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token?: string) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || signature !== sign(payload)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as { userId: string; createdAt: number };
  } catch {
    return null;
  }
}

export async function setSession(userId: string) {
  const store = await cookies();
  store.set(sessionCookie, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(sessionCookie);
}

export async function getCurrentUser() {
  const store = await cookies();
  const session = readSessionToken(store.get(sessionCookie)?.value);
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
