/**
 * Obtiene la IP del cliente de forma segura.
 * Tomamos el primer segmento de x-forwarded-for (que define Vercel como la IP de origen real)
 * para evitar spoofing de IPs mediante proxies intermedios.
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}
