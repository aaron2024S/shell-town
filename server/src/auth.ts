import bcrypt from 'bcryptjs';
import { createHmac } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { config } from './config.js';

const secret = new TextEncoder().encode(config.jwtSecret);

export interface JwtPayload {
  sub: number;          // user id
  role: 'parent' | 'child';
  name: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return await new SignJWT({ role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(config.jwtExpiresIn)
    .setSubject(String(payload.sub))
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      sub: Number(payload.sub),
      role: payload.role as 'parent' | 'child',
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

// 校验PIN：4-6位数字
export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

// ---- 小孩 PIN 安全存储（1.6.9）----
// users.pin 列改存 bcrypt 哈希（列名沿用，避免重建表；历史明文在启动迁移时自动转换）。
// 唯一性检查无法对 bcrypt 哈希做等值比较，另存 pin_lookup = HMAC-SHA256(pin, jwtSecret)。
export function hashPin(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export async function verifyPin(plain: string, hash: string | null | undefined): Promise<boolean> {
  // 未迁移/未知格式的存量值一律拒绝登录（等迁移脚本处理）
  if (!hash || !hash.startsWith('$2')) return false;
  return bcrypt.compare(plain, hash);
}

export function pinLookup(plain: string): string {
  return createHmac('sha256', config.jwtSecret).update(`shell-town:pin:${plain}`).digest('hex');
}

// 是否为未迁移的明文 PIN（4-6位数字）
export function isPlaintextPin(v: string | null | undefined): boolean {
  return !!v && /^\d{4,6}$/.test(v);
}
