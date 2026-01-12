import BigNumber from 'bignumber.js';

type XrpscanAmount = {
    currency?: string;
    value?: string | number;
};

type XrpscanTransaction = {
    Account?: string;
    Destination?: string;
    Amount?: string | number | XrpscanAmount;
    TransactionType?: string;
    date?: string | number;
};

type RippleTransactionsResponse = {
    marker?: string;
    transactions?: XrpscanTransaction[];
};

export type XrpTransactionRow = {
    date: string;
    amount: string;
    priceUsd: string;
    amountUsd: string;
};

const XRP_PRICE_CACHE: Record<string, string> = {};
const RIPPLE_EPOCH_OFFSET_MS = 946684800000;

function formatXrpAmount(drops: BigNumber): string {
    const fixed = drops.shiftedBy(-6).toFixed(6);
    return fixed.replace(/\.?0+$/, '');
}

function formatCoinGeckoDate(date: Date): string {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
}

function parseRippleDate(value: number | string | undefined): Date | null {
    if (typeof value === 'number') {
        return new Date(value * 1000 + RIPPLE_EPOCH_OFFSET_MS);
    }
    if (typeof value === 'string') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.valueOf())) {
            return parsed;
        }
    }
    return null;
}

async function getXrpPriceUsd(date: Date): Promise<string> {
    const cacheKey = formatCoinGeckoDate(date);
    if (XRP_PRICE_CACHE[cacheKey]) {
        return XRP_PRICE_CACHE[cacheKey];
    }
    const url = `https://api.coingecko.com/api/v3/coins/ripple/history?date=${cacheKey}&localization=false`;
    const resp = await fetch(url);
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`CoinGecko price request failed: ${resp.status} ${resp.statusText} ${text}`);
    }
    const payload = await resp.json();
    const price = payload?.market_data?.current_price?.usd?.toString() ?? '0';
    XRP_PRICE_CACHE[cacheKey] = price;
    return price;
}

async function fetchRippleTransactions(address: string, marker?: string): Promise<RippleTransactionsResponse> {
    const baseUrl = `https://api.xrpscan.com/api/v1/account/${address}/transactions`;
    const params = new URLSearchParams({
        type: 'Payment',
        limit: '200',
        descending: 'true',
    });
    if (marker) {
        params.set('marker', marker);
    }
    const url = `${baseUrl}?${params.toString()}`;
    const resp = await fetch(url);
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`XRPSCAN request failed: ${resp.status} ${resp.statusText} ${text}`);
    }
    return await resp.json() as RippleTransactionsResponse;
}

function parseAmountDrops(amount: XrpscanTransaction['Amount']): BigNumber | null {
    if (amount === undefined || amount === null) {
        return null;
    }
    if (typeof amount === 'string' || typeof amount === 'number') {
        return new BigNumber(amount);
    }
    if (typeof amount === 'object') {
        if (amount.currency && amount.currency !== 'XRP') {
            return null;
        }
        if (amount.value === undefined || amount.value === null) {
            return null;
        }
        return new BigNumber(amount.value);
    }
    return null;
}

function getSignedDrops(tx: XrpscanTransaction, address: string): BigNumber | null {
    if (tx.TransactionType && tx.TransactionType !== 'Payment') {
        return null;
    }
    const amountDrops = parseAmountDrops(tx.Amount);
    if (!amountDrops) {
        return null;
    }
    if (!tx.Account || !tx.Destination) {
        return null;
    }
    if (tx.Account === address && tx.Destination !== address) {
        return amountDrops.negated();
    }
    if (tx.Destination === address && tx.Account !== address) {
        return amountDrops;
    }
    return null;
}

export async function getXrpTransactionHistory(address: string): Promise<XrpTransactionRow[]> {
    const normalizedAddress = address.trim();
    if (!normalizedAddress) {
        return [];
    }
    const rows: XrpTransactionRow[] = [];
    let marker: string | undefined;
    for (let page = 0; page < 100000; page += 1) {
        const payload = await fetchRippleTransactions(normalizedAddress, marker);
        const transactions = payload.transactions ?? [];
        if (transactions.length === 0) {
            break;
        }
        for (const entry of transactions) {
            const txDate = parseRippleDate(entry.date);
            const signedDrops = getSignedDrops(entry, normalizedAddress);
            if (!txDate || !signedDrops || signedDrops.isZero()) {
                continue;
            }
            const priceUsd = await getXrpPriceUsd(txDate);
            const amountXrp = formatXrpAmount(signedDrops);
            const amountUsd = new BigNumber(amountXrp).multipliedBy(priceUsd).toString();
            rows.push({
                date: txDate.toLocaleDateString('en-SG'),
                amount: amountXrp,
                priceUsd,
                amountUsd,
            });
        }
        marker = payload.marker;
        if (!marker) {
            break;
        }
    }
    return rows;
}
