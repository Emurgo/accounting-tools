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
import { getSuiTransactionHistory, SuiTransactionRow } from '../api/suiAccounts';

const SuiTransactionsPage: React.FC = () => {
    const [address, setAddress] = useState('');
    const [rows, setRows] = useState<SuiTransactionRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleQuery = async () => {
        setLoading(true);
        setError('');
        setRows([]);
        try {
            const data = await getSuiTransactionHistory(address.trim());
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
                Sui Transactions
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <TextField
                    label="Sui Account"
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
                            <TableCell>SUI Amount</TableCell>
                            <TableCell>SUI Price (USD)</TableCell>
                            <TableCell>Amount (USD)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, idx) => (
                            <TableRow key={`${row.digest}-${idx}`}>
                                <TableCell>{row.time}</TableCell>
                                <TableCell>{row.digest}</TableCell>
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

export default SuiTransactionsPage;
