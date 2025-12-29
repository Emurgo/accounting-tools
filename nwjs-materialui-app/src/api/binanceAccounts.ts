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

/*
type QueryFunc<RespT> = (apiKey: string, secretKey: string) => Promise<RespT>;
function genBinanceQueryFunction<RespT>(params: Record<string, unknown>, endpointPath: string): QueryFunc<RespT> {
}
*/

export async function getBinanceAccountInfo(apiKey: string, secretKey: string): Promise<unknown> {
  const query = buildSignedQuery(
    {
      omitZeroBalances: 'true',
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


interface DepositHistoryEntry {
  depositId: string;
  amount: string;
  network: string;
  coin: string;
  depositStatus: number;
  address: string;
  addressTag: string;
  txId: string;
  transferType: number;
  confirmTimes: string;
  insertTime: number;
  completeTime: number;
}

export async function getDepositHistory(apiKey: string, secretKey: string): Promise<DepositHistoryEntry[]> {
  const query = buildSignedQuery(
    {
      timestamp: String(Date.now()),
    },
    secretKey
  );

  const url = `${BINANCE_API_BASE}/sapi/v2/localentity/deposit/history?${query}`;
  //const url = `${BINANCE_API_BASE}/sapi/v1/capital/withdraw/history?${query}`;
  //not working, returning []

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

interface WithdrawHistoryEntry {
  id: string;  // Withdrawal id in Binance
  trId: number;  // Travel rule record id
  amount: string;   // withdrawal amount
  transactionFee: string; // only available for sAPI requests
  coin: string;
  withdrawalStatus: number; // Capital withdrawal status, only available for sAPI requests
  travelRuleStatus: number; // Travel rule status.
  address: string;
  addressTag: string;
  txId: string;   // withdrawal transaction id
  applyTime: string;  // UTC time
  network: string;
  transferType: number; // 1 for internal transfer, 0 for external transfer, only available for sAPI requests  
  withdrawOrderId: string; // will not be returned if there's no withdrawOrderId for this withdraw, only available for sAPI requests
  info: string;  // reason for withdrawal failure, only available for sAPI requests
  confirmNo: number;  // confirm times for withdraw, only available for sAPI requests
  walletType: number;  //1: Funding Wallet 0:Spot Wallet, only available for sAPI requests
  txKey: string; // only available for sAPI requests
  questionnaire: string; // The answers of the questionnaire
  completeTime: string; // complete UTC time when user's asset is deduct from withdrawing, only if status =  6(success)
};
export async function getWithdrawHistory(apiKey: string, secretKey: string): Promise<WithdrawHistoryEntry[]> {
  const query = buildSignedQuery(
    {
      timestamp: String(Date.now()),
    },
    secretKey
  );

  const url = `${BINANCE_API_BASE}/sapi/v2/localentity/withdraw/history?${query}`;

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

  //getBinanceAccountInfo(apiKey, secretKey)
  //getDepositHistory(apiKey, secretKey)
  getWithdrawHistory(apiKey, secretKey)
    .then((data) => {
      console.log(JSON.stringify(data, null, 2));
    })
    .catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(message);
      process.exit(1);
    });
}
