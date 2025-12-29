import React, { useMemo, useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Stack,
} from '@mui/material';
import BigNumber from 'bignumber.js';
import { getBinanceAccountInfo, getDepositHistory, getWithdrawHistory } from '../api/binanceAccounts';

type BalanceRow = {
    asset: string;
    free: string;
    locked: string;
    total: string;
};

type HistoryRow = {
    type: 'Deposit' | 'Withdraw';
    time: string;
    coin: string;
    amount: string;
    txId: string;
    address: string;
    fee?: string;
    timeMs: number;
};

const formatTime = (value: unknown): { label: string; timeMs: number } => {
    if (typeof value === 'number') {
        return { label: new Date(value).toLocaleString('en-SG'), timeMs: value };
    }
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) {
            return { label: new Date(parsed).toLocaleString('en-SG'), timeMs: parsed };
        }
        return { label: value, timeMs: 0 };
    }
    return { label: '', timeMs: 0 };
};

const BinanceAccountsPage: React.FC = () => {
    const [apiKey, setApiKey] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [balances, setBalances] = useState<BalanceRow[]>([]);
    const [history, setHistory] = useState<HistoryRow[]>([]);

    const handleQuery = async () => {
        setLoading(true);
        setError('');
        setBalances([]);
        setHistory([]);

        try {
            const [accountInfo, deposits, withdrawals] = await Promise.all([
                getBinanceAccountInfo(apiKey, secretKey),
                getDepositHistory(apiKey, secretKey),
                getWithdrawHistory(apiKey, secretKey),
            ]);

            const balanceRows = ((accountInfo as any)?.balances ?? [])
                .map((balance: any) => {
                    const free = String(balance?.free ?? '0');
                    const locked = String(balance?.locked ?? '0');
                    const total = new BigNumber(free).plus(locked).toString();
                    return {
                        asset: String(balance?.asset ?? ''),
                        free,
                        locked,
                        total,
                    };
                })
                .filter((row: BalanceRow) => row.asset && new BigNumber(row.total).isGreaterThan(0));

            const depositRows: HistoryRow[] = (Array.isArray(deposits) ? deposits : []).map((entry: any) => {
                const time = formatTime(entry?.insertTime);
                return {
                    type: 'Deposit',
                    time: time.label,
                    timeMs: time.timeMs,
                    coin: String(entry?.coin ?? ''),
                    amount: String(entry?.amount ?? ''),
                    txId: String(entry?.txId ?? ''),
                    address: String(entry?.address ?? ''),
                };
            });

            const withdrawRows: HistoryRow[] = (Array.isArray(withdrawals) ? withdrawals : []).map((entry: any) => {
                const time = formatTime(entry?.applyTime ?? entry?.completeTime);
                return {
                    type: 'Withdraw',
                    time: time.label,
                    timeMs: time.timeMs,
                    coin: String(entry?.coin ?? ''),
                    amount: String(entry?.amount ?? ''),
                    txId: String(entry?.txId ?? ''),
                    address: String(entry?.address ?? ''),
                    fee: String(entry?.transactionFee ?? ''),
                };
            });

            const combinedHistory = [...depositRows, ...withdrawRows].sort((a, b) => b.timeMs - a.timeMs);

            setBalances(balanceRows);
            setHistory(combinedHistory);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
        }

        setLoading(false);
    };

    const hasCredentials = useMemo(() => apiKey.trim() && secretKey.trim(), [apiKey, secretKey]);

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Binance Accounts
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <TextField
                    label="Binance API Key"
                    value={apiKey}
                    type="password"
                    onChange={e => setApiKey(e.target.value)}
                    size="small"
                    sx={{ minWidth: 260 }}
                />
                <TextField
                    label="Binance Secret Key"
                    value={secretKey}
                    type="password"
                    onChange={e => setSecretKey(e.target.value)}
                    size="small"
                    sx={{ minWidth: 260 }}
                />
                <Button variant="contained" onClick={handleQuery} disabled={loading || !hasCredentials}>
                    {loading ? 'Querying...' : 'Query'}
                </Button>
            </Stack>
            {error && (
                <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                    {error}
                </Typography>
            )}
            <Typography variant="h6" gutterBottom>
                Balances
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Asset</TableCell>
                            <TableCell>Free</TableCell>
                            <TableCell>Locked</TableCell>
                            <TableCell>Total</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {balances.map((row, idx) => (
                            <TableRow key={`${row.asset}-${idx}`}>
                                <TableCell>{row.asset}</TableCell>
                                <TableCell>{row.free}</TableCell>
                                <TableCell>{row.locked}</TableCell>
                                <TableCell>{row.total}</TableCell>
                            </TableRow>
                        ))}
                        {balances.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4}>No balances to display.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <Typography variant="h6" gutterBottom>
                Deposit &amp; Withdrawal History
            </Typography>
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Type</TableCell>
                            <TableCell>Time</TableCell>
                            <TableCell>Coin</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Tx ID</TableCell>
                            <TableCell>Address</TableCell>
                            <TableCell>Fee</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {history.map((row, idx) => (
                            <TableRow key={`${row.type}-${row.txId}-${idx}`}>
                                <TableCell>{row.type}</TableCell>
                                <TableCell>{row.time}</TableCell>
                                <TableCell>{row.coin}</TableCell>
                                <TableCell>{row.amount}</TableCell>
                                <TableCell>{row.txId}</TableCell>
                                <TableCell>{row.address}</TableCell>
                                <TableCell>{row.type === 'Withdraw' ? row.fee : '-'}</TableCell>
                            </TableRow>
                        ))}
                        {history.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7}>No history to display.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default BinanceAccountsPage;
