import React, { useState } from 'react';
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
import { getSolanaTransactionHistory, SolanaTransactionRow } from '../api/solanaAccounts';

const SolanaTransactionsPage: React.FC = () => {
    const [address, setAddress] = useState('');
    const [rows, setRows] = useState<SolanaTransactionRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleQuery = async () => {
        setLoading(true);
        setError('');
        setRows([]);
        try {
            const data = await getSolanaTransactionHistory(address.trim());
            setRows(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
        }
        setLoading(false);
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Solana Transactions
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <TextField
                    label="Solana Account"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    size="small"
                    sx={{ minWidth: 420 }}
                />
                <Button variant="contained" onClick={handleQuery} disabled={loading || !address.trim()}>
                    {loading ? 'Querying...' : 'Query'}
                </Button>
            </Stack>
            {error && (
                <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                    {error}
                </Typography>
            )}
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Transaction Time</TableCell>
                            <TableCell>Transaction Hash</TableCell>
                            <TableCell>SOL Amount</TableCell>
                            <TableCell>SOL Price (USD)</TableCell>
                            <TableCell>Amount (USD)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, idx) => (
                            <TableRow key={`${row.signature}-${idx}`}>
                                <TableCell>{row.time}</TableCell>
                                <TableCell>{row.signature}</TableCell>
                                <TableCell>{row.amount}</TableCell>
                                <TableCell>{row.priceUsd}</TableCell>
                                <TableCell>{row.amountUsd}</TableCell>
                            </TableRow>
                        ))}
                        {rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5}>No transactions to display.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default SolanaTransactionsPage;
