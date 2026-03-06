const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions<TBody = unknown> {
  method?: HttpMethod;
  body?: TBody;
  headers?: Record<string, string>;
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<TResponse, TBody = unknown>(
  endpoint: string,
  options: RequestOptions<TBody> = {},
): Promise<TResponse> {
  const { method = 'GET', body, headers = {} } = options;

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export const api = {
  get: <T>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { headers }),

  post: <T, B = unknown>(endpoint: string, body: B, headers?: Record<string, string>) =>
    request<T, B>(endpoint, { method: 'POST', body, headers }),

  put: <T, B = unknown>(endpoint: string, body: B, headers?: Record<string, string>) =>
    request<T, B>(endpoint, { method: 'PUT', body, headers }),

  patch: <T, B = unknown>(endpoint: string, body: B, headers?: Record<string, string>) =>
    request<T, B>(endpoint, { method: 'PATCH', body, headers }),

  delete: <T>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'DELETE', headers }),
};

export { ApiError };
