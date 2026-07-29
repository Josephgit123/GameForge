const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const message = (body && (body as { error?: string }).error) || res.statusText;
    throw new ApiError(res.status, message);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>(path, { method: 'GET' }, token),
  post: <T>(path: string, data: unknown, token?: string | null) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }, token),
  patch: <T>(path: string, data: unknown, token?: string | null) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }, token),
};
