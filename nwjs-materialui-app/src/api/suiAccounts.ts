import BigNumber from 'bignumber.js';

export type SuiTransactionRow = {
    time: string;
    digest: string;
    amount: string;
    priceUsd: string;
    amountUsd: string;
};

type SuiTransactionBlock = {
    digest: string;
    timestampMs?: string | number;
    balanceChanges?: Array<{
        coinType?: string;
        amount?: string | number;
        owner?: {
            AddressOwner?: string;
        };
    }>;
};

type SuiPageResponse = {
    data?: SuiTransactionBlock[];
    nextCursor?: string | null;
    hasNextPage?: boolean;
};

const SUI_COIN_TYPE = '0x2::sui::SUI';
const SUI_PRICE_CACHE: Record<string, string> = {};

function formatSuiAmount(amount: BigNumber): string {
    const fixed = amount.shiftedBy(-9).toFixed(9);
    return fixed.replace(/\.?0+$/, '');
}

async function getSuiPriceUsd(date: Date): Promise<string> {
    const cacheKey = date.toISOString().slice(0, 10);
    if (SUI_PRICE_CACHE[cacheKey]) {
        return SUI_PRICE_CACHE[cacheKey];
    }
    const timestamp = Math.floor(date.valueOf() / 1000);
    const url = `https://min-api.cryptocompare.com/data/pricehistorical?fsym=SUI&tsyms=USD&ts=${timestamp}`;
    const resp = await fetch(url);
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`CryptoCompare price request failed: ${resp.status} ${resp.statusText} ${text}`);
    }
    const payload = await resp.json();
    const price = payload?.SUI?.USD?.toString() ?? '0';
    SUI_PRICE_CACHE[cacheKey] = price;
    return price;
}

async function fetchSuiTransactions(
    filter: Record<string, unknown>,
    cursor?: string | null
): Promise<SuiPageResponse> {
    const url = 'https://fullnode.mainnet.sui.io:443';
    const body = {
        jsonrpc: '2.0',
        id: 1,
        method: 'suix_queryTransactionBlocks',
        params: [
            {
                filter,
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

function getSuiNetChange(entry: SuiTransactionBlock, address: string): BigNumber | null {
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

async function fetchAllTransactionsByFilter(
    address: string,
    filter: Record<string, unknown>
): Promise<SuiTransactionBlock[]> {
    const rows: SuiTransactionBlock[] = [];
    let cursor: string | null | undefined = null;
    for (let page = 0; page < 100000; page += 1) {
        const payload = await fetchSuiTransactions(filter, cursor);
        const data = payload.data ?? [];
        if (data.length === 0) {
            break;
        }
        rows.push(...data);
        cursor = payload.nextCursor ?? null;
        if (!payload.hasNextPage) {
            break;
        }
    }
    return rows;
}

export async function getSuiTransactionHistory(address: string): Promise<SuiTransactionRow[]> {
    const normalizedAddress = address.trim();
    if (!normalizedAddress) {
        return [];
    }
    let blocks: SuiTransactionBlock[] = [];
    try {
        blocks = await fetchAllTransactionsByFilter(normalizedAddress, {
            FromOrToAddress: {
                addr: normalizedAddress,
            },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes('FromOrToAddress') || !message.toLowerCase().includes('not supported')) {
            throw err;
        }
        const [fromBlocks, toBlocks] = await Promise.all([
            fetchAllTransactionsByFilter(normalizedAddress, { FromAddress: normalizedAddress }),
            fetchAllTransactionsByFilter(normalizedAddress, { ToAddress: normalizedAddress }),
        ]);
        const unique = new Map<string, SuiTransactionBlock>();
        for (const entry of [...fromBlocks, ...toBlocks]) {
            if (!unique.has(entry.digest)) {
                unique.set(entry.digest, entry);
            }
        }
        blocks = Array.from(unique.values());
    }

    const rows: Array<SuiTransactionRow & { timeMs: number }> = [];
    for (const entry of blocks) {
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
    rows.sort((a, b) => b.timeMs - a.timeMs);
    return rows.map(({ timeMs, ...rest }) => rest);
}
