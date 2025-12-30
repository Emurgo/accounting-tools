import BigNumber from 'bignumber.js';
import { ETHERSCAN_KEY } from '../../secrets';

const ETHERSCAN_API_BASE = 'https://api.etherscan.io/api';
const PAGE_SIZE = 1000;

type EtherscanResponse<T> = {
    status: string;
    message: string;
    result: T | string;
};

type EtherscanTx = {
    blockNumber: string;
    timeStamp: string;
    hash: string;
    nonce: string;
    blockHash: string;
    transactionIndex: string;
    from: string;
    to: string;
    value: string;
    gas: string;
    gasPrice: string;
    gasUsed: string;
    isError: string;
    txreceipt_status: string;
};

type EtherscanInternalTx = {
    blockNumber: string;
    timeStamp: string;
    hash: string;
    from: string;
    to: string;
    value: string;
    contractAddress: string;
    input: string;
    type: string;
    gas: string;
    gasUsed: string;
    isError: string;
    traceId: string;
};

export type EtherAccountHistoryRow = {
    timestamp: string;
    txId: string;
    amount: string;
    fee: string;
    balance: string;
    timeMs: number;
};

function parseEtherscanResult<T>(payload: EtherscanResponse<T>): T[] {
    if (payload.status === '0' && payload.message === 'No transactions found') {
        return [];
    }
    if (payload.status !== '1') {
        throw new Error(`Etherscan error: ${payload.message}`);
    }
    return Array.isArray(payload.result) ? payload.result : [];
}

async function fetchEtherscanPage<T>(
    action: string,
    address: string,
    page: number,
    offset: number
): Promise<T[]> {
    const url = `${ETHERSCAN_API_BASE}?module=account&action=${action}&address=${address}` +
        `&page=${page}&offset=${offset}&sort=asc&apikey=${ETHERSCAN_KEY}`;
    const resp = await fetch(url);
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Etherscan request failed: ${resp.status} ${resp.statusText} ${text}`);
    }
    const payload = await resp.json() as EtherscanResponse<T>;
    return parseEtherscanResult(payload);
}

async function fetchAllPages<T>(action: string, address: string): Promise<T[]> {
    const results: T[] = [];
    for (let page = 1; page < 99999; page += 1) {
        const pageData = await fetchEtherscanPage<T>(action, address, page, PAGE_SIZE);
        results.push(...pageData);
        if (pageData.length < PAGE_SIZE) {
            break;
        }
    }
    return results;
}

function formatTimestamp(seconds: number): { label: string; timeMs: number } {
    const timeMs = seconds * 1000;
    return { label: new Date(timeMs).toLocaleString('en-SG'), timeMs };
}

export async function getEtherAccountHistory(address: string): Promise<EtherAccountHistoryRow[]> {
    const normalizedAddress = address.toLowerCase();

    const [normalTxs, internalTxs] = await Promise.all([
        fetchAllPages<EtherscanTx>('txlist', address),
        fetchAllPages<EtherscanInternalTx>('txlistinternal', address),
    ]);

    const rows: Array<EtherAccountHistoryRow & { amountWei: BigNumber; feeWei: BigNumber; sortKey: string }> = [];

    for (const tx of normalTxs) {
        const isFrom = tx.from?.toLowerCase() === normalizedAddress;
        const isTo = tx.to?.toLowerCase() === normalizedAddress;
        const isError = tx.isError === '1';
        const valueWei = isError ? new BigNumber(0) : new BigNumber(tx.value ?? '0');

        let amountWei = new BigNumber(0);
        if (isFrom && !isTo) {
            amountWei = valueWei.negated();
        } else if (!isFrom && isTo) {
            amountWei = valueWei;
        }

        let feeWei = new BigNumber(0);
        if (isFrom) {
            feeWei = new BigNumber(tx.gasUsed ?? '0').multipliedBy(tx.gasPrice ?? '0');
        }

        const time = formatTimestamp(Number(tx.timeStamp));
        rows.push({
            timestamp: time.label,
            txId: tx.hash,
            amount: amountWei.shiftedBy(-18).toString(),
            fee: feeWei.shiftedBy(-18).toString(),
            balance: '0',
            timeMs: time.timeMs,
            amountWei,
            feeWei,
            sortKey: `${tx.timeStamp}-${tx.transactionIndex ?? '0'}-n`,
        });
    }

    for (const tx of internalTxs) {
        const isFrom = tx.from?.toLowerCase() === normalizedAddress;
        const isTo = tx.to?.toLowerCase() === normalizedAddress;
        const isError = tx.isError === '1';
        const valueWei = isError ? new BigNumber(0) : new BigNumber(tx.value ?? '0');

        let amountWei = new BigNumber(0);
        if (isFrom && !isTo) {
            amountWei = valueWei.negated();
        } else if (!isFrom && isTo) {
            amountWei = valueWei;
        }

        const time = formatTimestamp(Number(tx.timeStamp));
        rows.push({
            timestamp: time.label,
            txId: tx.hash,
            amount: amountWei.shiftedBy(-18).toString(),
            fee: '0',
            balance: '0',
            timeMs: time.timeMs,
            amountWei,
            feeWei: new BigNumber(0),
            sortKey: `${tx.timeStamp}-${tx.traceId ?? '0'}-i`,
        });
    }

    rows.sort((a, b) => {
        if (a.timeMs !== b.timeMs) {
            return a.timeMs - b.timeMs;
        }
        return a.sortKey.localeCompare(b.sortKey);
    });

    let balanceWei = new BigNumber(0);
    for (const row of rows) {
        balanceWei = balanceWei.plus(row.amountWei).minus(row.feeWei);
        row.balance = balanceWei.shiftedBy(-18).toString();
    }

    return rows.map(({ amountWei, feeWei, sortKey, ...rest }) => rest);
}
