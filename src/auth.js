const utf8 = new TextEncoder();
async function digest(value) { return new Uint8Array(await crypto.subtle.digest("SHA-256", utf8.encode(value))); }
async function authorized(request, env) {
  const expected = String(env.ADDRESS_ADMIN_TOKEN || "");
  const supplied = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!expected) return false;
  const [a, b] = await Promise.all([digest(expected), digest(supplied)]);
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
async function rateLimit(request, env) {
  if (!env.ADMIN_RATE_LIMITER || typeof env.ADMIN_RATE_LIMITER.limit !== "function") return { allowed: false, reason: "RATE_LIMITER_NOT_CONFIGURED" };
  const ip = request.headers.get("cf-connecting-ip");
  // Local-only escape hatch: it is enabled solely in the default development
  // config and additionally restricted to loopback hosts. Staging/production
  // set DEPLOY_ENV explicitly and never inherit this permission.
  const host = new URL(request.url).hostname;
  const localHost = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  if (!ip && env.DEPLOY_ENV === "development" && env.LOCAL_DEV_ALLOW_MISSING_IP === "true" && localHost) {
    return { allowed: true, reason: null };
  }
  // Never put unrelated callers into one shared bucket.
  if (!ip) return { allowed: false, reason: "CLIENT_IP_MISSING" };
  const routeClass = new URL(request.url).pathname.startsWith("/api/history/") ? "history" : "admin";
  const result = await env.ADMIN_RATE_LIMITER.limit({ key: `${routeClass}:${ip}` });
  return { allowed: result?.success === true, reason: result?.success === true ? null : "RATE_LIMITED" };
}

export { authorized, rateLimit };
