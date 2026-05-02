import { useAuthStore } from '~/stores/auth';

export function useApi() {
  const config = useRuntimeConfig();
  const auth   = useAuthStore();
  const router = useRouter();

  async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const res = await fetch(`${config.public.apiUrl}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(auth.accessToken ? { Authorization: auth.authHeader } : {}),
        ...(opts.headers ?? {}),
      },
    });

    if (res.status === 401) {
      auth.logout();
      router.push('/login');
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as any)?.message ?? `HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  return {
    get:    <T>(path: string)                       => request<T>(path),
    post:   <T>(path: string, body: unknown)        => request<T>(path, { method: 'POST',  body: JSON.stringify(body) }),
    patch:  <T>(path: string, body: unknown)        => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
    del:    <T>(path: string)                       => request<T>(path, { method: 'DELETE' }),
  };
}
