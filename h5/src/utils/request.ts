/**
 * Axios 统一封装
 *
 * - Token 通过 Bridge 从原生 storage.local 拉取注入
 * - 401 通过事件总线通知重新登录
 * - 默认 15s 超时，网络错误自动重试 1 次
 * - 相同 URL + 参数的并发请求合并
 */
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from 'axios';
import toast from '@/utils/toast';
import { storageGet } from '@/bridge/helpers';
import { eventBus } from '@/bridge/eventbus';

// ========== 业务响应结构 ==========
export interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data: T;
}

// ========== 配置 ==========
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT || 15000);
const RETRY = Number(import.meta.env.VITE_API_RETRY || 1);

// ========== Token 缓存 ==========
let cachedToken: string | null = null;
let tokenFetchPromise: Promise<string | null> | null = null;

async function fetchToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  if (tokenFetchPromise) return tokenFetchPromise;
  tokenFetchPromise = storageGet<string>('auth_token')
    .then((t) => {
      cachedToken = t ?? null;
      return cachedToken;
    })
    .catch(() => null)
    .finally(() => {
      tokenFetchPromise = null;
    });
  return tokenFetchPromise;
}

/** 业务侧登录成功后调用，更新内存缓存 */
export function setCachedToken(token: string | null): void {
  cachedToken = token;
}

// ========== 请求去重 ==========
const pendingMap: Map<string, Promise<AxiosResponse<ApiResponse>>> = new Map();

function genKey(config: InternalAxiosRequestConfig): string {
  const { method, url, params, data } = config;
  return [method, url, JSON.stringify(params || {}), JSON.stringify(data || {})].join('|');
}

// ========== 实例 ==========
const instance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器：Token 注入
instance.interceptors.request.use(
  async (config) => {
    const token = await fetchToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => Promise.reject(err)
);

// 响应拦截器：统一错误处理 + 重试
instance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const body = response.data;
    // 业务码非 0：统一抛错
    if (body && typeof body === 'object' && 'code' in body && body.code !== 0) {
      // 401: 触发重新登录
      if (body.code === 401) {
        cachedToken = null;
        eventBus.emit('auth.expired');
      }
      const err = new Error(body.msg || `请求失败 (${body.code})`) as Error & {
        code?: number;
      };
      err.code = body.code;
      return Promise.reject(err);
    }
    return response;
  },
  async (err) => {
    const config = err.config as (InternalAxiosRequestConfig & { __retryCount?: number; __silent?: boolean }) | undefined;
    // 网络错误 / 超时重试
    if (
      config &&
      (!err.response || err.code === 'ECONNABORTED') &&
      (config.__retryCount ?? 0) < RETRY
    ) {
      config.__retryCount = (config.__retryCount ?? 0) + 1;
      return instance.request(config);
    }
    // 401 响应
    if (err.response?.status === 401) {
      cachedToken = null;
      eventBus.emit('auth.expired');
    }
    // 非 silent 请求才弹错误提示
    if (!config?.__silent) {
      const msg = err.response?.data?.msg || err.message || '网络异常，请稍后重试';
      toast.error(msg);
    }
    return Promise.reject(err);
  }
);

// ========== 业务侧调用方法 ==========
interface RequestOptions {
  /** 静默模式：true 时网络/业务错误不弹 toast（默认 false，即弹提示） */
  silent?: boolean;
  /** 是否参与去重（默认 true） */
  dedupe?: boolean;
}

async function request<T = unknown>(
  config: AxiosRequestConfig,
  options: RequestOptions = {}
): Promise<T> {
  const { silent = false, dedupe = true } = options;
  const merged: AxiosRequestConfig & { __silent?: boolean } = { ...config };
  merged.__silent = silent;

  const key = genKey(merged as InternalAxiosRequestConfig);

  // 去重：合并并发同请求
  if (dedupe && pendingMap.has(key)) {
    const resp = await pendingMap.get(key)!;
    return resp.data.data as T;
  }

  const promise = instance.request<ApiResponse<T>>(merged);
  if (dedupe) {
    pendingMap.set(key, promise as Promise<AxiosResponse<ApiResponse>>);
  }
  try {
    const resp = await promise;
    return resp.data.data as T;
  } finally {
    if (dedupe) pendingMap.delete(key);
  }
}

export const http = {
  get<T = unknown>(url: string, params?: Record<string, unknown>, options?: RequestOptions) {
    return request<T>({ url, method: 'GET', params }, options);
  },
  post<T = unknown>(url: string, data?: unknown, options?: RequestOptions) {
    return request<T>({ url, method: 'POST', data }, options);
  },
  put<T = unknown>(url: string, data?: unknown, options?: RequestOptions) {
    return request<T>({ url, method: 'PUT', data }, options);
  },
  delete<T = unknown>(url: string, params?: Record<string, unknown>, options?: RequestOptions) {
    return request<T>({ url, method: 'DELETE', params }, options);
  },
  request<T = unknown>(config: AxiosRequestConfig, options?: RequestOptions) {
    return request<T>(config, options);
  }
};

export default http;
