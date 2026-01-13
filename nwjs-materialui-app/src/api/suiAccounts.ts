import BigNumber from 'bignumber.js';
import { COINGECKO_API_KEY } from '../../secrets';

export type SuiTransactionRow = {
    time: string;
    digest: string;
    amount: string;
    priceUsd: string;
    amountUsd: string;
};

type SuiPageResponse = {
    data?: Array<{
        digest: string;
        timestampMs?: string | number;
        balanceChanges?: Array<{
            coinType?: string;
            amount?: string | number;
            owner?: {
                AddressOwner?: string;
            };
        }>;
    }>;
    nextCursor?: string | null;
    hasNextPage?: boolean;
};

const SUI_COIN_TYPE = '0x2::sui::SUI';
const SUI_PRICE_CACHE: Record<string, string> = {};

function formatSuiAmount(amount: BigNumber): string {
    const fixed = amount.shiftedBy(-9).toFixed(9);
    return fixed.replace(/\.?0+$/, '');
}

function formatCoinGeckoDate(date: Date): string {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
}

async function getSuiPriceUsd(date: Date): Promise<string> {
    const cacheKey = formatCoinGeckoDate(date);
    if (SUI_PRICE_CACHE[cacheKey]) {
        return SUI_PRICE_CACHE[cacheKey];
    }
    const url = `https://api.coingecko.com/api/v3/coins/sui/history?date=${cacheKey}&localization=false`;
    const resp = await fetch(url, {
        headers: {
            'x-cg-demo-api-key': COINGECKO_API_KEY,
            'x-cg-pro-api-key': COINGECKO_API_KEY,
        },
    });
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`CoinGecko price request failed: ${resp.status} ${resp.statusText} ${text}`);
    }
    const payload = await resp.json();
    const price = payload?.market_data?.current_price?.usd?.toString() ?? '0';
    SUI_PRICE_CACHE[cacheKey] = price;
    return price;
}

async function fetchSuiTransactions(address: string, cursor?: string | null): Promise<SuiPageResponse> {
    const url = 'https://fullnode.mainnet.sui.io:443';
    const body = {
        jsonrpc: '2.0',
        id: 1,
        method: 'suix_queryTransactionBlocks',
        params: [
            {
                filter: {
                    FromOrToAddress: address,
                },
                options: {
                    showBalanceChanges: true,
                    showEffects: false,
                    showEvents: false,
                    showInput: false,
                    showObjectChanges: false,
                    showRawInput: false,
                },
            },
            cursor ?? null,
            50,
            true,
        ],
    };
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Sui request failed: ${resp.status} ${resp.statusText} ${text}`);
    }
    const payload = await resp.json();
    if (payload?.error) {
        throw new Error(payload.error?.message ?? 'Sui request failed');
    }
    return payload?.result as SuiPageResponse;
}

function getSuiNetChange(entry: SuiPageResponse['data'][number], address: string): BigNumber | null {
    const changes = entry.balanceChanges ?? [];
    let net = new BigNumber(0);
    for (const change of changes) {
        if (change.coinType !== SUI_COIN_TYPE) {
            continue;
        }
        if (change.owner?.AddressOwner !== address) {
            continue;
        }
        net = net.plus(change.amount ?? 0);
    }
    if (net.isZero()) {
        return null;
    }
    return net;
}

export async function getSuiTransactionHistory(address: string): Promise<SuiTransactionRow[]> {
    const normalizedAddress = address.trim();
    if (!normalizedAddress) {
        return [];
    }
    const rows: Array<SuiTransactionRow & { timeMs: number }> = [];
    let cursor: string | null | undefined = null;
    for (let page = 0; page < 100000; page += 1) {
        const payload = await fetchSuiTransactions(normalizedAddress, cursor);
        const data = payload.data ?? [];
        if (data.length === 0) {
            break;
        }
        for (const entry of data) {
            const timeMs = Number(entry.timestampMs ?? 0);
            if (!timeMs) {
                continue;
            }
            const net = getSuiNetChange(entry, normalizedAddress);
            if (!net) {
                continue;
            }
            const priceUsd = await getSuiPriceUsd(new Date(timeMs));
            const amountSui = formatSuiAmount(net);
            const amountUsd = new BigNumber(amountSui).multipliedBy(priceUsd).toString();
            rows.push({
                time: new Date(timeMs).toLocaleString('en-SG'),
                digest: entry.digest,
                amount: amountSui,
                priceUsd,
                amountUsd,
                timeMs,
            });
        }
        cursor = payload.nextCursor ?? null;
        if (!payload.hasNextPage) {
            break;
        }
    }
    rows.sort((a, b) => b.timeMs - a.timeMs);
    return rows.map(({ timeMs, ...rest }) => rest);
}
