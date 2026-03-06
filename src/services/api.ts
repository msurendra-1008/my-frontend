const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

const TOKEN_KEYS = {
  access: 'access_token',
  refresh: 'refresh_token',
} as const;

export const tokenStorage = {
  getAccess: () => localStorage.getItem(TOKEN_KEYS.access),
  getRefresh: () => localStorage.getItem(TOKEN_KEYS.refresh),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem(TOKEN_KEYS.access, access);
    localStorage.setItem(TOKEN_KEYS.refresh, refresh);
  },
  clearTokens: () => {
    localStorage.removeItem(TOKEN_KEYS.access);
    localStorage.removeItem(TOKEN_KEYS.refresh);
  },
};

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions<TBody = unknown> {
  method?: HttpMethod;
  body?: TBody;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function attemptTokenRefresh(): Promise<string> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) throw new ApiError(401, 'No refresh token');

  const response = await fetch(`${BASE_URL}/api/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    tokenStorage.clearTokens();
    throw new ApiError(401, 'Session expired. Please log in again.');
  }

  const data = await response.json();
  tokenStorage.setTokens(data.access, data.refresh ?? refresh);
  return data.access;
}

async function request<TResponse, TBody = unknown>(
  endpoint: string,
  options: RequestOptions<TBody> = {},
): Promise<TResponse> {
  const { method = 'GET', body, headers = {}, skipAuth = false } = options;

  const buildHeaders = (token?: string): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(!skipAuth && (token ?? tokenStorage.getAccess())
      ? { Authorization: `Bearer ${token ?? tokenStorage.getAccess()}` }
      : {}),
    ...headers,
  });

  const doRequest = (token?: string) =>
    fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: buildHeaders(token),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let response = await doRequest();

  // Handle 401 → attempt token refresh once
  if (response.status === 401 && !skipAuth) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newToken = await attemptTokenRefresh();
        refreshQueue.forEach((cb) => cb(newToken));
        refreshQueue = [];
        isRefreshing = false;
        response = await doRequest(newToken);
      } catch (err) {
        refreshQueue = [];
        isRefreshing = false;
        throw err;
      }
    } else {
      // Queue this request until refresh completes
      const newToken = await new Promise<string>((resolve) => {
        refreshQueue.push(resolve);
      });
      response = await doRequest(newToken);
    }
  }

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }
    const message =
      typeof errorData === 'object' && errorData !== null && 'detail' in errorData
        ? String((errorData as Record<string, unknown>).detail)
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, errorData);
  }

  if (response.status === 204) return undefined as unknown as TResponse;
  return response.json() as Promise<TResponse>;
}

export const api = {
  get: <T>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { headers }),

  post: <T, B = unknown>(endpoint: string, body: B, options?: Omit<RequestOptions<B>, 'method' | 'body'>) =>
    request<T, B>(endpoint, { method: 'POST', body, ...options }),

  put: <T, B = unknown>(endpoint: string, body: B, headers?: Record<string, string>) =>
    request<T, B>(endpoint, { method: 'PUT', body, headers }),

  patch: <T, B = unknown>(endpoint: string, body: B, headers?: Record<string, string>) =>
    request<T, B>(endpoint, { method: 'PATCH', body, headers }),

  delete: <T>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'DELETE', headers }),
};
