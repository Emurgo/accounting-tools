import BigNumber from 'bignumber.js';
import { Connection, ParsedTransactionWithMeta, PublicKey } from '@solana/web3.js';
import { SOLANA_RPC_URL } from '../../secrets';

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const SIGNATURE_PAGE_LIMIT = 1000;
const FALLBACK_SOLANA_RPC_URL = 'https://rpc.ankr.com/solana';

export type UsdcSolanaTransactionRow = {
    time: string;
    signature: string;
    amount: string;
};

type TokenBalance = {
    accountIndex: number;
    mint?: string;
    owner?: string;
    uiTokenAmount?: {
        amount?: string;
        decimals?: number;
    };
};

function formatUsdcAmount(amount: BigNumber): string {
    const fixed = amount.shiftedBy(-6).toFixed(6);
    return fixed.replace(/\.?0+$/, '');
}

function getTokenAmount(entry?: TokenBalance): BigNumber {
    const raw = entry?.uiTokenAmount?.amount ?? '0';
    return new BigNumber(raw);
}

function getUsdcNetChange(
    tx: ParsedTransactionWithMeta,
    owner: string,
    mint: string
): BigNumber | null {
    const meta = tx.meta;
    if (!meta) {
        return null;
    }
    const pre = (meta.preTokenBalances ?? []) as TokenBalance[];
    const post = (meta.postTokenBalances ?? []) as TokenBalance[];
    const preByIndex = new Map<number, TokenBalance>();
    for (const entry of pre) {
        if (entry.mint === mint && entry.owner === owner) {
            preByIndex.set(entry.accountIndex, entry);
        }
    }
    let net = new BigNumber(0);
    for (const entry of post) {
        if (entry.mint !== mint || entry.owner !== owner) {
            continue;
        }
        const before = getTokenAmount(preByIndex.get(entry.accountIndex));
        const after = getTokenAmount(entry);
        net = net.plus(after.minus(before));
    }
    if (net.isZero()) {
        return null;
    }
    return net;
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

async function getUsdcSolanaTransactionHistoryWithConnection(
    connection: Connection,
    ownerAddress: string
): Promise<UsdcSolanaTransactionRow[]> {
    const ownerPubkey = new PublicKey(ownerAddress);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(ownerPubkey, {
        mint: USDC_MINT,
    });
    if (tokenAccounts.value.length === 0) {
        return [];
    }
    const signatureTimes = new Map<string, number | null>();
    for (const account of tokenAccounts.value) {
        const accountSignatures = await fetchAllSignatures(connection, account.pubkey);
        for (const [signature, blockTime] of accountSignatures.entries()) {
            if (!signatureTimes.has(signature)) {
                signatureTimes.set(signature, blockTime);
            }
        }
    }
    const rows: Array<UsdcSolanaTransactionRow & { timeMs: number }> = [];
    for (const [signature, blockTime] of signatureTimes.entries()) {
        const tx = await connection.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 0,
        });
        if (!tx) {
            continue;
        }
        const net = getUsdcNetChange(tx, ownerAddress, USDC_MINT.toBase58());
        if (!net) {
            continue;
        }
        const timeMs = blockTime ? blockTime * 1000 : 0;
        const timeLabel = timeMs ? new Date(timeMs).toLocaleString('en-SG') : 'Unknown';
        rows.push({
            time: timeLabel,
            signature,
            amount: formatUsdcAmount(net),
            timeMs,
        });
    }
    rows.sort((a, b) => b.timeMs - a.timeMs);
    return rows.map(({ timeMs, ...rest }) => rest);
}

export async function getUsdcSolanaTransactionHistory(
    ownerAddress: string
): Promise<UsdcSolanaTransactionRow[]> {
    const normalizedAddress = ownerAddress.trim();
    if (!normalizedAddress) {
        return [];
    }
    try {
        const connection = new Connection(SOLANA_RPC_URL);
        return await getUsdcSolanaTransactionHistoryWithConnection(connection, normalizedAddress);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (
            !message.toLowerCase().includes('endpoint is disabled') &&
            !message.toLowerCase().includes('forbidden') &&
            !message.includes('403')
        ) {
            throw err;
        }
        const fallbackConnection = new Connection(FALLBACK_SOLANA_RPC_URL);
        return await getUsdcSolanaTransactionHistoryWithConnection(fallbackConnection, normalizedAddress);
    }
}
