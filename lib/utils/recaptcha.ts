export async function verifyRecaptchaToken(
  token: string,
): Promise<{ success: boolean; score: number }> {
  const required = process.env.RECAPTCHA_REQUIRED === 'true';
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    if (required) {
      return { success: false, score: 0 };
    }
    return { success: true, score: 1.0 };
  }

  if (!token) {
    return { success: false, score: 0 };
  }

  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: secretKey, response: token }),
  });
  const data = await res.json();
  return { success: data.success, score: data.score };
}

export const RECAPTCHA_THRESHOLD = 0.5;
