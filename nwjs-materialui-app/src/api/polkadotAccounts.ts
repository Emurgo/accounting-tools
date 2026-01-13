import BigNumber from 'bignumber.js';

export type PolkadotTransactionRow = {
    time: string;
    hash: string;
    amount: string;
    priceUsd: string;
    amountUsd: string;
};

type SubscanTransfer = {
    block_timestamp?: number;
    extrinsic_hash?: string;
    hash?: string;
    from?: string;
    to?: string;
    amount?: string;
    asset_symbol?: string;
    asset_decimals?: number;
};

type SubscanTransfersResponse = {
    code?: number;
    message?: string;
    data?: {
        count?: number;
        transfers?: SubscanTransfer[];
    };
};


const DOT_PRICE_CACHE: Record<string, string> = {};

function formatCoinGeckoDate(date: Date): string {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
}

async function getDotPriceUsd(date: Date): Promise<string> {
    const cacheKey = formatCoinGeckoDate(date);
    if (DOT_PRICE_CACHE[cacheKey]) {
        return DOT_PRICE_CACHE[cacheKey];
    }
    const timestamp = Math.floor(date.valueOf() / 1000);
    const url = `https://min-api.cryptocompare.com/data/pricehistorical?fsym=DOT&tsyms=USD&ts=${timestamp}`;
    const resp = await fetch(url);
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`CryptoCompare price request failed: ${resp.status} ${resp.statusText} ${text}`);
    }
    const payload = await resp.json();
    const price = payload?.DOT?.USD?.toString() ?? '0';
    DOT_PRICE_CACHE[cacheKey] = price;
    return price;
}

async function fetchSubscanTransfers(address: string, page: number, row: number): Promise<SubscanTransfersResponse> {
    const url = 'https://polkadot.api.subscan.io/api/v2/scan/transfers';
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            address,
            page,
            row,
        }),
    });
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Subscan request failed: ${resp.status} ${resp.statusText} ${text}`);
    }
    return await resp.json() as SubscanTransfersResponse;
}

function getSignedAmount(transfer: SubscanTransfer, address: string): BigNumber | null {
    const amount = transfer.amount ?? '0';
    const raw = new BigNumber(amount);
    if (raw.isZero()) {
        return null;
    }
    if (!transfer.from || !transfer.to) {
        return null;
    }
    if (transfer.from === address && transfer.to !== address) {
        return raw.negated();
    }
    if (transfer.to === address && transfer.from !== address) {
        return raw;
    }
    return null;
}

export async function getPolkadotTransactionHistory(address: string): Promise<PolkadotTransactionRow[]> {
    const normalizedAddress = address.trim();
    if (!normalizedAddress) {
        return [];
    }
    const rows: PolkadotTransactionRow[] = [];
    const pageSize = 100;
    for (let page = 0; page < 100000; page += 1) {
        const payload = await fetchSubscanTransfers(normalizedAddress, page, pageSize);
        const transfers = payload.data?.transfers ?? [];
        if (transfers.length === 0) {
            break;
        }
        for (const transfer of transfers) {
            if (transfer.asset_symbol && transfer.asset_symbol !== 'DOT') {
                continue;
            }
            const signed = getSignedAmount(transfer, normalizedAddress);
            if (!signed) {
                continue;
            }
            const timeMs = (transfer.block_timestamp ?? 0) * 1000;
            if (!timeMs) {
                continue;
            }
            const time = new Date(timeMs);
            const priceUsd = await getDotPriceUsd(time);
            const amountDot = signed.toString();
            const amountUsd = new BigNumber(amountDot).multipliedBy(priceUsd).toString();
            rows.push({
                time: time.toLocaleString('en-SG'),
                hash: transfer.extrinsic_hash ?? transfer.hash ?? '',
                amount: amountDot,
                priceUsd,
                amountUsd,
            });
        }
        if (transfers.length < pageSize) {
            break;
        }
    }
    return rows;
}
