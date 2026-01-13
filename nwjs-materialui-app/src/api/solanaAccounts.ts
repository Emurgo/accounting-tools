import BigNumber from 'bignumber.js';
import { Connection, ParsedTransactionWithMeta, PublicKey } from '@solana/web3.js';
import { SOLANA_RPC_URL } from '../../secrets';

export type SolanaTransactionRow = {
    time: string;
    signature: string;
    amount: string;
    priceUsd: string;
    amountUsd: string;
};

const SIGNATURE_PAGE_LIMIT = 1000;
const SOL_PRICE_CACHE: Record<string, string> = {};

function formatSolAmount(lamports: BigNumber): string {
    const fixed = lamports.shiftedBy(-9).toFixed(9);
    return fixed.replace(/\.?0+$/, '');
}

function formatCoinGeckoDate(date: Date): string {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
}

async function getSolPriceUsd(date: Date): Promise<string> {
    const cacheKey = formatCoinGeckoDate(date);
    if (SOL_PRICE_CACHE[cacheKey]) {
        return SOL_PRICE_CACHE[cacheKey];
    }
    const url = `https://api.coingecko.com/api/v3/coins/solana/history?date=${cacheKey}&localization=false`;
    const resp = await fetch(url);
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`CoinGecko price request failed: ${resp.status} ${resp.statusText} ${text}`);
    }
    const payload = await resp.json();
    const price = payload?.market_data?.current_price?.usd?.toString() ?? '0';
    SOL_PRICE_CACHE[cacheKey] = price;
    return price;
}

function getAccountKeyBase58(entry: any): string {
    if (!entry) {
        return '';
    }
    if (typeof entry === 'string') {
        return entry;
    }
    if (entry instanceof PublicKey) {
        return entry.toBase58();
    }
    if (entry.pubkey instanceof PublicKey) {
        return entry.pubkey.toBase58();
    }
    if (typeof entry.pubkey === 'string') {
        return entry.pubkey;
    }
    return String(entry);
}

function getSolNetChange(tx: ParsedTransactionWithMeta, owner: string): BigNumber | null {
    const meta = tx.meta;
    if (!meta) {
        return null;
    }
    const accountKeys = tx.transaction.message.accountKeys;
    const ownerIndex = accountKeys.findIndex((entry: any) => getAccountKeyBase58(entry) === owner);
    if (ownerIndex < 0) {
        return null;
    }
    const pre = meta.preBalances?.[ownerIndex] ?? 0;
    const post = meta.postBalances?.[ownerIndex] ?? 0;
    const netLamports = new BigNumber(post).minus(pre);
    if (netLamports.isZero()) {
        return null;
    }
    return netLamports;
}

async function fetchAllSignatures(
    connection: Connection,
    account: PublicKey
): Promise<Map<string, number | null>> {
    const signatures = new Map<string, number | null>();
    let before: string | undefined;
    for (let page = 0; page < 100000; page += 1) {
        const pageData = await connection.getSignaturesForAddress(account, {
            before,
            limit: SIGNATURE_PAGE_LIMIT,
        });
        if (pageData.length === 0) {
            break;
        }
        for (const entry of pageData) {
            if (!signatures.has(entry.signature)) {
                signatures.set(entry.signature, entry.blockTime ?? null);
            }
        }
        before = pageData[pageData.length - 1]?.signature;
        if (!before || pageData.length < SIGNATURE_PAGE_LIMIT) {
            break;
        }
    }
    return signatures;
}

export async function getSolanaTransactionHistory(
    ownerAddress: string
): Promise<SolanaTransactionRow[]> {
    const normalizedAddress = ownerAddress.trim();
    if (!normalizedAddress) {
        return [];
    }
    const connection = new Connection(SOLANA_RPC_URL);
    const ownerPubkey = new PublicKey(normalizedAddress);
    const signatureTimes = await fetchAllSignatures(connection, ownerPubkey);
    const rows: Array<SolanaTransactionRow & { timeMs: number }> = [];
    for (const [signature, blockTime] of signatureTimes.entries()) {
        const tx = await connection.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 0,
        });
        if (!tx) {
            continue;
        }
        const netLamports = getSolNetChange(tx, normalizedAddress);
        if (!netLamports) {
            continue;
        }
        const timeMs = blockTime ? blockTime * 1000 : 0;
        const timeLabel = timeMs ? new Date(timeMs).toLocaleString('en-SG') : 'Unknown';
        const amountSol = formatSolAmount(netLamports);
        const priceUsd = timeMs ? await getSolPriceUsd(new Date(timeMs)) : '0';
        const amountUsd = new BigNumber(amountSol).multipliedBy(priceUsd).toString();
        rows.push({
            time: timeLabel,
            signature,
            amount: amountSol,
            priceUsd,
            amountUsd,
            timeMs,
        });
    }
    rows.sort((a, b) => b.timeMs - a.timeMs);
    return rows.map(({ timeMs, ...rest }) => rest);
}
