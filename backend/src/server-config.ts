/** Express `trust proxy` hops when behind DO LB + nginx. */
export const TRUST_PROXY_HOPS = 1;

export function resolveBackendPort(): number {
  return Number(process.env.BACKEND_PORT || 9002);
}

export function resolveBackendHost(): string {
  return process.env.BACKEND_HOST || '0.0.0.0';
}
