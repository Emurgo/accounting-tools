import { COPPER_API_KEY, COPPER_API_SECRET } from '../../secrets';

export async function fetchCopperWalletDataBackend(): Promise<CopperWalletData[]> {
  const targetUrl = '/platform/wallets'
  const requestBody = ''
  const currentMillis = String(Date.now())
  const data = currentMillis + 'GET' + targetUrl + requestBody
  const sig = await hmacSha256(COPPER_API_SECRET, data)

  const resp = await fetch(
    'https://api.copper.co' + targetUrl,
    {
      headers: {
        'X-Signature': sig,
        'X-Timestamp': currentMillis,
        Authorization: `ApiKey ${COPPER_API_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  )
  const body = await resp.json()
  return body.wallets
}

// google told me
async function hmacSha256(key: string, message: string): Promise<string> {
  const keyBuffer = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    keyBuffer,
    new TextEncoder().encode(message)
  );
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
