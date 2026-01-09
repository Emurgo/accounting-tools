import BigNumber from 'bignumber.js';

type BlockstreamTx = {
    txid: string;
    status?: {
        confirmed?: boolean;
        block_time?: number;
    };
    vin: Array<{
        prevout?: {
            scriptpubkey_address?: string;
            value?: number;
        };
    }>;
    vout: Array<{
        scriptpubkey_address?: string;
        value?: number;
    }>;
};

export type BitcoinTransactionRow = {
    date: string;
    amount: string;
    priceUsd: string;
    amountUsd: string;
};

const BTC_PRICE_CACHE: Record<string, string> = {};

function formatBtcAmount(satoshis: BigNumber): string {
    const fixed = satoshis.shiftedBy(-8).toFixed(8);
    return fixed.replace(/\.?0+$/, '');
}

function formatCoinGeckoDate(date: Date): string {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
}

async function getBtcPriceUsd(date: Date): Promise<string> {
    const cacheKey = formatCoinGeckoDate(date);
    if (BTC_PRICE_CACHE[cacheKey]) {
        return BTC_PRICE_CACHE[cacheKey];
    }
    const url = `https://api.coingecko.com/api/v3/coins/bitcoin/history?date=${cacheKey}&localization=false`;
    const resp = await fetch(url);
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`CoinGecko price request failed: ${resp.status} ${resp.statusText} ${text}`);
    }
    const payload = await resp.json();
    const price = payload?.market_data?.current_price?.usd?.toString() ?? '0';
    BTC_PRICE_CACHE[cacheKey] = price;
    return price;
}

async function fetchBlockstreamPage(address: string, lastTxid?: string): Promise<BlockstreamTx[]> {
    const suffix = lastTxid ? `/chain/${lastTxid}` : '';
    const url = `https://blockstream.info/api/address/${address}/txs${suffix}`;
    const resp = await fetch(url);
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Blockstream request failed: ${resp.status} ${resp.statusText} ${text}`);
    }
    const payload = await resp.json();
    return Array.isArray(payload) ? payload : [];
}

async function fetchAllBlockstreamTxs(address: string): Promise<BlockstreamTx[]> {
    const results: BlockstreamTx[] = [];
    let lastTxid: string | undefined;
    for (let page = 0; page < 100000; page += 1) {
        const pageData = await fetchBlockstreamPage(address, lastTxid);
        if (pageData.length === 0) {
            break;
        }
        results.push(...pageData);
        lastTxid = pageData[pageData.length - 1]?.txid;
        if (!lastTxid || pageData.length < 25) {
            break;
        }
    }
    return results;
}

function getNetSatoshis(tx: BlockstreamTx, address: string): BigNumber {
    const inputTotal = tx.vin.reduce((sum, input) => {
        const prevout = input.prevout;
        if (prevout?.scriptpubkey_address !== address) {
            return sum;
        }
        return sum.plus(prevout.value ?? 0);
    }, new BigNumber(0));
    const outputTotal = tx.vout.reduce((sum, output) => {
        if (output.scriptpubkey_address !== address) {
            return sum;
        }
        return sum.plus(output.value ?? 0);
    }, new BigNumber(0));
    return outputTotal.minus(inputTotal);
}

export async function getBitcoinTransactionHistory(address: string): Promise<BitcoinTransactionRow[]> {
    const normalizedAddress = address.trim();
    if (!normalizedAddress) {
        return [];
    }
    const txs = await fetchAllBlockstreamTxs(normalizedAddress);
    const rows: BitcoinTransactionRow[] = [];
    for (const tx of txs) {
        const blockTime = tx.status?.block_time;
        if (!blockTime) {
            continue;
        }
        const date = new Date(blockTime * 1000);
        const netSats = getNetSatoshis(tx, normalizedAddress);
        if (netSats.isZero()) {
            continue;
        }
        const priceUsd = await getBtcPriceUsd(date);
        const amountBtc = formatBtcAmount(netSats);
        const amountUsd = new BigNumber(amountBtc).multipliedBy(priceUsd).toString();
        rows.push({
            date: date.toLocaleDateString('en-SG'),
            amount: amountBtc,
            priceUsd,
            amountUsd,
        });
    }
    return rows;
}
