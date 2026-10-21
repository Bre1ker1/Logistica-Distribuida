export async function validateCoverage(cp) {
  const baseUrl = process.env.COVERAGE_SERVICE_URL || 'http://localhost:3002';
  try {
    const response = await fetch(`${baseUrl}/api/logistics/coverage/validate?cp=${cp}`, {
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) return { valid: false };
    return await response.json();
  } catch (error) {
    console.error('[Coverage Client Error] Servicio inalcanzable:', error.message);
    return { valid: false, serviceUnavailable: true };
  }
}