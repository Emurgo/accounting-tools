import * as crypto from 'crypto';

const BINANCE_API_BASE = 'https://api.binance.com';

function signQuery(queryString: string, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');
}

function buildSignedQuery(params: Record<string, string>, secretKey: string): string {
  const searchParams = new URLSearchParams(params);
  const queryString = searchParams.toString();
  const signature = signQuery(queryString, secretKey);
  return `${queryString}&signature=${signature}`;
}

export async function getBinanceAccountInfo(apiKey: string, secretKey: string): Promise<unknown> {
  const query = buildSignedQuery(
    {
      timestamp: String(Date.now()),
      recvWindow: '5000',
    },
    secretKey
  );

  const url = `${BINANCE_API_BASE}/api/v3/account?${query}`;
  const resp = await fetch(url, {
    headers: {
      'X-MBX-APIKEY': apiKey,
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Binance account query failed: ${resp.status} ${resp.statusText} ${text}`);
  }

  return resp.json();
}

if (require.main === module) {
  const [,, apiKey, secretKey] = process.argv;

  if (!apiKey || !secretKey) {
    console.error('Usage: node binanceAccounts.js <API_KEY> <SECRET_KEY>');
    process.exit(1);
  }

  getBinanceAccountInfo(apiKey, secretKey)
    .then((data) => {
      console.log(JSON.stringify(data, null, 2));
    })
    .catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(message);
      process.exit(1);
    });
}
