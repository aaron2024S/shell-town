import { useAuthStore } from '@/stores/auth';
import { serverBaseOrigin } from '@/utils/server';

// 动态 base：配置了服务器地址时指向远端，否则走同源相对路径
function getBase(): string {
  const origin = serverBaseOrigin();
  return origin ? `${origin}/api` : '/api';
}

/** 后端返回的错误体（各种 error 码 + 可选的 message/detail） */
export interface ApiErrorPayload {
  error?: string;
  message?: string;
  detail?: string;
  [key: string]: unknown;
}

/** 统一抛出的请求错误：status + 原始 payload，便于调用方按 error 码分支 */
export type ApiError = Error & { status?: number; payload?: ApiErrorPayload };

export async function request<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const auth = useAuthStore();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (auth.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }

  const res = await fetch(`${getBase()}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    auth.logout();
    throw new Error('未登录或登录已过期');
  }

  const data = (await res.json().catch(() => ({}))) as ApiErrorPayload;
  if (!res.ok) {
    const err = new Error(data.message || `请求失败 (${res.status})`) as ApiError;
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data as T;
}

// 说明：各方法的泛型默认值从 `any` 收紧为 `unknown`。
// 原先 `T = any` 等于给所有调用点开了后门 —— 忘记写响应类型时，
// 取任何字段都静默通过，服务端改字段名前端毫无感知。
// 现在漏写泛型会直接编译报错，强制显式声明（调用点已全部显式传参）。
export const api = {
  get: <T = unknown>(p: string) => request<T>(p),
  post: <T = unknown>(p: string, body?: unknown) =>
    request<T>(p, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T = unknown>(p: string, body?: unknown) =>
    request<T>(p, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch: <T = unknown>(p: string, body?: unknown) =>
    request<T>(p, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T = unknown>(p: string) => request<T>(p, { method: 'DELETE' }),
  /** 裸文件上传（octet-stream），用于宠物立绘等图片 */
  upload: <T = unknown>(p: string, file: Blob) =>
    request<T>(p, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': 'application/octet-stream' },
    }),
};
